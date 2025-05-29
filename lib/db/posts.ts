import { createSupabaseClient } from '@/lib/supabase'
import { fetchProfileById } from './profiles'

export interface Post {
  id: number
  user: {
    id: string
    name: string
    username: string
    avatar: string
  }
  location: string
  locationId: number
  images: string[]
  title: string
  description: string
  tags: string[]
  likes: number
  comments: number
  createdAt: string
}

export interface VoteData {
  upvotes: number
  downvotes: number
  score: number
}

export interface EnhancedRankingData {
  voteScore: number
  commentScore: number
  totalBaseScore: number
  rankingScore: number
  timeDecayFactor: number
}

export interface UserVote {
  postId: number
  voteType: 'up' | 'down' | null
}

export type FeedType = 'new' | 'hot' | 'follow'

export async function fetchPosts(feedType: FeedType = 'hot'): Promise<Post[]> {
  switch (feedType) {
    case 'new':
      return await fetchPostsChronological()
    case 'hot':
      return await fetchPostsRanked()
    case 'follow':
      return await fetchPostsFromFollowedUsers()
    default:
      return await fetchPostsRanked()
  }
}

async function fetchPostsChronological(): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) throw new Error(error.message)
  return await processPostsData(data ?? [])
}

async function fetchPostsRanked(): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  // Use the enhanced ranked feed for better post ordering
  const { data: rankedData, error: rankedError } = await supabase
    .rpc('get_enhanced_ranked_feed', { limit_count: 50 })
  
  if (rankedError) {
    console.error('Error fetching enhanced ranked feed, falling back to basic ranked feed:', rankedError)
    // Fallback to basic ranking if enhanced fails
    const { data: basicRankedData, error: basicRankedError } = await supabase
      .rpc('get_ranked_feed', { limit_count: 50 })
    
    if (basicRankedError) {
      console.error('Error fetching basic ranked feed, falling back to chronological:', basicRankedError)
      // Fallback to chronological ordering if both ranking methods fail
      return await fetchPostsChronological()
    }
    
    // Use basic ranked data
    const postIds = basicRankedData?.map((p: any) => p.post_id) || []
    return await fetchPostsByIds(postIds, basicRankedData)
  }
  
  // Use enhanced ranked data
  const postIds = rankedData?.map((p: any) => p.post_id) || []
  return await fetchPostsByIds(postIds, rankedData)
}

async function fetchPostsFromFollowedUsers(): Promise<Post[]> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return []

  // Get list of users the current user follows
  const { data: followingData, error: followingError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  if (followingError) {
    console.error('Error fetching following list:', followingError)
    return []
  }

  const followingIds = followingData?.map(f => f.following_id) || []
  
  // If not following anyone, return empty array
  if (followingIds.length === 0) return []

  // Fetch posts from followed users
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return await processPostsData(data ?? [])
}

async function fetchPostsByIds(postIds: number[], rankingData: any[]): Promise<Post[]> {
  if (postIds.length === 0) return []
  
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .in('id', postIds)
  
  if (error) throw new Error(error.message)
  
  // Sort the results according to the ranking order
  const rankingMap = new Map(rankingData?.map((p: any) => [p.post_id, p.ranking_score]) || [])
  const sortedData = (data ?? []).sort((a, b) => {
    const scoreA = Number(rankingMap.get(a.id)) || 0
    const scoreB = Number(rankingMap.get(b.id)) || 0
    return scoreB - scoreA
  })
  
  return await processPostsData(sortedData)
}

export async function fetchPostById(id: number): Promise<Post | null> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows returned
    throw new Error(error.message)
  }

  const posts = await processPostsData([data])
  return posts[0] || null
}

export async function fetchPostsByLocation(locationId: number): Promise<Post[]> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return await processPostsData(data ?? [])
}

