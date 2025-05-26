"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings, Flower, MapPin, MessageCircle, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSavedLocations } from "@/lib/data"
import { fetchCurrentUserProfile, type Profile } from "@/lib/db/profiles"
import { fetchPostsByUser } from "@/lib/db/posts"
import type { Post } from "@/lib/data/models/post"

export default function ProfileView() {
  const router = useRouter()
  const savedLocations = getSavedLocations()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadProfileData() {
      try {
        setIsLoading(true)
        
        // Load user profile
        const userProfile = await fetchCurrentUserProfile()
        setProfile(userProfile)
        
        // Load user's posts
        if (userProfile) {
          const posts = await fetchPostsByUser(userProfile.id)
          setUserPosts(posts)
        }
        
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [])

  const handleLocationClick = (locationId: number) => {
    router.push(`/location/${locationId}`)
  }

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`)
  }

  const handleSettingsClick = () => {
    router.push("/settings")
  }

  const handleImageError = (id: string) => {
    setImageError(prev => ({ ...prev, [id]: true }))
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto pb-20">
        <div className="container max-w-md mx-auto py-4 px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-md" />
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-background hover:border-primary transition-colors">
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/inbox")}
              className="hover:bg-accent transition-colors"
            >
              <Inbox className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
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

          <Button 
            variant="outline" 
            className="flex items-center gap-2 hover:bg-accent transition-colors"
            onClick={() => router.push("/message")}
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
        </div>

        <Tabs defaultValue="posts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">
              <Flower className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="locations">
              <MapPin className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="posts" className="mt-4">
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
          </TabsContent>
          <TabsContent value="locations" className="mt-4">
            <div className="space-y-4">
              {savedLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-start gap-3 border-b pb-4 cursor-pointer hover:bg-accent/50 transition-colors p-2 rounded-md"
                  onClick={() => handleLocationClick(location.id)}
                >
                  <div className="w-16 h-16 bg-muted rounded-md overflow-hidden">
                    <img
                      src={location.imageUrl || `/placeholder.svg?height=64&width=64&text=L${location.id}`}
                      alt={location.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(`location-${location.id}`)}
                    />
                  </div>
                  <div>
                    <div className="font-semibold">{location.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {location.category}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{location.visitCount} visits</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
