import { createSupabaseClient } from '@/lib/supabase'
import { fetchLocations } from './locations'
import type { ExtendedLocation } from '@/lib/data/models/location'
import { mapRowToLocation } from './locations'

// Simple cache for location images to avoid repeated expensive fetches
const locationImageCache = new Map<number, string>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

// Optimized version that uses cached or recent post image
async function getLocationImageFast(locationId: number): Promise<string | null> {
  // Check cache first
  const cached = locationImageCache.get(locationId)
  if (cached) {
    return cached
  }

  const supabase = createSupabaseClient()
  
  // Get most recent post with image (much faster than ranking calculation)
  const { data: recentPosts, error } = await supabase
    .from('posts')
    .select(`
      post_images(url)
    `)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (error || !recentPosts) return null

  for (const post of recentPosts) {
    if (post.post_images && post.post_images.length > 0) {
      const imageUrl = post.post_images[0].url
      // Cache the result
      locationImageCache.set(locationId, imageUrl)
      // Clear cache after duration
      setTimeout(() => locationImageCache.delete(locationId), CACHE_DURATION)
      return imageUrl
    }
  }
  
  return null
}

// Only use expensive ranking when specifically needed
async function getMostUpvotedPostImage(locationId: number): Promise<string | null> {
  const supabase = createSupabaseClient()
  
  try {
    // First try to get from enhanced rankings cache for better performance
    const { data: topPost, error: cacheError } = await supabase
      .from('enhanced_post_rankings_cache')
      .select(`
        id
      `)
      .eq('location_id', locationId)
      .order('ranking_score', { ascending: false })
      .limit(1)
      .single()

    if (!cacheError && topPost) {
      // Get the first image from the top post
      const { data: images, error: imageError } = await supabase
        .from('post_images')
        .select('url')
        .eq('post_id', topPost.id)
        .order('id')
        .limit(1)

      if (!imageError && images && images.length > 0) {
        return images[0].url
      }
    }

    // Fallback to recent post image
    return await getLocationImageFast(locationId)
  } catch (error) {
    console.error('Error getting most upvoted post image:', error)
    return await getLocationImageFast(locationId)
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
  
  // Always use fast path for better performance
  return locationsWithPosts.map(item => {
    const location = mapRowToLocationFast(item.locations)
    // Override visitCount with user's specific visit count
    location.visitCount = item.visit_count
    return location
  })
}

// Helper function to map database row to ExtendedLocation (optimized version)
async function mapRowToLocationOptimized(row: any): Promise<ExtendedLocation> {
  // Use fast image fetching instead of expensive ranking calculation
  const imageUrl = await getLocationImageFast(row.id)
  
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: imageUrl || (row.image_url ?? ''),
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

// Fast mapping without any image fetching
function mapRowToLocationFast(row: any): ExtendedLocation {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? '', // Use default image URL only
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