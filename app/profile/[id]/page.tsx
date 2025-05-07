"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Settings, Flower, MapPin, MessageCircle, ArrowLeft, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/data"

export default function OtherUserView({ params }: { params: { id: string } }) {
  const router = useRouter()
  const currentUser = getCurrentUser()
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [isFollowing, setIsFollowing] = useState(false)

  // Unwrap params for Next.js 15+
  const unwrappedParams = use(params as any) as { id: string }

  // Mock user data - in a real app, this would be fetched based on the ID
  const user = {
    id: parseInt(unwrappedParams.id),
    name: "Sarah Chen",
    username: "sarahchen",
    avatar: "https://placekitten.com/100/100",
    bio: "Stanford '25 | Computer Science | Photography enthusiast | Always exploring campus",
    location: "Stanford, CA",
    posts: [
      {
        id: 1,
        title: "Beautiful campus garden",
        image: "https://placekitten.com/400/400",
      },
      {
        id: 2,
        title: "Study spot find",
        image: "https://placekitten.com/401/401",
      },
      {
        id: 3,
        title: "Campus event",
        image: "https://placekitten.com/402/402",
      },
    ],
    stats: {
      posts: 3,
      followers: 142,
      following: 98,
    },
  }

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`)
  }

  const handleMessageClick = () => {
    router.push(`/message/${user.id}`)
  }

  const handleFollowClick = () => {
    setIsFollowing(!isFollowing)
  }

  const handleImageError = (id: string) => {
    setImageError(prev => ({ ...prev, [id]: true }))
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20">
        <div className="container max-w-md mx-auto py-4 px-4">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-6" />
          <div className="grid grid-cols-3 gap-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="container max-w-md mx-auto py-4 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">PetalPath</h1>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-background">
              <AvatarImage 
                src={user.avatar} 
                onError={() => handleImageError("avatar")}
              />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user.username}</h2>
              <p className="text-sm text-muted-foreground">{user.name}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm">{user.bio}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{user.location}</span>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <div className="flex gap-4">
            <div className="text-center">
              <div className="font-bold">{user.stats.posts}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{user.stats.followers}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{user.stats.following}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button 
            variant={isFollowing ? "outline" : "default"}
            className="flex-1 flex items-center justify-center gap-2"
            onClick={handleFollowClick}
          >
            <UserPlus className="h-4 w-4" />
            {isFollowing ? "Following" : "Follow"}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 flex items-center justify-center gap-2 hover:bg-accent transition-colors"
            onClick={handleMessageClick}
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {user.posts.map((post) => (
            <div
              key={post.id}
              className="aspect-square bg-muted cursor-pointer group relative overflow-hidden"
              onClick={() => handlePostClick(post.id)}
            >
              <img 
                src={post.image} 
                alt={post.title} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={() => handleImageError(`post-${post.id}`)}
              />
              {imageError[`post-${post.id}`] && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">Image not available</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 