import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export interface LoginPayload {
  readonly email: string
  readonly password: string
}

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as LoginPayload
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user, session: data.session })
} 