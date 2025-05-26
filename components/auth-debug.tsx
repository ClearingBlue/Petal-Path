'use client'

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'

export function AuthDebug() {
  const session = useSession()
  const supabase = useSupabaseClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-semibold mb-2">Auth Debug</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Session:</strong> {session ? 'Authenticated' : session === null ? 'Not authenticated' : 'Loading...'}
        </div>
        {session && (
          <>
            <div>
              <strong>User ID:</strong> {session.user.id}
            </div>
            <div>
              <strong>Email:</strong> {session.user.email}
            </div>
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </>
        )}
      </div>
    </div>
  )
} 