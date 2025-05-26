"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Settings, Flower, MapPin, MessageCircle, ArrowLeft, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchProfileById, type Profile } from "@/lib/db/profiles"
import { fetchPostsByUser } from "@/lib/db/posts"
import type { Post } from "@/lib/data/models/post"

export default function OtherUserView({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [isFollowing, setIsFollowing] = useState(false)

  // Unwrap params for Next.js 15+
  const unwrappedParams = use(params as any) as { id: string }

  useEffect(() => {
    async function loadProfileData() {
      try {
        setIsLoading(true)
        
        // Load user profile and posts
        const [profileData, postsData] = await Promise.all([
          fetchProfileById(unwrappedParams.id),
          fetchPostsByUser(unwrappedParams.id)
        ])
        
        setProfile(profileData)
        setUserPosts(postsData)
        
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [unwrappedParams.id])

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`)
  }

  const handleMessageClick = () => {
    router.push(`/message/${unwrappedParams.id}`)
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
                src={profile?.avatar_url || "/placeholder.svg?height=64&width=64"} 
                onError={() => handleImageError("avatar")}
              />
              <AvatarFallback>{profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile?.username || "Username not set"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.full_name || "Name not set"}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm">{profile?.bio || "No bio available"}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{profile?.location || "Location not set"}</span>
          </div>
        </div>

        <div className="flex justify-between mb-6">
          <div className="flex gap-4">
            <div className="text-center">
              <div className="font-bold">{userPosts.length}</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-bold">142</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-bold">98</div>
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
          {userPosts.map((post) => (
            <div
              key={post.id}
              className="aspect-square bg-muted cursor-pointer group relative overflow-hidden"
              onClick={() => handlePostClick(post.id)}
            >
              <img 
                src={post.images[0] || "/placeholder.svg"} 
                alt={post.title} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={() => handleImageError(`post-${post.id}`)}
              />
              {post.images.length > 1 && (
                <div className="absolute top-2 right-2 bg-background/80 rounded-full px-2 py-1 text-xs">
                  +{post.images.length - 1}
                </div>
              )}
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