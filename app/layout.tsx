import type { Metadata } from 'next'
import './globals.css'
import { AppInitializer } from '@/components/app-init'
import { Toaster } from '@/components/ui/toaster'
import { SupabaseProvider } from '@/components/supabase-provider'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export const metadata: Metadata = {
  title: 'Petal Path',
  description: 'Petal Path | A social media platform for Stanford students to share their favorite places on campus.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#ec4899',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Petal Path',
  },
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
        </SupabaseProvider>
      </body>
    </html>
  )
}
