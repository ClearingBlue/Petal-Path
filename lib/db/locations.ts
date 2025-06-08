import { createSupabaseClient } from '@/lib/supabase'
import type { ExtendedLocation } from '@/lib/data/models/location'

/**
 * Get the first image URL from the most upvoted post for a location
 */
async function getMostUpvotedPostImage(locationId: number): Promise<string | null> {
  const supabase = createSupabaseClient()
  
  try {
    // Get enhanced ranking data for all posts at this location
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('location_id', locationId)

    if (postsError || !posts || posts.length === 0) return null

    const postIds = posts.map(p => p.id)
    
    // Get ranking data to find the highest scored post
    const { data: rankings, error: rankingError } = await supabase
      .rpc('get_enhanced_post_rankings', { post_ids: postIds })

    if (rankingError || !rankings || rankings.length === 0) {
      // Fallback: get most recent post with images
      const { data: recentPosts, error: recentError } = await supabase
        .from('posts')
        .select(`
          id,
          post_images(url)
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError || !recentPosts) return null

      for (const post of recentPosts) {
        if (post.post_images && post.post_images.length > 0) {
          return post.post_images[0].url
        }
      }
      return null
    }

    // Sort by ranking score to get the top post
    const topPost = rankings.sort((a: any, b: any) => b.ranking_score - a.ranking_score)[0]
    if (!topPost) return null

    // Get the first image from the top post
    const { data: images, error: imageError } = await supabase
      .from('post_images')
      .select('url')
      .eq('post_id', topPost.post_id)
      .order('id')
      .limit(1)

    if (imageError || !images || images.length === 0) return null

    return images[0].url
  } catch (error) {
    console.error('Error getting most upvoted post image:', error)
    return null
  }
}

/**
 * Fetch all locations from Supabase `public.locations` table.
 */
export async function fetchLocations(includePostImages = false): Promise<ExtendedLocation[]> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('locations').select('*').order('id')

  if (error) {
    throw new Error(error.message)
  }

  // Get post counts for all locations
  const { data: postCounts } = await supabase
    .from('posts')
    .select('location_id')
    .order('location_id')
  
  // Count posts per location
  const postCountMap = new Map<number, number>()
  postCounts?.forEach(post => {
    const count = postCountMap.get(post.location_id) || 0
    postCountMap.set(post.location_id, count + 1)
  })

  // Cast the result to our ExtendedLocation interface (camelCase props)
  if (includePostImages) {
    const locations = await Promise.all(
      (data ?? []).map(async (row) => {
        const location = await mapRowToLocation(row)
        location.visitCount = postCountMap.get(row.id) || 0
        return location
      })
    )
    return locations
  } else {
    // Fast path without expensive image fetching
    return (data ?? []).map((row) => {
      const location = mapRowToLocationFast(row)
      location.visitCount = postCountMap.get(row.id) || 0
      return location
    })
  }
}

/**
 * Fetch a single location by primary key.
 */
export async function fetchLocationById(id: number, includePostImages = true): Promise<ExtendedLocation | null> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  
  if (!data) return null
  
  // Get post count for this location
  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', id)
  
  const location = await mapRowToLocation(data)
  location.visitCount = count || 0
  
  return location
}

/**
 * Create a new location row.
 */
export async function createLocation(payload: Omit<ExtendedLocation, 'id' | 'visitCount' | 'rating' | 'createdAt'>) {
  const supabase = createSupabaseClient()
  const dbPayload = {
    name: payload.name,
    description: payload.description,
    image_url: payload.imageUrl,
    address: payload.address,
    lat: payload.lat,
    lng: payload.lng,
    category: payload.category,
    tags: payload.tags,
  }
  const { data, error } = await supabase.from('locations').insert(dbPayload).select('*').single()
  if (error) throw new Error(error.message)
  return mapRowToLocation(data)
}

/**
 * Filter locations client-side by distance in metres.
 */
export function filterLocationsByRadius(
  locations: ExtendedLocation[],
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
): ExtendedLocation[] {
  return locations.filter((loc) => {
    const distance = haversineDistance(centerLat, centerLng, loc.lat, loc.lng)
    return distance <= radiusMeters
  })
}

// --- helpers ---------------------------------------------------------------

export async function mapRowToLocation(row: any): Promise<ExtendedLocation> {
  // Get the most upvoted post image for this location
  const mostUpvotedImage = await getMostUpvotedPostImage(row.id)
  
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: mostUpvotedImage || (row.image_url ?? ''),
    address: row.address ?? '',
    lat: row.lat,
    lng: row.lng,
    category: row.category ?? '',
    rating: row.rating ?? 0,
    visitCount: row.visit_count ?? 0,
    tags: row.tags ?? [],
    posts: [],
  }
}

// Fast mapping without expensive image fetching
function mapRowToLocationFast(row: any): ExtendedLocation {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? '',
    address: row.address ?? '',
    lat: row.lat,
    lng: row.lng,
    category: row.category ?? '',
    rating: row.rating ?? 0,
    visitCount: row.visit_count ?? 0,
    tags: row.tags ?? [],
    posts: [],
  }
}

/**
 * Rough haversine distance between two lat/lng points (metres).
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
} 