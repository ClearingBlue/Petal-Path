import { createSupabaseClient } from '@/lib/supabase'

export interface UserStats {
  followers_count: number
  following_count: number
  posts_count: number
}

export interface FollowRelationship {
  id: number
  follower_id: string
  following_id: string
  created_at: string
}

/**
 * Follow a user
 */
export async function followUser(followingId: string): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Prevent self-following
  if (user.id === followingId) {
    throw new Error('Cannot follow yourself')
  }

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: followingId
    })

  if (error) {
    // Handle unique constraint violation (already following)
    if (error.code === '23505') {
      return false // Already following
    }
    throw new Error(error.message)
  }

  return true
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followingId: string): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId)

  if (error) throw new Error(error.message)
  return true
}

/**
 * Check if current user is following another user
 */
export async function isFollowing(followingId: string): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return false

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking follow status:', error)
    return false
  }

  return !!data
}

/**
 * Get user statistics (followers, following, posts count)
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .rpc('get_user_stats', { user_id: userId })
    .single()

  if (error) {
    console.error('Error fetching user stats:', error)
    return { followers_count: 0, following_count: 0, posts_count: 0 }
  }

  const result = data as { followers_count: number; following_count: number; posts_count: number }
  
  return {
    followers_count: Number(result.followers_count) || 0,
    following_count: Number(result.following_count) || 0,
    posts_count: Number(result.posts_count) || 0
  }
}

/**
 * Get users that follow the given user (followers)
 */
export async function getFollowers(userId: string): Promise<any[]> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower_id,
      created_at,
      profiles!follows_follower_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  
  return data?.map((follow: any) => ({
    id: follow.follower_id,
    username: follow.profiles?.username,
    full_name: follow.profiles?.full_name,
    avatar_url: follow.profiles?.avatar_url,
    followed_at: follow.created_at
  })) || []
}

/**
 * Get users that the given user follows (following)
 */
export async function getFollowing(userId: string): Promise<any[]> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id,
      created_at,
      profiles!follows_following_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  
  return data?.map((follow: any) => ({
    id: follow.following_id,
    username: follow.profiles?.username,
    full_name: follow.profiles?.full_name,
    avatar_url: follow.profiles?.avatar_url,
    followed_at: follow.created_at
  })) || []
}

/**
 * Toggle follow status (follow if not following, unfollow if following)
 */
export async function toggleFollow(followingId: string): Promise<{ isFollowing: boolean }> {
  const currentlyFollowing = await isFollowing(followingId)
  
  if (currentlyFollowing) {
    await unfollowUser(followingId)
    return { isFollowing: false }
  } else {
    await followUser(followingId)
    return { isFollowing: true }
  }
} 