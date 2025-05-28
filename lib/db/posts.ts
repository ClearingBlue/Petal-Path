import { createSupabaseClient } from '@/lib/supabase'
import type { Post } from '@/lib/data/models/post'

export interface NewPostPayload {
  readonly title: string
  readonly description: string
  readonly locationId: number
  readonly tags: string[]
  readonly imageFiles: File[] // browser File objects
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

export async function fetchPosts(): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  // Use the new ranked feed function for better post ordering
  const { data: rankedData, error: rankedError } = await supabase
    .rpc('get_ranked_feed', { limit_count: 50 })
  
  if (rankedError) {
    console.error('Error fetching ranked feed, falling back to chronological:', rankedError)
    // Fallback to chronological ordering if ranking fails
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
    if (error) throw new Error(error.message)
    return await processPostsData(data ?? [])
  }
  
  // Fetch full post data for the ranked posts
  const postIds = rankedData?.map((p: any) => p.post_id) || []
  if (postIds.length === 0) return []
  
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
  const rankingMap = new Map(rankedData?.map((p: any) => [p.post_id, p.ranking_score]) || [])
  const sortedData = (data ?? []).sort((a, b) => {
    const scoreA = Number(rankingMap.get(a.id)) || 0
    const scoreB = Number(rankingMap.get(b.id)) || 0
    return scoreB - scoreA
  })
  
  return await processPostsData(sortedData)
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
  
  // Get vote counts for all posts
  const postIds = data?.map(post => post.id) || []
  const voteCounts = await getVoteCountsForPosts(postIds)
  
  // Sort by score and take top posts
  const postsWithScores = (data ?? []).map(post => ({
    ...post,
    score: voteCounts.get(post.id)?.score || 0
  })).sort((a, b) => b.score - a.score).slice(0, limit)
  
  return await processPostsData(postsWithScores)
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
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  
  if (!data) return null
  
  const posts = await processPostsData([data])
  return posts[0] || null
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

// Common processing function for all post data
async function processPostsData(data: any[]): Promise<Post[]> {
  if (data.length === 0) return []
  
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
  
  // For any missing profiles, try to fetch them individually
  const missingUserIds = userIds.filter(id => !profileMap.has(id))
  if (missingUserIds.length > 0) {
    console.log(`Found ${missingUserIds.length} users without profiles, attempting to resolve`)
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
  
  // Get vote counts for all posts
  const postIds = data.map(post => post.id)
  const voteCounts = await getVoteCountsForPosts(postIds)
  
  return mapRowsToPosts(data, profileMap, voteCounts)
}

export async function createPost(payload: NewPostPayload) {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // 1. insert post (without images) to get id
  const { data: postRow, error: insertErr } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      location_id: payload.locationId,
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
    })
    .select('*')
    .single()

  if (insertErr) throw new Error(insertErr.message)

  // 2. upload images and insert post_images rows
  const bucket = supabase.storage.from('posts')
  const imageUrls: string[] = []
  for (const file of payload.imageFiles) {
    const path = `${user.id}/${postRow.id}/${crypto.randomUUID()}`
    const { error: uploadErr } = await bucket.upload(path, file, { upsert: false })
    if (uploadErr) {
      console.error('Bucket upload error:', uploadErr)
      throw new Error(`Upload failed: ${uploadErr.message}`)
    }
    const { data } = bucket.getPublicUrl(path)
    imageUrls.push(data.publicUrl)
  }

  if (imageUrls.length) {
    const insertImageRows = imageUrls.map((url) => ({ post_id: postRow.id, url }))
    const { error: imgErr } = await supabase.from('post_images').insert(insertImageRows)
    if (imgErr) throw new Error(imgErr.message)
  }

  return postRow.id as number
}

// ---------------------------------------------------------------------------

function mapRowsToPosts(rows: any[], profileMap: Map<string, any>, voteCounts: Map<number, VoteData>): Post[] {
  return rows.map(row => mapRowToPost(row, profileMap, voteCounts))
}

function mapRowToPost(row: any, profileMap: Map<string, any>, voteCounts: Map<number, VoteData>): Post {
  const profile = profileMap.get(row.user_id)
  const voteData = voteCounts.get(row.id)
  
  // Provide better fallbacks for missing profile data
  const fallbackUsername = profile?.username || `user_${row.user_id?.slice(-8) || 'unknown'}`
  const fallbackName = profile?.full_name || profile?.username || fallbackUsername
  
  return {
    id: row.id,
    user: {
      id: row.user_id ?? 0,
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
    likes: voteData?.score || 0, // Now represents net score (upvotes - downvotes)
    comments: 0,
    createdAt: row.created_at ?? '',
  }
}

export async function deletePost(postId: number): Promise<boolean> {
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

  // Delete post images first (due to foreign key constraint)
  await supabase
    .from('post_images')
    .delete()
    .eq('post_id', postId)

  // Delete the post
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) throw new Error(error.message)
  return true
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

export async function checkUserLikedPost(postId: number): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return false

  const { data } = await supabase
    .from('post_likes')
    .select('vote_type')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .eq('vote_type', 'up')
    .single()

  return !!data
} 