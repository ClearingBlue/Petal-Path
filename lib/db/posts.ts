import { createSupabaseClient } from '@/lib/supabase'
import type { Post } from '@/lib/data/models/post'

export interface NewPostPayload {
  readonly title: string
  readonly description: string
  readonly locationId: number
  readonly tags: string[]
  readonly imageFiles: File[] // browser File objects
}

export async function fetchPosts(): Promise<Post[]> {
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
  if (error) throw new Error(error.message)
  
  // Get unique user IDs
  const userIds = [...new Set(data?.map(post => post.user_id).filter(Boolean))]
  
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
  
  // Get like counts for all posts
  const postIds = data?.map(post => post.id) || []
  const likeCounts = await getLikeCountsForPosts(postIds)
  
  return mapRowsToPosts(data ?? [], profileMap, likeCounts)
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

  // Get profile for this user using the improved fetchProfileById function
  const { fetchProfileById } = await import('./profiles')
  const profile = await fetchProfileById(userId)

  // Create a map of user profiles
  const profileMap = new Map(profile ? [[profile.id, profile]] : [])

  // Get like counts for all posts
  const postIds = data?.map(post => post.id) || []
  const likeCounts = await getLikeCountsForPosts(postIds)

  return mapRowsToPosts(data ?? [], profileMap, likeCounts)
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
  
  // Get unique user IDs
  const userIds = [...new Set(data?.map(post => post.user_id).filter(Boolean))]
  
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
    console.log(`Found ${missingUserIds.length} users without profiles in location ${locationId}, attempting to resolve`)
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
  
  // Get like counts for all posts
  const postIds = data?.map(post => post.id) || []
  const likeCounts = await getLikeCountsForPosts(postIds)
  
  return mapRowsToPosts(data ?? [], profileMap, likeCounts)
}

export async function fetchTopPostsByLocation(locationId: number, limit: number = 2): Promise<Post[]> {
  const supabase = createSupabaseClient()
  
  // First get all posts for this location with their like counts
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
  
  // Get like counts for all posts
  const postIds = data?.map(post => post.id) || []
  const likeCounts = await getLikeCountsForPosts(postIds)
  
  // Sort by like count and take top posts
  const postsWithLikes = (data ?? []).map(post => ({
    ...post,
    likeCount: likeCounts.get(post.id) || 0
  })).sort((a, b) => b.likeCount - a.likeCount).slice(0, limit)
  
  // Get unique user IDs
  const userIds = [...new Set(postsWithLikes.map(post => post.user_id).filter(Boolean))]
  
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
    console.log(`Found ${missingUserIds.length} users without profiles in top posts for location ${locationId}, attempting to resolve`)
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
  
  return mapRowsToPosts(postsWithLikes, profileMap, likeCounts)
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
  
  // Get profile for this user using the improved fetchProfileById function
  const { fetchProfileById } = await import('./profiles')
  const profile = await fetchProfileById(data.user_id)
  
  const profileMap = new Map(profile ? [[profile.id, profile]] : [])
  
  // Get like count for this post
  const likeCounts = await getLikeCountsForPosts([id])
  
  return mapRowToPost(data, profileMap, likeCounts)
}

// Helper function to get like counts for multiple posts
async function getLikeCountsForPosts(postIds: number[]): Promise<Map<number, number>> {
  if (postIds.length === 0) return new Map()
  
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .in('post_id', postIds)
  
  if (error) {
    console.error('Error fetching like counts:', error)
    return new Map()
  }
  
  // Count likes per post
  const likeCounts = new Map<number, number>()
  postIds.forEach(id => likeCounts.set(id, 0)) // Initialize all to 0
  
  data?.forEach(like => {
    const currentCount = likeCounts.get(like.post_id) || 0
    likeCounts.set(like.post_id, currentCount + 1)
  })
  
  return likeCounts
}

// Helper function to get user's liked posts
export async function getUserLikedPosts(): Promise<Set<number>> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return new Set()

  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching user liked posts:', error)
    return new Set()
  }

  return new Set(data?.map(like => like.post_id) || [])
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

function mapRowsToPosts(rows: any[], profileMap: Map<string, any>, likeCounts: Map<number, number>): Post[] {
  return rows.map(row => mapRowToPost(row, profileMap, likeCounts))
}

function mapRowToPost(row: any, profileMap: Map<string, any>, likeCounts: Map<number, number>): Post {
  const profile = profileMap.get(row.user_id)
  
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
    likes: likeCounts.get(row.id) || 0,
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

export async function togglePostLike(postId: number): Promise<{ isLiked: boolean; likeCount: number }> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Not authenticated')

  // Check if user already liked this post
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single()

  let isLiked: boolean

  if (existingLike) {
    // Unlike the post
    await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    isLiked = false
  } else {
    // Like the post
    await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      })
    isLiked = true
  }

  // Get updated like count
  const { count } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  return { isLiked, likeCount: count || 0 }
}

export async function checkUserLikedPost(postId: number): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return false

  const { data } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single()

  return !!data
} 