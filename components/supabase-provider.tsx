'use client'

import { ReactNode, useState } from 'react'
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

interface SupabaseProviderProps {
  readonly children: ReactNode
  readonly initialSession?: Session | null
}

export function SupabaseProvider({ children, initialSession }: SupabaseProviderProps) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  )
} 