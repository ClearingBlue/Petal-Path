"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// Removed getCurrentUser import - using real auth instead

export default function MessagePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  // TODO: Replace with real user data from auth
  const [message, setMessage] = useState("")

  // Mock conversation data
  const conversation = {
    id: parseInt(params.id),
    user: {
      id: 2,
      name: "Sarah Chen",
      username: "sarahchen",
      avatar: "https://placekitten.com/100/100",
      isOnline: true,
    },
    messages: [
      {
        id: 1,
        senderId: 2,
        content: "Hey, are you going to the campus event tomorrow?",
        timestamp: "2:30 PM",
      },
      {
        id: 2,
        senderId: 1,
        content: "Yes, I'm planning to go! Are you?",
        timestamp: "2:31 PM",
      },
      {
        id: 3,
        senderId: 2,
        content: "Definitely! I heard there's going to be free food and some interesting workshops.",
        timestamp: "2:32 PM",
      },
    ],
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would typically send the message to your backend
      setMessage("")
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
            <Avatar className="w-10 h-10">
              <AvatarImage src={conversation.user.avatar} />
              <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{conversation.user.name}</div>
              <div className="text-xs text-muted-foreground">
                {conversation.user.isOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === 1 ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.senderId === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 