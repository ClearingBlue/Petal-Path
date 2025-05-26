import type { Metadata } from 'next'
import './globals.css'
import { AppInitializer } from '@/components/app-init'
import { Toaster } from '@/components/ui/toaster'
import { SupabaseProvider } from '@/components/supabase-provider'
import { AuthDebug } from '@/components/auth-debug'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export const metadata: Metadata = {
  title: 'Petal Path',
  description: 'Petal Path | A social media platform for Stanford students to share their favorite places on campus.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Server-side session check
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Middleware handles redirects; layout just provides session-aware provider.

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <SupabaseProvider initialSession={session}>
          {children}
          <AppInitializer />
          <Toaster />
          <AuthDebug />
        </SupabaseProvider>
      </body>
    </html>
  )
}
