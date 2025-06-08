import { createSupabaseClient } from '@/lib/supabase'

export interface Report {
  id: number
  post_id: number
  reported_by: string
  reason: string
  additional_info?: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
}

export interface CreateReportData {
  post_id: number
  reason: string
  additional_info?: string
}

export async function createReport(data: CreateReportData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return { success: false, error: 'You must be logged in to report posts' }
    }
    
    const { error } = await supabase
      .from('reports')
      .insert({
        post_id: data.post_id,
        reason: data.reason,
        additional_info: data.additional_info,
        reported_by: user.id
      })

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'You have already reported this post' }
      }
      console.error('Error creating report:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return { success: false, error: `Failed to submit report: ${error.message}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating report:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getUserReports(): Promise<Report[]> {
  try {
    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

export async function checkUserHasReported(postId: number): Promise<boolean> {
  try {
    const supabase = createSupabaseClient()
    
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('post_id', postId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking report status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking report status:', error)
    return false
  }
} 