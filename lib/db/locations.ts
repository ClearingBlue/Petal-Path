import { createSupabaseClient } from '@/lib/supabase'
import type { ExtendedLocation } from '@/lib/data/models/location'

/**
 * Fetch all locations from Supabase `public.locations` table.
 */
export async function fetchLocations(): Promise<ExtendedLocation[]> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('locations').select('*').order('id')

  if (error) {
    throw new Error(error.message)
  }

  // Cast the result to our ExtendedLocation interface (camelCase props)
  return (data ?? []).map(mapRowToLocation)
}

/**
 * Fetch a single location by primary key.
 */
export async function fetchLocationById(id: number): Promise<ExtendedLocation | null> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('locations').select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data ? mapRowToLocation(data) : null
}

/**
 * Create a new location row.
 */
export async function createLocation(payload: Omit<ExtendedLocation, 'id' | 'visitCount' | 'rating' | 'createdAt'>) {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('locations').insert(payload).select('*').single()
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