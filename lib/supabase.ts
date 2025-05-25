import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

export function createSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getConfig()
  return createClient(url, anonKey, { auth: { persistSession: false } })
} 