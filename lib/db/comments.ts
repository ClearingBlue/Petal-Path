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

  // Get comment IDs and fetch like counts
  const commentIds = data?.map(comment => comment.id) || []
  const likeCounts = await getCommentLikeCounts(commentIds)

  return (data ?? []).map(row => mapRowToComment(row, profileMap, likeCounts))
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
  const likeCounts = new Map([[data.id, 0]]) // New comment has 0 likes
  return mapRowToComment(data, profileMap, likeCounts)
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

// Comment like functions - following the same pattern as post likes but simpler
export async function toggleCommentLike(commentId: number): Promise<{ isLiked: boolean; likeCount: number }> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user already liked this comment
  const { data: existingLike } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single()

  let isLiked: boolean

  if (existingLike) {
    // Unlike the comment
    await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
    isLiked = false
  } else {
    // Like the comment
    await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: user.id
      })
    isLiked = true
  }

  // Get updated like count
  const { count } = await supabase
    .from('comment_likes')
    .select('*', { count: 'exact', head: true })
    .eq('comment_id', commentId)

  return { isLiked, likeCount: count || 0 }
}

export async function getUserLikedComments(commentIds: number[]): Promise<Set<number>> {
  if (commentIds.length === 0) return new Set()
  
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return new Set()

  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', user.id)
    .in('comment_id', commentIds)

  if (error) {
    console.error('Error fetching user liked comments:', error)
    return new Set()
  }

  return new Set(data?.map(like => like.comment_id) || [])
}

// Helper function to get like counts for multiple comments
async function getCommentLikeCounts(commentIds: number[]): Promise<Map<number, number>> {
  if (commentIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .in('comment_id', commentIds)
  
  if (error) {
    console.error('Error fetching comment like counts:', error)
    return new Map()
  }
  
  // Count likes per comment
  const likeCounts = new Map<number, number>()
  commentIds.forEach(id => likeCounts.set(id, 0)) // Initialize all to 0
  
  data?.forEach(like => {
    const currentCount = likeCounts.get(like.comment_id) || 0
    likeCounts.set(like.comment_id, currentCount + 1)
  })
  
  return likeCounts
}

function mapRowToComment(row: any, profileMap: Map<string, any>, likeCounts: Map<number, number>): Comment {
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
    likes: likeCounts.get(row.id) || 0,
    replies: []
  }
} 