export async function fetchTopPostsByLocation(locationId: number, limit: number = 2): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  // First get all posts for this location
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .eq('location_id', locationId)

  if (error) throw new Error(error.message)

  // Get enhanced ranking data for all posts
  const postIds = data?.map(post => post.id) || []
  const enhancedRankingData = await getEnhancedRankingForPosts(postIds)

  // Sort by enhanced ranking score and take top posts
  const postsWithScores = (data ?? []).map(post => ({
    ...post,
    rankingScore: enhancedRankingData.get(post.id)?.rankingScore || 0
  })).sort((a, b) => b.rankingScore - a.rankingScore).slice(0, limit)

  return await processPostsData(postsWithScores)
}

export async function createPost(data: {
  title: string;
  description: string;
  tags: string[];
  locationId: number;
  images: string[];
}): Promise<Post> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Ensure images is always an array
  const images = data.images || []

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      title: data.title,
      description: data.description,
      tags: data.tags,
      location_id: data.locationId,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Insert images if any
  if (images.length > 0) {
    const imageInserts = images.map(url => ({
      post_id: post.id,
      url
    }))

    const { error: imageError } = await supabase
      .from('post_images')
      .insert(imageInserts)

    if (imageError) throw new Error(imageError.message)
  }

  // Increment location visit count when posting to this location
  try {
    const { incrementLocationVisit } = await import('@/lib/db/user-locations')
    await incrementLocationVisit(data.locationId)
  } catch (error) {
    // Don't fail the post creation if visit tracking fails
    console.error('Failed to increment location visit:', error)
  }

  return await fetchPostById(post.id) as Post
}

export async function deletePost(postId: number): Promise<void> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user owns the post
  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single()

  if (!post || post.user_id !== user.id) {
    throw new Error('Not authorized to delete this post')
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) throw new Error(error.message)
}

