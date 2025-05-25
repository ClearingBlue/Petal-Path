import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export interface SignUpPayload {
  readonly email: string
  readonly password: string
}

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as SignUpPayload
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ user: data.user, session: data.session })
} 