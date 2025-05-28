"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { useRouter } from "next/navigation"
import { MessageCircle, MapPin, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { fetchPosts, togglePostVote, getUserVotes } from '@/lib/db/posts'
import { fetchCurrentUserProfile } from '@/lib/db/profiles'

const PostCard = memo(({ 
  post, 
  onVote, 
  onComment, 
  onPostClick, 
  onImageNavigation, 
  onImageError,
  onAvatarClick,
  userVotes,
  postScores,
  currentImageIndices,
  imageError 
}: {
  post: any;
  onVote: (postId: number, direction: "up" | "down", e: React.MouseEvent) => void;
  onComment: (postId: number, e: React.MouseEvent) => void;
  onPostClick: (postId: number) => void;
  onImageNavigation: (postId: number, direction: "prev" | "next", e: React.MouseEvent) => void;
  onImageError: (postId: number, imageIndex: number) => void;
  onAvatarClick: (userId: string) => void;
  userVotes: Record<number, "up" | "down" | null>;
  postScores: Record<number, number>;
  currentImageIndices: Record<number, number>;
  imageError: Record<string, boolean>;
}) => {
  const router = useRouter();
  const currentIndex = currentImageIndices[post.id] ?? 0;

  const getLocationIdByName = (_: string): number => post.locationId ?? 0;

  // Display the current score (which is now upvotes - downvotes)
  const displayScore = postScores[post.id] !== undefined ? postScores[post.id] : post.likes;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => onImageNavigation(post.id, "prev", e)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
          <div className="flex items-center mb-2">
            <span 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                const locationId = getLocationIdByName(post.location);
                router.push(`/location/${locationId}`);
              }}
            >
              <MapPin className="h-5 w-5 text-rose-500" />
              <span className="text-lg font-semibold text-foreground">{post.location}</span>
            </span>
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

  useEffect(() => {
    setIsMounted(true)
    async function load() {
      try {
        const [data, currentUser] = await Promise.all([
          fetchPosts(),
          fetchCurrentUserProfile()
        ])
        
        setPosts(data)
        setCurrentUserId(currentUser?.id || null)
        
        // Get user votes for all posts
        const postIds = data.map(post => post.id)
        const userVotesMap = await getUserVotes(postIds)
        
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
      } catch (e) {
        console.error('Failed to load posts', e)
      }
    }
    load()
  }, [])

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

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="container max-w-md mx-auto py-4 space-y-4">
        {posts.map((post, postIndex) => (
          <PostCard
            key={post.id}
            post={post}
            onVote={handleVote}
            onComment={handleCommentClick}
            onPostClick={handlePostClick}
            onImageNavigation={handleImageNavigation}
            onImageError={handleImageError}
            onAvatarClick={handleAvatarClick}
            userVotes={userVotes}
            postScores={postScores}
            currentImageIndices={currentImageIndices}
            imageError={imageError}
          />
        ))}
      </div>
    </div>
  )
}
