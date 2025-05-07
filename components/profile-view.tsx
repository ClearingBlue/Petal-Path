"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings, Flower, MapPin, MessageCircle, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSavedLocations, getCurrentUser, getCurrentUserPosts } from "@/lib/data"
import cache from "@/lib/cache"

export default function ProfileView() {
  const router = useRouter()
  const savedLocations = getSavedLocations()
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [userPosts, setUserPosts] = useState(getCurrentUserPosts())
  const [userSettings, setUserSettings] = useState<{
    bio: string
    location: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const cachedSettings = cache.get<{
      name: string
      username: string
      bio: string
      location: string
      avatar: string
    }>("user-settings")

    if (cachedSettings) {
      setUserSettings({
        bio: cachedSettings.bio,
        location: cachedSettings.location,
      })
    } else {
      setUserSettings({
        bio: "Stanford '25 | Computer Science | Coffee enthusiast | Always exploring campus",
        location: "Stanford, CA",
      })
    }

    const cachedUser = cache.get<typeof currentUser>("current-user")
    if (cachedUser) {
      setCurrentUser(cachedUser)
    }

    setIsLoading(false)
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
                src={currentUser.avatar || "/placeholder.svg?height=64&width=64"} 
                onError={() => handleImageError("avatar")}
              />
              <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{currentUser.username}</h2>
              <p className="text-sm text-muted-foreground">{currentUser.name}</p>
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
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm">{userSettings?.bio || "No bio available"}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{userSettings?.location || "Location not set"}</span>
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
                    src={post.image || "/placeholder.svg"} 
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
