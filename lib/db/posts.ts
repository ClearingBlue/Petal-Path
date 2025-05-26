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
      likes,
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
  
  return mapRowsToPosts(data ?? [], profileMap)
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
      likes,
      created_at,
      user_id,
      locations(id,name),
      post_images(url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  
  // Get profile for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', userId)
    .single()
  
  const profileMap = new Map(profile ? [[profile.id, profile]] : [])
  return mapRowsToPosts(data ?? [], profileMap)
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
      likes,
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
  
  return mapRowsToPosts(data ?? [], profileMap)
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
      likes,
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
  
  // Get profile for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', data.user_id)
    .single()
  
  const profileMap = new Map(profile ? [[profile.id, profile]] : [])
  return mapRowToPost(data, profileMap)
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

function mapRowsToPosts(rows: any[], profileMap: Map<string, any>): Post[] {
  return rows.map(row => mapRowToPost(row, profileMap))
}

function mapRowToPost(row: any, profileMap: Map<string, any>): Post {
  const profile = profileMap.get(row.user_id)
  return {
    id: row.id,
    user: {
      id: row.user_id ?? 0,
      name: profile?.full_name || '',
      username: profile?.username || '',
      avatar: profile?.avatar_url || '',
    },
    location: row.locations?.name ?? '',
    locationId: row.locations?.id ?? 0,
    images: (row.post_images ?? []).map((img: any) => img.url),
    title: row.title ?? '',
    description: row.description ?? '',
    tags: row.tags ?? [],
    likes: row.likes ?? 0,
    comments: 0,
    createdAt: row.created_at ?? '',
  }
} 