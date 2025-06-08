import { createSupabaseClient } from '@/lib/supabase'
import { fetchProfileById, type Profile } from './profiles'

export interface Message {
  id: number
  conversationId: number
  senderId: string
  content: string
  createdAt: string
}

export interface Conversation {
  id: number
  otherUser: Profile
  lastMessage: string | null
  lastMessageAt: string
  unreadCount: number
  isOnline?: boolean
}

export interface ConversationWithMessages {
  id: number
  otherUser: Profile
  messages: Message[]
}

function orderUserIds(userId1: string, userId2: string): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1]
}

export async function fetchConversations(): Promise<Conversation[]> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return []

  // Get all conversations for the current user
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(`
      id,
      user1_id,
      user2_id,
      last_message_at,
      created_at
    `)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError)
    return []
  }

  if (!conversations || conversations.length === 0) return []

  // Get the latest message for each conversation
  const conversationIds = conversations.map(c => c.id)
  const { data: latestMessages, error: messagesError } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  if (messagesError) {
    console.error('Error fetching latest messages:', messagesError)
  }

  // Create a map of latest messages by conversation ID
  const latestMessageMap = new Map<number, { content: string; created_at: string }>()
  latestMessages?.forEach(msg => {
    if (!latestMessageMap.has(msg.conversation_id)) {
      latestMessageMap.set(msg.conversation_id, {
        content: msg.content,
        created_at: msg.created_at
      })
    }
  })

  // Get unread counts for each conversation
  const unreadCounts = await Promise.all(
    conversations.map(async (conv) => {
      const count = await getUnreadMessageCount(conv.id)
      return { conversationId: conv.id, count }
    })
  )
  const unreadCountMap = new Map(unreadCounts.map(u => [u.conversationId, u.count]))

  // Get other user profiles
  const otherUserIds = conversations.map(conv => 
    conv.user1_id === user.id ? conv.user2_id : conv.user1_id
  )
  const uniqueUserIds = [...new Set(otherUserIds)]
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio, location, created_at')
    .in('id', uniqueUserIds)

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
  }

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  // Build conversation list
  const result: Conversation[] = []
  
  for (const conv of conversations) {
    const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
    let otherUserProfile = profileMap.get(otherUserId)
    
    // If profile not found, try to fetch it individually
    if (!otherUserProfile) {
      const fetchedProfile = await fetchProfileById(otherUserId)
      if (fetchedProfile) {
        otherUserProfile = fetchedProfile
      }
    }
    
    if (!otherUserProfile) continue

    const latestMessage = latestMessageMap.get(conv.id)
    const unreadCount = unreadCountMap.get(conv.id) || 0

    result.push({
      id: conv.id,
      otherUser: otherUserProfile,
      lastMessage: latestMessage?.content || null,
      lastMessageAt: latestMessage?.created_at || conv.created_at,
      unreadCount
    })
  }

  return result
}

export async function fetchConversationMessages(conversationId: number): Promise<ConversationWithMessages | null> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null

  // Verify user has access to this conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    console.error('Error fetching conversation:', convError)
    return null
  }

  if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
    console.error('User does not have access to this conversation')
    return null
  }

  // Get messages for this conversation
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching messages:', messagesError)
    return null
  }

  // Get the other user's profile
  const otherUserId = conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id
  const otherUserProfile = await fetchProfileById(otherUserId)
  
  if (!otherUserProfile) {
    console.error('Could not fetch other user profile')
    return null
  }

  // Mark messages as read
  await markConversationAsRead(conversationId)

  return {
    id: conversationId,
    otherUser: otherUserProfile,
    messages: messages?.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      createdAt: msg.created_at
    })) || []
  }
}

export async function sendMessage(conversationId: number, content: string): Promise<Message | null> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null

  // Verify user has access to this conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('user1_id, user2_id')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    console.error('Error verifying conversation access:', convError)
    return null
  }

  if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
    console.error('User does not have access to this conversation')
    return null
  }

  // Insert the message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim()
    })
    .select('id, conversation_id, sender_id, content, created_at')
    .single()

  if (messageError) {
    console.error('Error sending message:', messageError)
    return null
  }

  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    content: message.content,
    createdAt: message.created_at
  }
}

export async function createOrGetConversation(otherUserId: string): Promise<number | null> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return null

  if (user.id === otherUserId) {
    console.error('Cannot create conversation with yourself')
    return null
  }

  console.log('Attempting to create conversation between:', user.id, 'and', otherUserId)

  // Order user IDs consistently (smaller first)
  const [user1Id, user2Id] = user.id < otherUserId ? [user.id, otherUserId] : [otherUserId, user.id]

  // First, try to find existing conversation
  const { data: existingConversation, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('user1_id', user1Id)
    .eq('user2_id', user2Id)
    .single()

  if (findError && findError.code !== 'PGRST116') {
    console.error('Error finding conversation:', findError)
    return null
  }

  if (existingConversation) {
    console.log('Found existing conversation with ID:', existingConversation.id)
    return existingConversation.id
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      user1_id: user1Id,
      user2_id: user2Id
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating conversation:', createError)
    return null
  }

  console.log('Created new conversation with ID:', newConversation.id)
  return newConversation.id
}

export async function getUnreadMessageCount(conversationId: number): Promise<number> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return 0

  // Get conversation and user's last seen timestamp
  const { data: conversation } = await supabase
    .from('conversations')
    .select('user1_id, user2_id, user1_last_seen, user2_last_seen')
    .eq('id', conversationId)
    .single()

  if (!conversation) return 0

  const isUser1 = conversation.user1_id === user.id
  const lastSeen = isUser1 ? conversation.user1_last_seen : conversation.user2_last_seen

  // Count messages after last seen timestamp
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id) // Don't count own messages as unread
    .gt('created_at', lastSeen)

  if (error) return 0
  return count || 0
}

export async function markConversationAsRead(conversationId: number): Promise<void> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return

  // Get conversation to determine which last_seen field to update
  const { data: conversation } = await supabase
    .from('conversations')
    .select('user1_id, user2_id')
    .eq('id', conversationId)
    .single()

  if (!conversation) return

  const isUser1 = conversation.user1_id === user.id
  const updateField = isUser1 ? 'user1_last_seen' : 'user2_last_seen'

  // Update last seen timestamp
  await supabase
    .from('conversations')
    .update({ [updateField]: new Date().toISOString() })
    .eq('id', conversationId)
}

export async function getTotalUnreadCount(): Promise<number> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return 0

  // Get all conversations for the user
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  if (!conversations) return 0

  // Get unread count for each conversation
  const unreadCounts = await Promise.all(
    conversations.map(conv => getUnreadMessageCount(conv.id))
  )

  return unreadCounts.reduce((total, count) => total + count, 0)
}

export async function startConversationWithUser(otherUserId: string): Promise<number | null> {
  const conversationId = await createOrGetConversation(otherUserId)
  return conversationId
} 