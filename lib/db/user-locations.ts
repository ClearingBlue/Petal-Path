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
  
  // Always fetch images for saved locations for better UX
    const locations = await Promise.all(
      (data ?? [])
        .filter(item => item.locations)
      .map(async item => {
        const location = mapRowToLocationFast(item.locations)
        // Try to get a recent post image for this location
        const imageUrl = await getLocationImageFast(item.location_id)
        if (imageUrl) {
          location.imageUrl = imageUrl
        }
        return location
      })
    )
    return locations
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
  
  // Get all locations where the user has posted
  const { data: userPosts, error } = await supabase
    .from('posts')
    .select(`
      location_id,
      locations(*)
    `)
    .eq('user_id', userId)
  
  if (error) throw new Error(error.message)
  
  // Group by location and count posts
  const locationPostCounts = new Map<number, { location: any, postCount: number }>()
  
  for (const post of userPosts ?? []) {
    if (!post.locations || !post.location_id) continue
    
    const existing = locationPostCounts.get(post.location_id)
    if (existing) {
      existing.postCount++
    } else {
      locationPostCounts.set(post.location_id, {
        location: post.locations,
        postCount: 1
      })
    }
  }
  
  // Convert to array and sort by post count (most posts first)
  const sortedLocations = Array.from(locationPostCounts.values())
    .sort((a, b) => b.postCount - a.postCount)
  
  // Fetch images for visited locations
  const locationsWithImages = await Promise.all(
    sortedLocations.map(async item => {
      const location = mapRowToLocationFast(item.location)
      // Set visitCount to the number of posts the user made at this location
      location.visitCount = item.postCount
      // Try to get an image for this location
      const imageUrl = await getLocationImageFast(item.location.id)
      if (imageUrl) {
        location.imageUrl = imageUrl
      }
    return location
  })
  )
  
  return locationsWithImages
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