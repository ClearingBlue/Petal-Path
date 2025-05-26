import { createSupabaseClient } from '@/lib/supabase'
import type { Profile } from './profiles'

export interface DirectMessage {
  id: number
  senderId: string
  receiverId: string
  content: string
  createdAt: string
}

export interface ConversationPreview {
  otherUser: Profile
  lastMessage: string
  lastTimestamp: string
  unreadCount: number
}

function getConversationKey(a: string, b: string) {
  return [a, b].sort().join('-')
}

export async function fetchConversationPreviews(): Promise<ConversationPreview[]> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return []

  // Fetch last 100 messages involving current user ordered by newest first
  const { data, error } = await supabase
    .from('direct_messages')
    .select(`
      id,
      content,
      created_at,
      sender_id,
      receiver_id,
      sender:profiles!direct_messages_sender_id_fkey(id, username, full_name, avatar_url),
      receiver:profiles!direct_messages_receiver_id_fkey(id, username, full_name, avatar_url)
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  // Aggregate into previews
  const map = new Map<string, ConversationPreview>()
  for (const row of data ?? []) {
    const otherProfile = (row.sender_id === user.id ? row.receiver : row.sender) as unknown as Profile
    if (!otherProfile) continue
    const key = getConversationKey(user.id, otherProfile.id)
    if (!map.has(key)) {
      // First (newest) message becomes preview
      map.set(key, {
        otherUser: otherProfile,
        lastMessage: row.content,
        lastTimestamp: row.created_at,
        unreadCount: row.receiver_id === user.id ? 1 : 0,
      })
    } else {
      // Count unread
      const preview = map.get(key)!
      if (row.receiver_id === user.id) {
        preview.unreadCount += 1
      }
    }
  }

  return Array.from(map.values())
}

export async function fetchMessagesWithUser(otherUserId: string): Promise<DirectMessage[]> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return []

  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return data as DirectMessage[]
}

export async function sendDirectMessage(receiverId: string, content: string): Promise<boolean> {
  const supabase = createSupabaseClient()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) return false

  const { error } = await supabase.from('direct_messages').insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content,
  })

  if (error) {
    console.error('Error sending message:', error)
    return false
  }
  return true
} 