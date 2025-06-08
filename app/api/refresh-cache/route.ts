import { createSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createSupabaseClient()
    
    // Call the refresh function
    const { error } = await supabase.rpc('refresh_rankings_cache')
    
    if (error) {
      console.error('Error refreshing cache:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('Rankings cache refreshed successfully')
    return NextResponse.json({ 
      success: true, 
      message: 'Rankings cache refreshed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cache refresh error:', error)
    return NextResponse.json({ 
      error: 'Failed to refresh cache' 
    }, { status: 500 })
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'ready',
    service: 'cache-refresh',
    timestamp: new Date().toISOString()
  })
} 