"use client"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReportDialog } from "@/components/report-dialog"
import { fetchPosts, togglePostVote, getUserVotes, type FeedType } from '@/lib/db/posts'
import { fetchCurrentUserProfile } from '@/lib/db/profiles'
import { toggleLocationSave, getUserSavedLocations } from '@/lib/db/user-locations'
import { checkUserHasReported } from '@/lib/db/reports'

const PostCard = memo(({ 
  post, 
  onVote, 
  onComment, 
  onPostClick, 
  onImageNavigation, 
  onImageError,
  onAvatarClick,
  onLocationSave,
  userVotes,
  postScores,
  currentImageIndices,
  imageError,
  savedLocations,
  reportedPosts
}: {
  post: any;
  onVote: (postId: number, direction: "up" | "down", e: React.MouseEvent) => void;
  onComment: (postId: number, e: React.MouseEvent) => void;
  onPostClick: (postId: number) => void;
  onImageNavigation: (postId: number, direction: "prev" | "next", e: React.MouseEvent) => void;
  onImageError: (postId: number, imageIndex: number) => void;
  onAvatarClick: (userId: string) => void;
  onLocationSave: (locationId: number, e: React.MouseEvent) => void;
  userVotes: Record<number, "up" | "down" | null>;
  postScores: Record<number, number>;
  currentImageIndices: Record<number, number>;
  imageError: Record<string, boolean>;
  savedLocations: Set<number>;
  reportedPosts: Set<number>;
}) => {
  const router = useRouter();
  const currentIndex = currentImageIndices[post.id] ?? 0;

  const getLocationIdByName = (_: string): number => post.locationId ?? 0;

  // Display the current score (which is now upvotes - downvotes)
  const displayScore = postScores[post.id] !== undefined ? postScores[post.id] : post.likes;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar 
              className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onAvatarClick(post.user.id)}
            >
              <AvatarImage src={post.user.avatar} />
              <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div 
              className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onAvatarClick(post.user.id)}
            >
              <div className="font-semibold">{post.user.name}</div>
              <div className="text-xs text-muted-foreground">{post.user.username}</div>
            </div>
          </div>
          <ReportDialog 
            postId={post.id} 
            hasReported={reportedPosts.has(post.id)} 
          />
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-4" onClick={() => onPostClick(post.id)}>
        <div className="relative group" data-testid={`image-container-${post.id}`}>
          {post.images.length > 0 ? (
            <div className="aspect-square relative overflow-hidden">
              {post.images.map((image: string, index: number) => {
                const isVisible = index === currentIndex;
                
                return (
                  <div 
                    key={index} 
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`${post.title} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => onImageError(post.id, index)}
                    />
                  </div>
                );
              })}
              {post.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => onImageNavigation(post.id, "prev", e)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => onImageNavigation(post.id, "next", e)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {post.images.map((_: string, index: number) => (
                      <div
                        key={index}
                        data-testid={`image-dot-${post.id}-${index}`}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          currentIndex === index ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              {imageError[`post-${post.id}-${currentIndex}`] && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">Image not available</span>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square relative overflow-hidden bg-muted">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">No images</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span 
              className="flex items-center gap-2 cursor-pointer flex-1" 
              onClick={(e) => {
                e.stopPropagation();
                const locationId = getLocationIdByName(post.location);
                router.push(`/location/${locationId}`);
              }}
            >
              <MapPin className="h-5 w-5 text-rose-500" />
              <span className="text-lg font-semibold text-foreground">{post.location}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ml-2 ${savedLocations.has(post.locationId) ? "text-pink-500" : "text-gray-400"}`}
              onClick={(e) => onLocationSave(post.locationId, e)}
            >
              <Bookmark className={`h-4 w-4 ${savedLocations.has(post.locationId) ? "fill-current" : ""}`} />
            </Button>
          </div>
          {post.description && <p className="text-sm text-muted-foreground">{post.description}</p>}
          <div className="flex flex-wrap gap-1">
            {post.tags.map((tag: string) => (
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
            className={`h-8 w-8 p-0 ${userVotes[post.id] === "up" ? "text-green-500" : ""}`}
            onClick={(e) => onVote(post.id, "up", e)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className={`text-sm font-medium ${displayScore > 0 ? 'text-green-600' : displayScore < 0 ? 'text-red-600' : ''}`}>
            {displayScore}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${userVotes[post.id] === "down" ? "text-red-500" : ""}`}
            onClick={(e) => onVote(post.id, "down", e)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" 
            onClick={(e) => onComment(post.id, e)}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});

PostCard.displayName = 'PostCard';

export default function FeedView() {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [userVotes, setUserVotes] = useState<Record<number, "up" | "down" | null>>({})
  const [postScores, setPostScores] = useState<Record<number, number>>({})
  const [isMounted, setIsMounted] = useState(false)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [currentImageIndices, setCurrentImageIndices] = useState<Record<number, number>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [feedType, setFeedType] = useState<FeedType>('hot')
  const [isLoading, setIsLoading] = useState(false)
  const [savedLocations, setSavedLocations] = useState<Set<number>>(new Set())
  const [reportedPosts, setReportedPosts] = useState<Set<number>>(new Set())
  const lastFetchRef = useRef<{ type: FeedType; timestamp: number } | null>(null)

  // Load cached posts if available
  const loadCachedPosts = useCallback((type: FeedType): any[] | null => {
    try {
      const cacheKey = `feed_posts_${type}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const { posts, timestamp } = JSON.parse(cached)
        // Cache is valid for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return posts
        }
      }
    } catch (error) {
      console.error('Error loading cached posts:', error)
    }
    return null
  }, [])

  // Save posts to cache
  const saveCachedPosts = useCallback((type: FeedType, posts: any[]) => {
    try {
      const cacheKey = `feed_posts_${type}`
      sessionStorage.setItem(cacheKey, JSON.stringify({
        posts,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error saving posts to cache:', error)
    }
  }, [])

  const loadPosts = useCallback(async (type: FeedType, forceRefresh: boolean = false) => {
    // Check if we should use cached data
    if (!forceRefresh) {
      const cachedPosts = loadCachedPosts(type)
      if (cachedPosts) {
        setPosts(cachedPosts)
        // Still fetch fresh voting data and user info
        const postIds = cachedPosts.map(post => post.id)
        const [userVotesMap, currentUser] = await Promise.all([
          getUserVotes(postIds),
          fetchCurrentUserProfile()
        ])
        
        setCurrentUserId(currentUser?.id || null)
        
        // Update votes and scores
        const initialVotes: Record<number, "up" | "down" | null> = {}
        cachedPosts.forEach(post => {
          initialVotes[post.id] = userVotesMap.get(post.id) || null
        })
        setUserVotes(initialVotes)
        
        // Fetch saved locations
        const locationIds = cachedPosts.map(post => post.locationId).filter(Boolean)
        const savedLocationsSet = await getUserSavedLocations(locationIds)
        setSavedLocations(savedLocationsSet)
        
        return
      }
    }

    setIsLoading(true)
    try {
      const [data, currentUser] = await Promise.all([
        fetchPosts(type),
        fetchCurrentUserProfile()
      ])
      
      setPosts(data)
      setCurrentUserId(currentUser?.id || null)
      
      // Save to cache
      saveCachedPosts(type, data)
      
      // Get user votes for all posts
      const postIds = data.map(post => post.id)
      const userVotesMap = await getUserVotes(postIds)
      
      // Get user saved locations for all posts (batch operation)
      const locationIds = data.map(post => post.locationId).filter(Boolean)
      const savedLocationsSet = await getUserSavedLocations(locationIds)
      setSavedLocations(savedLocationsSet)
      
      // Skip expensive reported posts check for better performance
      // Only check when user actually tries to report a post
      setReportedPosts(new Set())
      
      // Initialize post scores and image indices
      const initialScores: Record<number, number> = {};
      const initialIndices: Record<number, number> = {};
      const initialVotes: Record<number, "up" | "down" | null> = {};
      
      data.forEach(post => {
        initialScores[post.id] = post.likes; // This is now the net score
        if (post.images.length > 0) {
          initialIndices[post.id] = 0;
        }
        // Set initial vote state based on user's votes
        initialVotes[post.id] = userVotesMap.get(post.id) || null;
      });
      
      setPostScores(initialScores);
      setCurrentImageIndices(initialIndices);
      setUserVotes(initialVotes);
      
      lastFetchRef.current = { type, timestamp: Date.now() }
    } catch (e) {
      console.error('Failed to load posts', e)
    } finally {
      setIsLoading(false)
    }
  }, [loadCachedPosts, saveCachedPosts])

  useEffect(() => {
    setIsMounted(true)
    // Check if we need to refresh
    const shouldRefresh = !lastFetchRef.current || 
                         lastFetchRef.current.type !== feedType ||
                         Date.now() - lastFetchRef.current.timestamp > 5 * 60 * 1000 // 5 minutes
    
    loadPosts(feedType, shouldRefresh)
  }, [loadPosts, feedType])

  const handleFeedTypeChange = useCallback((newFeedType: FeedType) => {
    if (newFeedType !== feedType) {
      setFeedType(newFeedType)
    }
  }, [feedType])

  const getFeedTypeLabel = (type: FeedType) => {
    switch (type) {
      case 'new': return 'New'
      case 'hot': return 'Hot'  
      case 'follow': return 'Following'
      default: return 'Hot'
    }
  }

  const handlePostClick = useCallback((postId: number) => {
    if (!isMounted) return;
    router.push(`/post/${postId}`)
  }, [isMounted, router])

  const handleCommentClick = useCallback((postId: number, e: React.MouseEvent) => {
    if (!isMounted) return;
    e.stopPropagation()
    router.push(`/post/${postId}#comments`)
  }, [isMounted, router])

  const handleVote = useCallback(async (postId: number, direction: "up" | "down", e: React.MouseEvent) => {
    if (!isMounted) return;
    e.stopPropagation();

    try {
      const { userVote, voteData } = await togglePostVote(postId, direction)

      // Update UI state
      setUserVotes(prev => ({
        ...prev,
        [postId]: userVote,
      }))
      setPostScores(prev => ({
        ...prev,
        [postId]: voteData.score,
      }))
    } catch (err) {
      console.error('Failed to toggle vote', err)
    }
  }, [isMounted])

  const handleImageNavigation = useCallback((postId: number, direction: "prev" | "next", e: React.MouseEvent) => {
    if (!isMounted) return;
    e.stopPropagation();
    
    setCurrentImageIndices(prev => {
      const post = posts.find(p => p.id === postId);
      if (!post || post.images.length <= 1) return prev;
      
      const currentIndex = prev[postId] ?? 0;
      let newIndex: number;
      
      if (direction === "prev") {
        newIndex = currentIndex === 0 ? post.images.length - 1 : currentIndex - 1;
      } else {
        newIndex = currentIndex === post.images.length - 1 ? 0 : currentIndex + 1;
      }
      
      return { ...prev, [postId]: newIndex };
    });
  }, [isMounted, posts])

  const handleImageError = useCallback((postId: number, imageIndex: number) => {
    setImageError(prev => ({
      ...prev,
      [`post-${postId}-${imageIndex}`]: true
    }));
  }, [])

  const handleAvatarClick = useCallback((userId: string) => {
    if (!isMounted) return;
    
    // If clicking on own avatar, go to profile view (main profile page)
    if (currentUserId && userId === currentUserId) {
      router.push("/profile")
    } else {
      // If clicking on other user's avatar, go to their profile page
      router.push(`/profile/${userId}`)
    }
  }, [isMounted, router, currentUserId])

  const handleLocationSave = useCallback(async (locationId: number, e: React.MouseEvent) => {
    if (!isMounted) return;
    e.stopPropagation();

    try {
      const { isSaved } = await toggleLocationSave(locationId)
      
      // Update UI state
      setSavedLocations(prev => {
        const newSet = new Set(prev)
        if (isSaved) {
          newSet.add(locationId)
        } else {
          newSet.delete(locationId)
        }
        return newSet
      })
    } catch (err) {
      console.error('Failed to toggle location save', err)
    }
  }, [isMounted])

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="container max-w-md mx-auto py-2 space-y-4">
        {/* Feed Type Selector - Tab Layout */}
        <div className="flex justify-center pt-2">
          <div className="flex bg-white dark:bg-gray-900 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleFeedTypeChange('hot')}
              className={`relative px-6 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                feedType === 'hot'
                  ? 'text-black dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Hot
              {feedType === 'hot' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-pink-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => handleFeedTypeChange('new')}
              className={`relative px-6 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                feedType === 'new'
                  ? 'text-black dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              New
              {feedType === 'new' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-pink-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => handleFeedTypeChange('follow')}
              className={`relative px-6 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                feedType === 'follow'
                  ? 'text-black dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Following
              {feedType === 'follow' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-pink-500 rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 animate-pulse"></div>
              <div className="text-pink-600 dark:text-pink-400 font-medium">Loading posts...</div>
            </div>
          </div>
        )}

        {/* Empty State for Following */}
        {!isLoading && feedType === 'follow' && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/50 dark:to-rose-900/50 flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-pink-600 dark:text-pink-400 mb-2 font-medium">No posts from people you follow</div>
            <div className="text-sm text-pink-500 dark:text-pink-500">Start following users to see their posts here!</div>
          </div>
        )}

        {/* Posts List */}
        {!isLoading && posts.map((post, postIndex) => (
          <PostCard
            key={post.id}
            post={post}
            onVote={handleVote}
            onComment={handleCommentClick}
            onPostClick={handlePostClick}
            onImageNavigation={handleImageNavigation}
            onImageError={handleImageError}
            onAvatarClick={handleAvatarClick}
            onLocationSave={handleLocationSave}
            userVotes={userVotes}
            postScores={postScores}
            currentImageIndices={currentImageIndices}
            imageError={imageError}
            savedLocations={savedLocations}
            reportedPosts={reportedPosts}
          />
        ))}
      </div>
    </div>
  )
}
