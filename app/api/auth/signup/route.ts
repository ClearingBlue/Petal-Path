import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error,
  } = await supabase.auth.signUp({ email, password })

  if (error || !session) {
    return NextResponse.json({ error: error?.message ?? 'Unable to sign up' }, { status: 400 })
  }

  return NextResponse.json({ user: session.user })
} 