"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, MoreVertical, MessageSquare, Heart, UserPlus, MapPin, Star, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser } from "@/lib/data"

export default function InboxPage() {
  const router = useRouter()
  const currentUser = getCurrentUser()
  const [searchQuery, setSearchQuery] = useState("")

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: "comment",
      user: {
        id: 2,
        name: "Sarah Chen",
        username: "sarahchen",
        avatar: "https://placekitten.com/100/100",
      },
      content: "commented on your post: 'This spot looks amazing! 🌸'",
      timestamp: "5m ago",
      unread: true,
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
      postId: "123",
    },
    {
      id: 2,
      type: "like",
      user: {
        id: 3,
        name: "Michael Park",
        username: "michaelpark",
        avatar: "https://placekitten.com/101/101",
      },
      content: "liked your post about the campus garden",
      timestamp: "15m ago",
      unread: true,
      icon: <Heart className="h-5 w-5 text-red-500" />,
      postId: "124",
    },
    {
      id: 3,
      type: "follow",
      user: {
        id: 4,
        name: "Emma Wilson",
        username: "emmaw",
        avatar: "https://placekitten.com/102/102",
      },
      content: "started following you",
      timestamp: "1h ago",
      unread: true,
      icon: <UserPlus className="h-5 w-5 text-green-500" />,
      userId: "456",
    },
    {
      id: 4,
      type: "location",
      user: {
        id: 5,
        name: "David Kim",
        username: "davidk",
        avatar: "https://placekitten.com/103/103",
      },
      content: "added a new location near your favorite spot",
      timestamp: "2h ago",
      unread: true,
      icon: <MapPin className="h-5 w-5 text-purple-500" />,
      locationId: "789",
    },
    {
      id: 5,
      type: "favorite",
      user: {
        id: 6,
        name: "Lisa Wong",
        username: "lisaw",
        avatar: "https://placekitten.com/104/104",
      },
      content: "saved your post to their favorites",
      timestamp: "3h ago",
      unread: false,
      icon: <Star className="h-5 w-5 text-yellow-500" />,
      postId: "125",
    },
    {
      id: 6,
      type: "share",
      user: {
        id: 7,
        name: "James Lee",
        username: "jamesl",
        avatar: "https://placekitten.com/105/105",
      },
      content: "shared your post with their followers",
      timestamp: "4h ago",
      unread: false,
      icon: <Share2 className="h-5 w-5 text-orange-500" />,
      postId: "126",
    },
    {
      id: 7,
      type: "comment",
      user: {
        id: 8,
        name: "Sophie Zhang",
        username: "sophiez",
        avatar: "https://placekitten.com/106/106",
      },
      content: "commented on your post: 'The flowers are blooming beautifully! 🌺'",
      timestamp: "5h ago",
      unread: false,
      icon: <MessageSquare className="h-5 w-5 text-blue-500" />,
      postId: "127",
    },
    {
      id: 8,
      type: "follow",
      user: {
        id: 9,
        name: "Alex Thompson",
        username: "alext",
        avatar: "https://placekitten.com/107/107",
      },
      content: "started following you",
      timestamp: "6h ago",
      unread: false,
      icon: <UserPlus className="h-5 w-5 text-green-500" />,
      userId: "457",
    },
  ]

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    switch (notification.type) {
      case "comment":
      case "like":
      case "favorite":
      case "share":
        router.push(`/post/${notification.postId}`)
        break
      case "follow":
        router.push(`/profile/${notification.userId}`)
        break
      case "location":
        router.push(`/location/${notification.locationId}`)
        break
    }
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">Your activity updates</p>
            </div>
            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="mt-1">{notification.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{notification.user.name}</div>
                    <div className="text-xs text-muted-foreground">{notification.timestamp}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 