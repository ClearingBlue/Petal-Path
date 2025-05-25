import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST() {
  const supabase = createSupabaseClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
} 