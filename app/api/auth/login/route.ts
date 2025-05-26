import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? 'Invalid credentials' }, { status: 400 })
  }

  // `createRouteHandlerClient` attaches the `Set-Cookie` header automatically.
  return NextResponse.json({ user: session.user })
} 