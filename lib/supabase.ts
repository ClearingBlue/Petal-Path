import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

export interface SupabaseConfig {
  readonly url: string
  readonly anonKey: string
}

function getConfig(): SupabaseConfig {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  }
}

// For client-side operations that need session persistence
export function createSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    // Browser environment - use auth helpers for session persistence
    return createBrowserSupabaseClient()
  } else {
    // Server environment - use regular client
    const { url, anonKey } = getConfig()
    return createClient(url, anonKey)
  }
} 