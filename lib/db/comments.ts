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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', user.id)
    .single()

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
  return {
    id: row.id,
    postId: row.post_id,
    user: {
      id: row.user_id,
      name: profile?.full_name || '',
      username: profile?.username || '',
      avatar: profile?.avatar_url || '',
    },
    text: row.content,
    createdAt: row.created_at,
    likes: 0, // We'll implement comment likes later
    replies: []
  }
} 