"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Send } from "lucide-react"

interface Message {
  id: string
  content: string
  senderId: string
  timestamp: string
}

interface User {
  id: string
  name: string
  avatar: string
  online: boolean
}

const mockUser: User = {
  id: "1",
  name: "John Doe",
  avatar: "https://placekitten.com/200/200",
  online: true
}

const mockMessages: Message[] = [
  {
    id: "1",
    content: "Hey there! How are you?",
    senderId: "2",
    timestamp: "10:30 AM"
  },
  {
    id: "2",
    content: "I'm good, thanks! How about you?",
    senderId: "1",
    timestamp: "10:31 AM"
  },
  {
    id: "3",
    content: "Doing great! Just working on some new features for PetalPath.",
    senderId: "2",
    timestamp: "10:32 AM"
  }
]

export default function MessagePage() {
  const router = useRouter()
  const params = useParams()
  const userId = parseInt(params.id as string)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>(mockMessages)

  const handleSendMessage = () => {
    if (!message.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      senderId: userId.toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([...messages, newMessage])
    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
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
        <Avatar className="h-6 w-6">
          <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
          <AvatarFallback>{mockUser.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold">{mockUser.name}</h2>
          <p className="text-sm text-muted-foreground">
            {mockUser.online ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${
              msg.senderId === userId.toString() ? "justify-end" : "justify-start"
            }`}
          >
            {msg.senderId !== userId.toString() && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={mockUser.avatar} alt={mockUser.name} />
                <AvatarFallback>{mockUser.name[0]}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.senderId === userId.toString()
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

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
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
  )
} 