// Enhanced helper function to get enhanced ranking data for multiple posts
async function getEnhancedRankingForPosts(postIds: number[]): Promise<Map<number, EnhancedRankingData>> {
  if (postIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .rpc('get_enhanced_post_rankings', { post_ids: postIds })
  
  if (error) {
    console.error('Error fetching enhanced ranking data:', error)
    return new Map()
  }
  
  const rankingMap = new Map<number, EnhancedRankingData>()
  data?.forEach((ranking: any) => {
    rankingMap.set(ranking.post_id, {
      voteScore: ranking.vote_score,
      commentScore: ranking.comment_score,
      totalBaseScore: ranking.total_base_score,
      rankingScore: ranking.ranking_score,
      timeDecayFactor: ranking.time_decay_factor
    })
  })
  
  return rankingMap
}

// Enhanced helper function to get vote counts for multiple posts
async function getVoteCountsForPosts(postIds: number[]): Promise<Map<number, VoteData>> {
  if (postIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .rpc('get_post_vote_counts', { post_ids: postIds })
  
  if (error) {
    console.error('Error fetching vote counts:', error)
    return new Map()
  }
  
  const voteMap = new Map<number, VoteData>()
  data?.forEach((vote: any) => {
    voteMap.set(vote.post_id, {
      upvotes: vote.upvotes,
      downvotes: vote.downvotes,
      score: vote.score
    })
  })
  
  return voteMap
}

// Helper function to get user's votes for multiple posts
export async function getUserVotes(postIds: number[]): Promise<Map<number, 'up' | 'down'>> {
  if (postIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return new Map()

  const { data, error } = await supabase
    .rpc('get_user_votes', { 
      user_id_param: user.id, 
      post_ids: postIds 
    })

  if (error) {
    console.error('Error fetching user votes:', error)
    return new Map()
  }

  const voteMap = new Map<number, 'up' | 'down'>()
  data?.forEach((vote: any) => {
    voteMap.set(vote.post_id, vote.vote_type as 'up' | 'down')
  })

  return voteMap
}

// Legacy function for backwards compatibility - now returns upvotes only
export async function getUserLikedPosts(): Promise<Set<number>> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return new Set()

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('vote_type', 'up')

  if (error) {
    console.error('Error fetching user liked posts:', error)
    return new Set()
  }

  return new Set(data?.map(like => like.post_id) || [])
}

async function processPostsData(data: any[]): Promise<Post[]> {
  if (!data.length) return []

  // Get unique user IDs
  const userIds = [...new Set(data.map(post => post.user_id).filter(Boolean))]
  
  // Fetch profiles for all users
  const supabase = createSupabaseClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)
  
  // Create a map of user profiles
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // For any missing profiles, try to fetch them individually (this will create them if needed)
  const missingUserIds = userIds.filter(id => !profileMap.has(id))
  if (missingUserIds.length > 0) {
    console.log(`Found ${missingUserIds.length} users without profiles, attempting to resolve`)
    
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

  // Get post IDs and fetch enhanced ranking data and vote counts
  const postIds = data.map(post => post.id)
  const [enhancedRankingData, voteCounts] = await Promise.all([
    getEnhancedRankingForPosts(postIds),
    getVoteCountsForPosts(postIds)
  ])

  return data.map(row => mapRowToPost(row, profileMap, voteCounts, enhancedRankingData))
}

function mapRowToPost(
  row: any, 
  profileMap: Map<string, any>, 
  voteCounts: Map<number, VoteData>,
  enhancedRankingData?: Map<number, EnhancedRankingData>
): Post {
  const profile = profileMap.get(row.user_id)
  const voteData = voteCounts.get(row.id)
  const enhancedData = enhancedRankingData?.get(row.id)
  
  // Provide better fallbacks for missing profile data
  const fallbackUsername = profile?.username || `user_${row.user_id?.slice(-8) || 'unknown'}`
  const fallbackName = profile?.full_name || profile?.username || fallbackUsername
  
  return {
    id: row.id,
    user: {
      id: row.user_id ?? '0',
      name: fallbackName,
      username: fallbackUsername,
      avatar: profile?.avatar_url || '',
    },
    location: row.locations?.name ?? '',
    locationId: row.locations?.id ?? 0,
    images: (row.post_images ?? []).map((img: any) => img.url),
    title: row.title ?? '',
    description: row.description ?? '',
    tags: row.tags ?? [],
    likes: voteData?.score || 0, // Net score (upvotes - downvotes)
    comments: Math.floor((enhancedData?.commentScore || 0) / 2), // Convert back from points to count
    createdAt: row.created_at ?? '',
  }
}

// Enhanced vote function that supports both upvotes and downvotes
export async function togglePostVote(postId: number, voteType: 'up' | 'down'): Promise<{ 
  userVote: 'up' | 'down' | null; 
  voteData: VoteData 
}> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user already voted on this post
  const { data: existingVote } = await supabase
    .from('post_likes')
    .select('vote_type')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single()

  let newVoteType: 'up' | 'down' | null = null

  if (existingVote) {
    if (existingVote.vote_type === voteType) {
      // Remove vote if clicking the same vote type
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
      newVoteType = null
    } else {
      // Update vote type if clicking different vote type
      await supabase
        .from('post_likes')
        .update({ vote_type: voteType })
        .eq('post_id', postId)
        .eq('user_id', user.id)
      newVoteType = voteType
    }
  } else {
    // Create new vote
    await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id,
        vote_type: voteType
      })
    newVoteType = voteType
  }

  // Get updated vote counts
  const voteCounts = await getVoteCountsForPosts([postId])
  const voteData = voteCounts.get(postId) || { upvotes: 0, downvotes: 0, score: 0 }

  return { userVote: newVoteType, voteData }
}

// Legacy function for backwards compatibility
export async function togglePostLike(postId: number): Promise<{ isLiked: boolean; likeCount: number }> {
  const result = await togglePostVote(postId, 'up')
  return { 
    isLiked: result.userVote === 'up', 
    likeCount: Math.max(0, result.voteData.score) // Ensure non-negative for backwards compatibility
  }
}

export async function fetchPostsByUser(userId: string): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      description,
      tags,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return await processPostsData(data ?? [])
} 