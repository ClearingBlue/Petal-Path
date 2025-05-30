import { createSupabaseClient } from '@/lib/supabase'
import { fetchLocations } from './locations'
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

export async function incrementLocationVisit(locationId: number): Promise<void> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user has visited this location before
  const { data: existingVisit } = await supabase
    .from('location_visits')
    .select('visit_count')
    .eq('location_id', locationId)
    .eq('user_id', user.id)
    .single()

  if (existingVisit) {
    // Update existing visit count
    await supabase
      .from('location_visits')
      .update({
        visit_count: existingVisit.visit_count + 1,
        last_visit_at: new Date().toISOString()
      })
      .eq('location_id', locationId)
      .eq('user_id', user.id)
  } else {
    // Create new visit record
    await supabase
      .from('location_visits')
      .insert({
        location_id: locationId,
        user_id: user.id,
        visit_count: 1
      })
  }

  // Update total visit count for the location
  await updateLocationTotalVisits(locationId)
}

export async function updateLocationTotalVisits(locationId: number): Promise<void> {
  const supabase = createSupabaseClient()
  
  // Calculate total visits from all users
  const { data, error } = await supabase
    .from('location_visits')
    .select('visit_count')
    .eq('location_id', locationId)

  if (error) throw new Error(error.message)

  const totalVisits = data?.reduce((sum, record) => sum + record.visit_count, 0) || 0

  // Update the location's visit_count
  await supabase
    .from('locations')
    .update({ visit_count: totalVisits })
    .eq('id', locationId)
}

export async function getUserLocationVisitCount(userId: string, locationId: number): Promise<number> {
  const supabase = createSupabaseClient()
  
  const { data } = await supabase
    .from('location_visits')
    .select('visit_count')
    .eq('location_id', locationId)
    .eq('user_id', userId)
    .single()

  return data?.visit_count || 0
}

export async function fetchUserSavedLocations(userId: string, includePostImages = false): Promise<ExtendedLocation[]> {
  const supabase = createSupabaseClient()
  
  // Get saved locations for the user
  const { data, error } = await supabase
    .from('saved_locations')
    .select(`
      location_id,
      locations(*)
    `)
    .eq('user_id', userId)
  
  if (error) throw new Error(error.message)
  
  // Map to ExtendedLocation format
  if (includePostImages) {
    const locations = await Promise.all(
      (data ?? [])
        .filter(item => item.locations)
        .map(async item => await mapRowToLocation(item.locations))
    )
    return locations
  } else {
    // Fast path without expensive image fetching
  return (data ?? [])
    .filter(item => item.locations)
      .map(item => mapRowToLocationFast(item.locations))
  }
}

export async function toggleLocationSave(locationId: number): Promise<{ isSaved: boolean }> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if location is already saved
  const { data: existingSave } = await supabase
    .from('saved_locations')
    .select('id')
    .eq('location_id', locationId)
    .eq('user_id', user.id)
    .single()

  let isSaved: boolean

  if (existingSave) {
    // Remove save
    await supabase
      .from('saved_locations')
      .delete()
      .eq('location_id', locationId)
      .eq('user_id', user.id)
    isSaved = false
  } else {
    // Add save
    await supabase
      .from('saved_locations')
      .insert({
        location_id: locationId,
        user_id: user.id
      })
    isSaved = true
  }

  return { isSaved }
}

export async function getUserSavedLocations(locationIds: number[]): Promise<Set<number>> {
  if (locationIds.length === 0) return new Set()
  
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return new Set()

  const { data, error } = await supabase
    .from('saved_locations')
    .select('location_id')
    .eq('user_id', user.id)
    .in('location_id', locationIds)

  if (error) {
    console.error('Error fetching user saved locations:', error)
    return new Set()
  }

  return new Set(data?.map(save => save.location_id) || [])
}

export async function checkLocationSaved(locationId: number): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return false

  const { data } = await supabase
    .from('saved_locations')
    .select('id')
    .eq('location_id', locationId)
    .eq('user_id', user.id)
    .single()

  return !!data
}

export async function fetchUserVisitedLocations(userId: string, includePostImages = false): Promise<ExtendedLocation[]> {
  const supabase = createSupabaseClient()
  
  // Get locations where the user has visit records AND has actually posted
  const { data, error } = await supabase
    .from('location_visits')
    .select(`
      location_id,
      visit_count,
      locations(*)
    `)
    .eq('user_id', userId)
    .order('last_visit_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  
  // Filter to only include locations where user actually has posts
  const locationsWithPosts = []
  for (const item of data ?? []) {
    if (!item.locations) continue
    
    // Check if user has posts at this location
    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('location_id', item.location_id)
      .eq('user_id', userId)
      .limit(1)
    
    // Only include if user has actually posted at this location
    if (userPosts && userPosts.length > 0) {
      locationsWithPosts.push(item)
    }
  }
  
  // Map to ExtendedLocation format with visit count
  if (includePostImages) {
    const locations = await Promise.all(
      locationsWithPosts.map(async item => {
        const location = await mapRowToLocation(item.locations)
        // Override visitCount with user's specific visit count
        location.visitCount = item.visit_count
        return location
      })
    )
    return locations
  } else {
    // Fast path without expensive image fetching
    return locationsWithPosts.map(item => {
      const location = mapRowToLocationFast(item.locations)
      // Override visitCount with user's specific visit count
      location.visitCount = item.visit_count
      return location
    })
  }
}

// Helper function to map database row to ExtendedLocation
async function mapRowToLocation(row: any): Promise<ExtendedLocation> {
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