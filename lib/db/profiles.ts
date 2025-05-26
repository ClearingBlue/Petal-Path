import { createSupabaseClient } from '@/lib/supabase'

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  created_at: string
}

export interface UpdateProfilePayload {
  username?: string
  full_name?: string
  avatar_url?: string
  bio?: string
  location?: string
}

export async function fetchCurrentUserProfile(): Promise<Profile | null> {
  const supabase = createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // First try to get existing profile
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile doesn't exist, create one using upsert to handle race conditions
      return await ensureProfileExists(user.id, user.email || '')
    }
    throw new Error(error.message)
  }

  return data
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // If profile doesn't exist, try to create one
    if (error.code === 'PGRST116') {
      console.log(`Profile not found for user ${userId}, attempting to create one`)
      try {
        // Get user info from auth to create profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.id === userId) {
          // Only create profile if it's for the current authenticated user
          return await ensureProfileExists(userId, user.email || '')
        } else {
          // For other users, we can't create a profile without their email
          // Return a minimal profile with just the ID
          console.warn(`Cannot create profile for user ${userId} - not current user`)
          return {
            id: userId,
            username: `user_${userId.slice(-8)}`,
            full_name: 'Unknown User',
            avatar_url: null,
            bio: null,
            location: null,
            created_at: new Date().toISOString()
          }
        }
      } catch (createError) {
        console.error('Error creating profile for user:', userId, createError)
        // Return a minimal profile as fallback
        return {
          id: userId,
          username: `user_${userId.slice(-8)}`,
          full_name: 'Unknown User',
          avatar_url: null,
          bio: null,
          location: null,
          created_at: new Date().toISOString()
        }
      }
    }
    console.error('Error fetching profile for user:', userId, error)
    return null
  }

  return data
}

export async function ensureProfileExists(userId: string, email: string): Promise<Profile> {
  const supabase = createSupabaseClient()
  
  // First try to get the profile again (in case it was created between calls)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (existingProfile) {
    return existingProfile
  }
  
  // Generate a PetalPath-themed default username
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  const petalWords = ['petal', 'bloom', 'garden', 'flower', 'blossom', 'leaf', 'stem', 'rose', 'lily', 'daisy']
  const randomPetal = petalWords[Math.floor(Math.random() * petalWords.length)]
  const randomNum = Math.floor(Math.random() * 999) + 1
  
  // Try different username combinations until we find an available one
  let username = `${randomPetal}${randomNum}`
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const isAvailable = await checkUsernameAvailable(username)
    if (isAvailable) break
    
    // Try with email prefix + petal word
    if (attempts === 1) {
      username = `${emailPrefix}_${randomPetal}`
    }
    // Try with different random number
    else if (attempts < 5) {
      username = `${randomPetal}${Math.floor(Math.random() * 9999) + 1}`
    }
    // Try with different petal word
    else {
      const newPetal = petalWords[Math.floor(Math.random() * petalWords.length)]
      username = `${newPetal}${Math.floor(Math.random() * 9999) + 1}`
    }
    
    attempts++
  }
  
  // Fallback to UUID-based username if all attempts fail
  if (attempts >= maxAttempts) {
    username = `petal_${userId.slice(-8)}`
  }
  
  // Use upsert to handle race conditions
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username: username,
      full_name: null,
      avatar_url: null,
      bio: null,
      location: null
    }, {
      onConflict: 'id'
    })
    .select()
    .single()

  if (error) {
    // If there's still a conflict, try to fetch the existing profile
    if (error.code === '23505') { // unique constraint violation
      const { data: conflictProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (conflictProfile) {
        return conflictProfile
      }
    }
    throw new Error(error.message)
  }
  return data
}

export async function createProfile(userId: string, email: string): Promise<Profile> {
  const supabase = createSupabaseClient()
  
  // Generate a PetalPath-themed default username
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  const petalWords = ['petal', 'bloom', 'garden', 'flower', 'blossom', 'leaf', 'stem', 'rose', 'lily', 'daisy']
  const randomPetal = petalWords[Math.floor(Math.random() * petalWords.length)]
  const randomNum = Math.floor(Math.random() * 999) + 1
  
  // Try different username combinations until we find an available one
  let username = `${randomPetal}${randomNum}`
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const isAvailable = await checkUsernameAvailable(username)
    if (isAvailable) break
    
    // Try with email prefix + petal word
    if (attempts === 1) {
      username = `${emailPrefix}_${randomPetal}`
    }
    // Try with different random number
    else if (attempts < 5) {
      username = `${randomPetal}${Math.floor(Math.random() * 9999) + 1}`
    }
    // Try with different petal word
    else {
      const newPetal = petalWords[Math.floor(Math.random() * petalWords.length)]
      username = `${newPetal}${Math.floor(Math.random() * 9999) + 1}`
    }
    
    attempts++
  }
  
  // Fallback to UUID-based username if all attempts fail
  if (attempts >= maxAttempts) {
    username = `petal_${userId.slice(-8)}`
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: username,
      full_name: null,
      avatar_url: null,
      bio: null,
      location: null
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<Profile> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createSupabaseClient()
  const bucket = supabase.storage.from('avatars')
  
  // Create unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  
  const { error: uploadError } = await bucket.upload(fileName, file, { upsert: true })
  if (uploadError) throw new Error(uploadError.message)
  
  const { data } = bucket.getPublicUrl(fileName)
  return data.publicUrl
}

export async function checkUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
  const supabase = createSupabaseClient()
  let query = supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    
  if (currentUserId) {
    query = query.neq('id', currentUserId)
  }
  
  const { data, error } = await query
  
  if (error) throw new Error(error.message)
  return data.length === 0
} 