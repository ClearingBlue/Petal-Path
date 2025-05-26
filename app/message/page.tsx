"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
// Removed getCurrentUser import - using real auth instead

export default function MessagePage() {
  const router = useRouter()
  // TODO: Replace with real user data from auth
  const [searchQuery, setSearchQuery] = useState("")

  // Mock contacts data
  const contacts = [
    {
      id: 1,
      user: {
        id: 2,
        name: "Sarah Chen",
        username: "sarahchen",
        avatar: "https://placekitten.com/100/100",
        isOnline: true,
      },
      lastMessage: "Hey, are you going to the campus event tomorrow?",
      timestamp: "2m ago",
      unread: true,
    },
    {
      id: 2,
      user: {
        id: 3,
        name: "Michael Park",
        username: "michaelpark",
        avatar: "https://placekitten.com/101/101",
        isOnline: false,
      },
      lastMessage: "Thanks for sharing that location!",
      timestamp: "1h ago",
      unread: false,
    },
    {
      id: 3,
      user: {
        id: 4,
        name: "Emma Wilson",
        username: "emmaw",
        avatar: "https://placekitten.com/102/102",
        isOnline: true,
      },
      lastMessage: "Did you see the new study spot?",
      timestamp: "3h ago",
      unread: true,
    },
  ]

  const handleContactClick = (contactId: number) => {
    router.push(`/message/${contactId}`)
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
              <h1 className="text-xl font-bold">Direct Messages</h1>
              <p className="text-sm text-muted-foreground">Chat with your connections</p>
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
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-auto">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 border-b cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleContactClick(contact.id)}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.user.avatar} />
                    <AvatarFallback>{contact.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {contact.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{contact.user.name}</div>
                    <div className="text-xs text-muted-foreground">{contact.timestamp}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {contact.lastMessage}
                    </p>
                    {contact.unread && (
                      <Badge variant="secondary" className="ml-auto">
                        New
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 