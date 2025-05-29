import { createSupabaseClient } from '@/lib/supabase'
import { fetchLocations } from './locations'
import type { ExtendedLocation } from '@/lib/data/models/location'

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

export async function fetchUserSavedLocations(userId: string): Promise<ExtendedLocation[]> {
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
  return (data ?? [])
    .filter(item => item.locations)
    .map(item => mapRowToLocation(item.locations))
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

export async function fetchUserVisitedLocations(userId: string): Promise<ExtendedLocation[]> {
  const supabase = createSupabaseClient()
  
  // Get locations where the user has visit records
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
  
  // Map to ExtendedLocation format with visit count
  return (data ?? [])
    .filter(item => item.locations)
    .map(item => {
      const location = mapRowToLocation(item.locations)
      // Override visitCount with user's specific visit count
      location.visitCount = item.visit_count
      return location
    })
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