"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle, Share2, Bookmark, MapPin, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { getPosts } from "@/lib/data"

export default function FeedView() {
  const router = useRouter()
  const posts = getPosts()
  const [votedPosts, setVotedPosts] = useState<Record<number, "up" | "down" | null>>({})
  const [postLikes, setPostLikes] = useState<Record<number, number>>({})
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    // 初始化帖子点赞数
    const initialLikes: Record<number, number> = {};
    posts.forEach(post => {
      initialLikes[post.id] = post.likes;
    });
    setPostLikes(initialLikes);
  }, [])

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`)
  }

  const handleCommentClick = (postId: number, e: React.MouseEvent) => {
    if (!isMounted) return
    e.stopPropagation()
    router.push(`/post/${postId}#comments`)
  }

  const handleVote = (postId: number, direction: "up" | "down") => {
    // 获取当前投票状态
    const currentVote = votedPosts[postId];
    
    // 取消投票的情况
    if (currentVote === direction) {
      // 取消当前投票
      setVotedPosts(prev => {
        const newState = { ...prev };
        delete newState[postId];
        return newState;
      });
      
      // 更新点赞数
      setPostLikes(prev => ({
        ...prev,
        [postId]: prev[postId] + (direction === "up" ? -1 : 1) // 取消上投减1，取消下投加1
      }));
    } 
    // 切换投票状态或首次投票
    else {
      // 更新投票状态
      setVotedPosts(prev => ({
        ...prev,
        [postId]: direction
      }));
      
      // 计算并更新点赞数
      setPostLikes(prev => {
        const currentLikes = prev[postId] || 0;
        let newLikes = currentLikes;
        
        // 1. 如果之前有投票，先撤销
        if (currentVote === "up") {
          newLikes -= 1; // 撤销上投
        } else if (currentVote === "down") {
          newLikes += 1; // 撤销下投
        }
        
        // 2. 应用新的投票
        if (direction === "up") {
          newLikes += 1; // 上投加1
        } else {
          newLikes -= 1; // 下投减1
        }
        
        return { ...prev, [postId]: newLikes };
      });
    }
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="container max-w-md mx-auto py-4 space-y-4">
        {posts.map((post) => (
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
                src={post.image || "/placeholder.svg"}
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
                  {post.tags.map((tag) => (
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
        ))}
      </div>
    </div>
  )
}
