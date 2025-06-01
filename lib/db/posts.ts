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
  return await processPostsDataOptimized(data ?? [])
}

async function fetchPostsRanked(): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  try {
    // Fetch recent posts with their data
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        tags,
        created_at,
        user_id,
        location_id,
        locations(id,name),
        post_images(url)
      `)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false })
      .limit(100)
  
    if (error) throw error
    
    if (!posts || posts.length === 0) return []
    
    // Get vote counts and comment counts for all posts
    const postIds = posts.map(p => p.id)
    
    // Fetch vote counts
    const { data: voteCounts } = await supabase
      .from('post_likes')
      .select('post_id, vote_type')
      .in('post_id', postIds)
    
    // Fetch comment counts
    const { data: commentCounts } = await supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds)
    
    // Calculate scores for each post
    const postScores = new Map<number, number>()
    
    posts.forEach(post => {
      // Calculate vote score
      const postVotes = voteCounts?.filter(v => v.post_id === post.id) || []
      const upvotes = postVotes.filter(v => v.vote_type === 'up').length
      const downvotes = postVotes.filter(v => v.vote_type === 'down').length
      const voteScore = upvotes - downvotes
      
      // Calculate comment score (2 points per comment)
      const postComments = commentCounts?.filter(c => c.post_id === post.id) || []
      const commentScore = postComments.length * 2
      
      // Calculate time decay (decreases over 7 days)
      const ageInDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
      const timeDecay = Math.max(0.1, 1 - (ageInDays / 7))
  
      // Calculate final ranking score
      const rankingScore = (voteScore + commentScore) * timeDecay
      
      postScores.set(post.id, rankingScore)
    })
    
    // Sort posts by ranking score
    const sortedPosts = posts.sort((a, b) => {
      const scoreA = postScores.get(a.id) || 0
      const scoreB = postScores.get(b.id) || 0
      return scoreB - scoreA
    })
    
    // Take top 50 posts
    const topPosts = sortedPosts.slice(0, 50)
    
    return await processPostsDataOptimized(topPosts)
  } catch (error) {
    console.warn('Error fetching ranked posts, falling back to chronological')
    return await fetchPostsChronological()
  }
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
  return await processPostsDataOptimized(data ?? [])
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

  const posts = await processPostsDataOptimized([data])
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
  return await processPostsDataOptimized(data ?? [])
}

export async function fetchTopPostsByLocation(locationId: number, limit: number = 2): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  try {
    // Fetch posts for this location from the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: posts, error } = await supabase
      .from('posts')
    .select(`
      id,
        title,
        description,
        tags,
        created_at,
        user_id,
        location_id,
        locations(id,name),
        post_images(url)
    `)
    .eq('location_id', locationId)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!posts || posts.length === 0) return []

    // Get vote counts and comment counts
    const postIds = posts.map(p => p.id)
    
    const { data: voteCounts } = await supabase
      .from('post_likes')
      .select('post_id, vote_type')
      .in('post_id', postIds)
    
    const { data: commentCounts } = await supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds)

    // Calculate ranking scores
    const rankedPosts = posts.map(post => {
      const postVotes = voteCounts?.filter(v => v.post_id === post.id) || []
      const upvotes = postVotes.filter(v => v.vote_type === 'up').length
      const downvotes = postVotes.filter(v => v.vote_type === 'down').length
      const voteScore = upvotes - downvotes
      
      const postComments = commentCounts?.filter(c => c.post_id === post.id) || []
      const commentScore = postComments.length * 2
      
      const ageInDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
      const timeDecay = Math.max(0.1, 1 - (ageInDays / 7))
      
      const rankingScore = (voteScore + commentScore) * timeDecay
      
      return { ...post, rankingScore }
    })

    // Sort by ranking score and take top posts
    rankedPosts.sort((a, b) => b.rankingScore - a.rankingScore)
    const topPosts = rankedPosts.slice(0, limit)

    return await processPostsDataOptimized(topPosts)
  } catch (error) {
    console.error('Error fetching top posts by location:', error)
    // Fallback: just return most recent posts
    const { data, error: fallbackError } = await supabase
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
      .limit(limit)

    if (fallbackError) throw new Error(fallbackError.message)
    return await processPostsDataOptimized(data ?? [])
  }
}

// Simplified profile fetching without cache
async function processPostsDataOptimized(data: any[]): Promise<Post[]> {
  if (!data.length) return []

  // Get unique user IDs
  const userIds = [...new Set(data.map(post => post.user_id).filter(Boolean))]
  
  // Batch fetch profiles for all users
  const supabase = createSupabaseClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', userIds)
  
  // Create a map of user profiles
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // Get vote counts separately
  const postIds = data.map(post => post.id)
  const voteCounts = await getVoteCountsForPosts(postIds)

  return data.map(row => mapRowToPostOptimized(row, profileMap, voteCounts))
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

  // Fetch the complete post with all its relations
  const completePost = await fetchPostById(post.id)
  if (!completePost) {
    throw new Error('Failed to fetch created post')
  }

  return completePost
}

export async function deletePost(postId: number): Promise<void> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user owns the post and get images
  const { data: post } = await supabase
    .from('posts')
    .select(`
      user_id,
      post_images(url)
    `)
    .eq('id', postId)
    .single()

  if (!post || post.user_id !== user.id) {
    throw new Error('Not authorized to delete this post')
  }

  // Delete images from storage
  if (post.post_images && post.post_images.length > 0) {
    const filePaths: string[] = []
    
    for (const image of post.post_images) {
      try {
        // Extract file path from URL
        const url = new URL(image.url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/posts\/(.+)$/)
        if (pathMatch && pathMatch[1]) {
          filePaths.push(pathMatch[1])
        }
      } catch (error) {
        console.error('Failed to parse image URL:', error)
      }
    }
    
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('posts')
        .remove(filePaths)
      
      if (deleteError) {
        console.error('Failed to delete images from storage:', deleteError)
        // Continue with post deletion even if image deletion fails
      }
    }
  }

  // Delete the post (this will cascade delete post_images records)
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) throw new Error(error.message)
}

// Enhanced helper function to get vote counts for multiple posts
async function getVoteCountsForPosts(postIds: number[]): Promise<Map<number, VoteData>> {
  if (postIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  
  try {
    // Fetch all votes for the posts
    const { data: votes, error } = await supabase
      .from('post_likes')
      .select('post_id, vote_type')
      .in('post_id', postIds)
  
  if (error) {
      console.warn('Error fetching vote counts:', error)
      // Return empty vote data for all posts
      const voteMap = new Map<number, VoteData>()
      postIds.forEach(id => {
        voteMap.set(id, { upvotes: 0, downvotes: 0, score: 0 })
      })
      return voteMap
    }
    
    // Calculate vote counts for each post
  const voteMap = new Map<number, VoteData>()
    
    postIds.forEach(postId => {
      const postVotes = votes?.filter(v => v.post_id === postId) || []
      const upvotes = postVotes.filter(v => v.vote_type === 'up').length
      const downvotes = postVotes.filter(v => v.vote_type === 'down').length
      const score = upvotes - downvotes
      
      voteMap.set(postId, { upvotes, downvotes, score })
  })
  
  return voteMap
  } catch (error) {
    console.warn('Vote counts not available:', error)
    // Return empty vote data for all posts
    const voteMap = new Map<number, VoteData>()
    postIds.forEach(id => {
      voteMap.set(id, { upvotes: 0, downvotes: 0, score: 0 })
    })
    return voteMap
  }
}

// Helper function to get user's votes for multiple posts
export async function getUserVotes(postIds: number[]): Promise<Map<number, 'up' | 'down'>> {
  if (postIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return new Map()

  try {
    // Fetch user's votes directly from database
    const { data: votes, error } = await supabase
      .from('post_likes')
      .select('post_id, vote_type')
      .eq('user_id', user.id)
      .in('post_id', postIds)

  if (error) {
      console.warn('Error fetching user votes:', error)
    return new Map()
  }

  const voteMap = new Map<number, 'up' | 'down'>()
    votes?.forEach((vote) => {
    voteMap.set(vote.post_id, vote.vote_type as 'up' | 'down')
  })

  return voteMap
  } catch (error) {
    console.warn('User votes not available:', error)
    return new Map()
  }
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

function mapRowToPostOptimized(
  row: any, 
  profileMap: Map<string, any>, 
  voteCounts: Map<number, VoteData>
): Post {
  const profile = profileMap.get(row.user_id)
  const voteData = voteCounts.get(row.id)
  
  // Provide better fallbacks for missing profile data
  const fallbackUsername = profile?.username || `user_${row.user_id?.slice(-8) || 'unknown'}`
  const fallbackName = profile?.full_name || profile?.username || fallbackUsername
  
  // Calculate comment count from the data if available
  const commentCount = row.comments_count || 0
  
  return {
    id: row.id,
    user: {
      id: row.user_id ?? '0',
      name: fallbackName,
      username: fallbackUsername,
      avatar: profile?.avatar_url || '',
    },
    location: row.locations?.name ?? '',
    locationId: row.locations?.id ?? row.location_id ?? 0,
    images: (row.post_images ?? []).map((img: any) => img.url),
    title: row.title ?? '',
    description: row.description ?? '',
    tags: row.tags ?? [],
    likes: voteData?.score || 0, // Net score (upvotes - downvotes)
    comments: commentCount,
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
  return await processPostsDataOptimized(data ?? [])
} 