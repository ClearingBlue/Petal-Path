import type { Metadata } from 'next'
import './globals.css'
import { AppInitializer } from '@/components/app-init'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Petal Path',
  description: 'Petal Path | A social media platform for Stanford students to share their favorite places on campus.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <AppInitializer />
        <Toaster />
      </body>
    </html>
  )
}
