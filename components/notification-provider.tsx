"use client"

import { useEffect, useState, createContext, useContext, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTotalUnreadCount } from "@/lib/db/chat"
import { createSupabaseClient } from "@/lib/supabase"
import { useSession } from "@supabase/auth-helpers-react"
import { toast } from "@/components/ui/use-toast"

interface NotificationContextType {
  unreadCount: number
  showNotification: (message: string, userId?: string) => void
  clearNotifications: () => void
  updateUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  showNotification: () => {},
  clearNotifications: () => {},
  updateUnreadCount: async () => {}
})

export function useNotifications() {
  return useContext(NotificationContext)
}

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter()
  const session = useSession()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notification, setNotification] = useState<{ message: string; userId?: string } | null>(null)

  // Function to update unread count
  const updateUnreadCount = async () => {
    if (!session) return
    
    try {
      const count = await getTotalUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error updating unread count:', error)
    }
  }

  // Function to clear notifications
  const clearNotifications = () => {
    setNotification(null)
  }

  // Fetch initial unread count
  useEffect(() => {
    if (!session) return

    async function fetchUnreadCount() {
      try {
        const count = await getTotalUnreadCount()
        setUnreadCount(count)
        
        // Show notification if there are unread messages when entering the platform
        // Add a small delay to prevent notification from appearing immediately on load
        if (count > 0) {
          setTimeout(() => {
            showNotification(`You have ${count} unread message${count > 1 ? 's' : ''}`)
          }, 1500)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()
  }, [session])

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!session?.user?.id) return

    const supabase = createSupabaseClient()
    
    const subscription = supabase
      .channel('new-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        async (payload) => {
          const newMessage = payload.new as any
          
          // Only show notification if the message is not from the current user
          if (newMessage.sender_id !== session.user.id) {
            // Fetch sender info
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', newMessage.sender_id)
              .single()

            const senderName = senderProfile?.full_name || senderProfile?.username || 'Someone'
            showNotification(`New message from ${senderName}`, newMessage.sender_id)
            
            // Update unread count
            await updateUnreadCount()
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [session])

  // Subscribe to conversation updates (when messages are read)
  useEffect(() => {
    if (!session?.user?.id) return

    const supabase = createSupabaseClient()
    
    const conversationSubscription = supabase
      .channel('conversation-updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations'
        }, 
        async (payload) => {
          // Update unread count when conversation last_seen is updated
          await updateUnreadCount()
        }
      )
      .subscribe()

    return () => {
      conversationSubscription.unsubscribe()
    }
  }, [session])

  const showNotification = (message: string, userId?: string) => {
    setNotification({ message, userId })
    
    // Also show a toast notification
    toast({
      title: "New Message",
      description: message,
      action: userId ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            router.push('/message')
            clearNotifications()
          }}
        >
          View
        </Button>
      ) : undefined,
    })

    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(null)
    }, 5000)
  }

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      showNotification, 
      clearNotifications, 
      updateUnreadCount 
    }}>
      {children}
      
      {/* Floating notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in-0">
          <div className="bg-background border rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1"
                  onClick={() => {
                    router.push('/message')
                    clearNotifications()
                  }}
                >
                  View messages
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2 -mt-2"
                onClick={() => clearNotifications()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
} 