'use client'

import { ReactNode, useState } from 'react'
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react'
import { createSupabaseClient } from '@/lib/supabase' // shared client factory

interface SupabaseProviderProps {
  readonly children: ReactNode
  readonly initialSession?: Session | null
}

export function SupabaseProvider({ children, initialSession }: SupabaseProviderProps) {
  // Use the unified client factory so that we have a single place that
  // manages how the Supabase client is instantiated for both browser and server
  const [supabaseClient] = useState(() => createSupabaseClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  )
} 