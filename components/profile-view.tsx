"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings, Grid, Bookmark, MapPin, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getSavedLocations, getCurrentUser, getCurrentUserPosts, getPosts } from "@/lib/data"
import { deletePost, getUserPosts } from "@/lib/data/services/post-service"
import { toast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import cache from "@/lib/cache"

export default function ProfileView() {
  const router = useRouter()
  const savedLocations = getSavedLocations()
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [userPosts, setUserPosts] = useState(getCurrentUserPosts())
  const [savedPosts, setSavedPosts] = useState(getPosts().slice(0, 4)) // Mock saved posts
  const [userSettings, setUserSettings] = useState<{
    bio: string
    location: string
  } | null>(null)
  const [postToDelete, setPostToDelete] = useState<number | null>(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  // Load user settings from cache
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

    // Check for updated user
    const cachedUser = cache.get<typeof currentUser>("current-user")
    if (cachedUser) {
      setCurrentUser(cachedUser)
    }
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

  const handleDeleteClick = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigation to post detail
    setPostToDelete(postId)
    setShowDeleteAlert(true)
  }

  const confirmDeletePost = () => {
    if (postToDelete) {
      const success = deletePost(postToDelete)
      
      if (success) {
        // Update local state to reflect the deletion
        setUserPosts(userPosts.filter(post => post.id !== postToDelete))
        
        toast({
          title: "Post deleted",
          description: "Your post has been successfully deleted",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete post. Please try again.",
          variant: "destructive",
        })
      }
      
      // Reset state
      setPostToDelete(null)
      setShowDeleteAlert(false)
    }
  }

  const cancelDeletePost = () => {
    setPostToDelete(null)
    setShowDeleteAlert(false)
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="container max-w-md mx-auto py-4 px-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-background">
              <AvatarImage src={currentUser.avatar || "/placeholder.svg?height=64&width=64"} />
              <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{currentUser.username}</h2>
              <p className="text-sm text-muted-foreground">{currentUser.name}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={handleSettingsClick}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-sm">{userSettings?.bio || "Loading..."}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{userSettings?.location || "Loading..."}</span>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
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

        <Tabs defaultValue="posts">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">
              <Grid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="saved">
              <Bookmark className="h-4 w-4" />
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
                  className="aspect-square bg-muted cursor-pointer relative group"
                  onClick={() => handlePostClick(post.id)}
                >
                  <img src={post.image || "/placeholder.svg"} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex justify-end items-start opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity p-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(post.id, e as unknown as React.MouseEvent);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            {userPosts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven't created any posts yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/create')}
                >
                  Create your first post
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="saved" className="mt-4">
            <div className="grid grid-cols-3 gap-1">
              {savedPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-muted cursor-pointer"
                  onClick={() => handlePostClick(post.id)}
                >
                  <img src={post.image || "/placeholder.svg"} alt={post.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {savedPosts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven't saved any posts yet</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="locations" className="mt-4">
            <div className="space-y-4">
              {savedLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-start gap-3 border-b pb-4 cursor-pointer"
                  onClick={() => handleLocationClick(location.id)}
                >
                  <div className="w-16 h-16 bg-muted rounded-md overflow-hidden">
                    <img
                      src={location.imageUrl || `/placeholder.svg?height=64&width=64&text=L${location.id}`}
                      alt={location.name}
                      className="w-full h-full object-cover"
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
            {savedLocations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven't saved any locations yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeletePost}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
