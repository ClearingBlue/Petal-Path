"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send } from "lucide-react"
import { 
  fetchConversationMessages, 
  sendMessage, 
  markConversationAsRead,
  type ConversationWithMessages,
  type Message 
} from "@/lib/db/chat"
import { createSupabaseClient } from "@/lib/supabase"

export default function MessagePage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = parseInt(params.id as string)
  const [message, setMessage] = useState("")
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    async function loadConversation() {
      try {
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
        }

        const data = await fetchConversationMessages(conversationId)
        if (data) {
          setConversation(data)
        } else {
          // Conversation not found or no access
          router.back()
        }
      } catch (error) {
        console.error('Error loading conversation:', error)
        router.back()
      } finally {
        setLoading(false)
      }
    }

    if (!isNaN(conversationId)) {
      loadConversation()
    }
  }, [conversationId, router])

  // Real-time message subscription
  useEffect(() => {
    if (!conversation) return

    const supabase = createSupabaseClient()
    
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        (payload) => {
          const newMessage = payload.new as Message
          setConversation(prev => prev ? {
            ...prev,
            messages: [...prev.messages, newMessage]
          } : null)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversation, conversationId])

  // Mark as read when viewing
  useEffect(() => {
    if (conversation && !loading) {
      markConversationAsRead(conversationId)
    }
  }, [conversation, conversationId, loading])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const handleSendMessage = async () => {
    if (!message.trim() || sending || !conversation) return

    setSending(true)
    try {
      const newMessage = await sendMessage(conversationId, message)
      if (newMessage) {
        setConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage]
        } : null)
        setMessage("")
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-center flex-1">
          <div className="text-muted-foreground">Loading conversation...</div>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-center flex-1">
          <div className="text-muted-foreground">Conversation not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={conversation.otherUser.avatar_url || ''} 
            alt={conversation.otherUser.full_name || conversation.otherUser.username || 'User'} 
          />
          <AvatarFallback>
            {conversation.otherUser.full_name?.charAt(0) || 
             conversation.otherUser.username?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">
            {conversation.otherUser.full_name || conversation.otherUser.username || 'Unknown User'}
          </h2>
          <p className="text-sm text-muted-foreground">
            @{conversation.otherUser.username || 'unknown'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${
                msg.senderId === currentUserId ? "justify-end" : "justify-start"
              }`}
            >
              {msg.senderId !== currentUserId && (
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={conversation.otherUser.avatar_url || ''} 
                    alt={conversation.otherUser.full_name || conversation.otherUser.username || 'User'} 
                  />
                  <AvatarFallback>
                    {conversation.otherUser.full_name?.charAt(0) || 
                     conversation.otherUser.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  msg.senderId === currentUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {formatTimestamp(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 