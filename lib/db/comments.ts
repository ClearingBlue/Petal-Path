import { createSupabaseClient } from '@/lib/supabase'

export interface Comment {
  id: number
  postId: number
  user: {
    id: string
    name: string
    username: string
    avatar: string
  }
  text: string
  createdAt: string
  likes: number
  parentId?: number
  replies?: number[]
}

export async function fetchCommentsByPost(postId: number): Promise<Comment[]> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      user_id,
      post_id
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Get unique user IDs
  const userIds = [...new Set(data?.map(comment => comment.user_id).filter(Boolean))]
  
  // Fetch profiles for all users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)
  
  // Create a map of user profiles
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // For any missing profiles, try to fetch them individually (this will create them if needed)
  const missingUserIds = userIds.filter(id => !profileMap.has(id))
  if (missingUserIds.length > 0) {
    console.log(`Found ${missingUserIds.length} users without profiles in comments for post ${postId}, attempting to resolve`)
    const { fetchProfileById } = await import('./profiles')
    
    for (const userId of missingUserIds) {
      try {
        const profile = await fetchProfileById(userId)
        if (profile) {
          profileMap.set(userId, profile)
        }
      } catch (error) {
        console.error(`Failed to resolve profile for user ${userId}:`, error)
      }
    }
  }

  return (data ?? []).map(row => mapRowToComment(row, profileMap))
}

export async function createComment(postId: number, content: string): Promise<Comment> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Get user profile using the improved fetchProfileById function
  const { fetchProfileById } = await import('./profiles')
  const profile = await fetchProfileById(user.id)

  const profileMap = new Map(profile ? [[profile.id, profile]] : [])
  return mapRowToComment(data, profileMap)
}

export async function deleteComment(commentId: number): Promise<void> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user owns the comment
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .single()

  if (!comment || comment.user_id !== user.id) {
    throw new Error('Not authorized to delete this comment')
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) throw new Error(error.message)
}

function mapRowToComment(row: any, profileMap: Map<string, any>): Comment {
  const profile = profileMap.get(row.user_id)
  
  // Provide better fallbacks for missing profile data
  const fallbackUsername = profile?.username || `user_${row.user_id?.slice(-8) || 'unknown'}`
  const fallbackName = profile?.full_name || profile?.username || fallbackUsername
  
  return {
    id: row.id,
    postId: row.post_id,
    user: {
      id: row.user_id,
      name: fallbackName,
      username: fallbackUsername,
      avatar: profile?.avatar_url || '',
    },
    text: row.content,
    createdAt: row.created_at,
    likes: 0, // We'll implement comment likes later
    replies: []
  }
} 