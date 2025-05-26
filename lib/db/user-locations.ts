import { createSupabaseClient } from '@/lib/supabase'
import { fetchLocations } from './locations'
import type { ExtendedLocation } from '@/lib/data/models/location'

export async function fetchUserSavedLocations(userId: string): Promise<ExtendedLocation[]> {
  // For now, we'll return all locations as "saved" since we don't have a saved_locations table yet
  // In the future, you can create a user_saved_locations table to track which locations users have saved
  return await fetchLocations()
}

export async function fetchUserVisitedLocations(userId: string): Promise<ExtendedLocation[]> {
  const supabase = createSupabaseClient()
  
  // Get locations where the user has posted
  const { data, error } = await supabase
    .from('posts')
    .select(`
      location_id,
      locations(*)
    `)
    .eq('user_id', userId)
    .not('location_id', 'is', null)
  
  if (error) throw new Error(error.message)
  
  // Extract unique locations and map to ExtendedLocation format
  const uniqueLocations = new Map()
  data?.forEach(post => {
    if (post.locations && !uniqueLocations.has(post.location_id)) {
      uniqueLocations.set(post.location_id, mapRowToLocation(post.locations))
    }
  })
  
  return Array.from(uniqueLocations.values())
}

// Helper function to map database row to ExtendedLocation
function mapRowToLocation(row: any): ExtendedLocation {
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