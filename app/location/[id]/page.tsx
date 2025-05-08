"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import React, { use, useState, useEffect } from "react"
import { ArrowLeft, MapPin, ChevronUp, ChevronDown, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getLocationById } from "@/lib/data/services/location-service"
import { getPostsByLocation } from "@/lib/data/services/post-service"
import type { Location, ExtendedLocation } from "@/lib/data/models/location"
import type { Post } from "@/lib/data/models/post"
import dynamic from "next/dynamic"

// Dynamically load map component to avoid SSR issues
const LocationMapWithNoSSR = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-muted rounded-md flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  ),
});

export default function LocationFeed({ params }: { params: { id: string } }) {
  const router = useRouter()
  const unwrappedParams = use(params as any) as { id: string };
  const locationId = Number.parseInt(unwrappedParams.id)
  
  // State declarations
  const [location, setLocation] = useState<ExtendedLocation | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [votedPosts, setVotedPosts] = useState<Record<number, "up" | "down" | null>>({})
  const [postLikes, setPostLikes] = useState<Record<number, number>>({})
  const [isMounted, setIsMounted] = useState(false)

  // Fetch location and posts data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Get location data
        const locationData = getLocationById(locationId)
        if (!locationData) {
          return
        }
        setLocation(locationData)
        
        // Get posts data
        const locationPosts = getPostsByLocation(locationId)
        setPosts(locationPosts)
        
        // Initialize post likes
        const initialLikes: Record<number, number> = {}
        locationPosts.forEach(post => {
          initialLikes[post.id] = post.likes
        })
        setPostLikes(initialLikes)
      } catch (error) {
        console.error("Error fetching location data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
    setIsMounted(true)
  }, [locationId]) // Only re-run if locationId changes

  if (isLoading || !location) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`)
  }

  const handleCommentClick = (postId: number, e: React.MouseEvent) => {
    if (!isMounted) return
    e.stopPropagation()
    router.push(`/post/${postId}#comments`)
  }

  const handleVote = (postId: number, direction: "up" | "down") => {
    // Get current vote status
    const currentVote = votedPosts[postId];
    
    // Case: canceling a vote
    if (currentVote === direction) {
      // Remove current vote
      setVotedPosts(prev => {
        const newState = { ...prev };
        delete newState[postId];
        return newState;
      });
      
      // Update like count
      setPostLikes(prev => ({
        ...prev,
        [postId]: prev[postId] + (direction === "up" ? -1 : 1) // Subtract 1 if canceling upvote, add 1 if canceling downvote
      }));
    } 
    // Case: changing vote or voting for the first time
    else {
      // Update vote status
      setVotedPosts(prev => ({
        ...prev,
        [postId]: direction
      }));
      
      // Calculate and update like count
      setPostLikes(prev => {
        const currentLikes = prev[postId] || 0;
        let newLikes = currentLikes;
        
        // 1. If there was a previous vote, undo it first
        if (currentVote === "up") {
          newLikes -= 1; // Undo upvote
        } else if (currentVote === "down") {
          newLikes += 1; // Undo downvote
        }
        
        // 2. Apply the new vote
        if (direction === "up") {
          newLikes += 1; // Apply upvote
        } else {
          newLikes -= 1; // Apply downvote
        }
        
        return { ...prev, [postId]: newLikes };
      });
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <span className="text-lg font-semibold">{location.name}</span>
        </div>
      </header>
      <div className="flex-1 pb-16">
        <div className="relative h-40">
          <img
            src={location.imageUrl || "/placeholder.svg"}
            alt={location.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h1 className="text-white font-bold text-xl">{location.name}</h1>
            <div className="flex flex-wrap gap-1 mt-1">
              {location.tags && Array.isArray(location.tags) && location.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-black/30 text-white">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="container max-w-md mx-auto py-4">
          <div className="flex items-center px-4 mb-4">
            <div className="text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 inline mr-1" />
              {location.address}
            </div>
          </div>

          <Tabs defaultValue="posts" className="px-4">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
              <TabsTrigger value="map">Map</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="space-y-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-0">
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarImage src={post.user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{post.user.username}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4" onClick={() => handlePostClick(post.id)}>
                      <img
                        src={post.images && post.images.length > 0 ? post.images[0] : "/placeholder.svg"}
                        alt={post.title}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-4 space-y-2">
                        <div className="flex items-center mb-2">
                          <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-rose-500" />
                            <span className="text-lg font-semibold text-foreground">{post.location}</span>
                          </span>
                        </div>
                        {post.description && <p className="text-sm text-muted-foreground">{post.description}</p>}
                        <div className="flex flex-wrap gap-1">
                          {post.tags && Array.isArray(post.tags) && post.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${votedPosts[post.id] === "up" ? "text-green-500" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVote(post.id, "up")
                          }}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">{postLikes[post.id] !== undefined ? postLikes[post.id] : post.likes}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${votedPosts[post.id] === "down" ? "text-red-500" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVote(post.id, "down")
                          }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" 
                          onClick={(e) => handleCommentClick(post.id, e)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-muted-foreground">No posts for this location yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/create">Create First Post</Link>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="map">
              <div className="h-[300px] mb-4 overflow-hidden rounded-md">
                <LocationMapWithNoSSR
                  selectedLocation={location.name}
                  onSelectLocation={() => {}}
                />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <h3 className="font-semibold">Location Info</h3>
                <p className="text-sm text-muted-foreground">{location.description || "No description available"}</p>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {location.address}
                </div>
                <div className="text-sm text-muted-foreground">
                  Visits: {location.visitCount}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
