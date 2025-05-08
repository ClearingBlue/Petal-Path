"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { use } from "react"
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, MapPin, MoreHorizontal, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { getPost, getCommentsByPost, getCurrentUser } from "@/lib/data"
import { deletePost, isPostAuthor } from "@/lib/data/services/post-service"
import type { Comment, User } from "@/lib/data"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { toast } from "@/components/ui/use-toast"

export default function PostDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const commentsRef = useRef<HTMLDivElement>(null)
  const unwrappedParams = use(params as any) as { id: string };
  const postId = Number.parseInt(unwrappedParams.id)
  const [post, setPost] = useState(getPost(postId))
  const [comments, setComments] = useState<Comment[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [voteStatus, setVoteStatus] = useState<"up" | "down" | null>(null)
  const [newComment, setNewComment] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null)
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set())
  const [replyTo, setReplyTo] = useState<{commentId: number, username: string} | null>(null)
  const [replyText, setReplyText] = useState("")
  const [showDeletePostAlert, setShowDeletePostAlert] = useState(false)
  const [isPostOwner, setIsPostOwner] = useState(false)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Fetch comments
    const postComments = getCommentsByPost(postId)
    setComments(postComments)

    // Set initial like count
    if (post) {
      setLikeCount(post.likes)
    }

    // Get current user
    const user = getCurrentUser()
    setCurrentUser(user)
    
    // Check if current user is post owner
    if (post && user) {
      setIsPostOwner(post.user.id === user.id)
    }

    // Check if URL has #comments anchor
    const checkForCommentsAnchor = () => {
      if (window.location.hash === '#comments') {
        // Scroll to comments section after a short delay
        const timer = setTimeout(() => {
          if (commentsRef.current) {
            commentsRef.current.scrollIntoView({ behavior: "smooth" })
          }
        }, 500)
        
        return timer;
      }
      return null;
    }
    
    // Only run in browser
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (typeof window !== 'undefined') {
      timer = checkForCommentsAnchor();
    }

    return () => {
      if (timer) clearTimeout(timer);
    }
  }, [postId, post])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
  }

  const handleAddComment = () => {
    if ((!newComment.trim() && !replyText.trim()) || !post || !currentUser) return

    // 确定是否是回复评论
    const isReply = replyTo !== null;
    const commentText = isReply ? replyText : newComment;
    
    if (!commentText.trim()) return;

    // 创建新评论对象
    const newCommentObj: Comment = {
      id: Date.now(), // 使用时间戳作为唯一ID
      postId,
      user: currentUser,
      text: commentText,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    // 如果是回复，添加父评论ID
    if (isReply) {
      newCommentObj.parentId = replyTo.commentId;
      
      // 更新父评论的回复列表
      setComments(prev => prev.map(comment => {
        if (comment.id === replyTo.commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newCommentObj.id]
          };
        }
        return comment;
      }));
    }

    // 添加新评论到列表最前面
    setComments(prev => [newCommentObj, ...prev]);
    
    // 重置输入框和回复状态
    if (isReply) {
      setReplyText("");
      setReplyTo(null);
    } else {
      setNewComment("");
    }
  }

  const handleDeleteComment = (commentId: number) => {
    setCommentToDelete(commentId)
  }

  const confirmDeleteComment = () => {
    if (commentToDelete === null) return

    setComments((prev) => prev.filter((comment) => comment.id !== commentToDelete))
    setCommentToDelete(null)
  }

  const handleLikeComment = (commentId: number) => {
    // Toggle like status
    const newLikedComments = new Set(likedComments)
    const isCurrentlyLiked = newLikedComments.has(commentId);

    if (isCurrentlyLiked) {
      newLikedComments.delete(commentId)
    } else {
      newLikedComments.add(commentId)
    }

    setLikedComments(newLikedComments)

    // Update comment like count
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          // 如果之前已点赞，现在取消，则减一；如果之前未点赞，现在点赞，则加一
          const delta = isCurrentlyLiked ? -1 : 1;
          return {
            ...comment,
            likes: comment.likes + delta,
          }
        }
        return comment
      }),
    )
  }

  const isCommentOwner = (comment: Comment) => {
    return currentUser && comment.user.id === currentUser.id
  }

  const handleVote = (direction: "up" | "down") => {
    if (!post) return;
    
    // 获取当前投票状态和点赞数
    const currentVote = voteStatus;
    
    // 取消投票的情况
    if (currentVote === direction) {
      // 取消当前投票
      setVoteStatus(null);
      
      // 更新点赞数
      setLikeCount(currentLikes => 
        direction === "up" 
          ? currentLikes - 1  // 取消上投，减1
          : currentLikes + 1  // 取消下投，加1
      );
    } 
    // 切换投票状态或首次投票
    else {
      // 更新投票状态
      setVoteStatus(direction);
      
      // 计算并更新点赞数
      setLikeCount(currentLikes => {
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
        
        return newLikes;
      });
    }
  }

  // 处理回复按钮点击
  const handleReply = (commentId: number, username: string) => {
    setReplyTo({ commentId, username });
    // 如果已经在回复其他评论，保留之前的回复文本
    if (replyTo && replyTo.commentId !== commentId) {
      setReplyText("");
    }
  }

  // 取消回复
  const cancelReply = () => {
    setReplyTo(null);
    setReplyText("");
  }
  
  // 处理删除帖子
  const handleDeletePost = () => {
    setShowDeletePostAlert(true);
  }
  
  // 确认删除帖子
  const confirmDeletePost = () => {
    if (!post) return;
    
    const success = deletePost(post.id);
    
    if (success) {
      toast({
        title: "Post deleted",
        description: "Your post has been successfully deleted",
      });
      
      // 返回到主页
      router.push("/");
    } else {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
      
      setShowDeletePostAlert(false);
    }
  }

  const handleImageError = (imageIndex: number) => {
    setImageError(prev => ({ ...prev, [`image-${imageIndex}`]: true }))
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Post not found</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Go back home
        </Button>
      </div>
    )
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
          <span className="text-lg font-semibold">Post</span>
          {isPostOwner && (
            <div className="ml-auto">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive"
                onClick={handleDeletePost}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </header>
      <div className="flex-1 pb-16">
        <div className="container max-w-md mx-auto">
          <div className="p-4 pb-0 flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={post.user.avatar || "/placeholder.svg"} />
              <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{post.user.username}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-2 gap-1">
              {post.images.map((image, index) => (
                <div key={index} className="aspect-square relative overflow-hidden">
                  <img
                    src={image || "/placeholder.svg"}
                    alt={`${post.title} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(index)}
                  />
                  {index === 0 && post.images.length > 1 && (
                    <div className="absolute top-2 right-2 bg-background/80 rounded-full px-2 py-1 text-xs">
                      +{post.images.length - 1}
                    </div>
                  )}
                  {imageError[`image-${index}`] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <span className="text-xs text-muted-foreground">Image not available</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-rose-500" />
              <span className="text-lg font-semibold text-foreground">{post.location}</span>
            </div>
            <p className="text-sm text-muted-foreground">{post.description}</p>
            <div className="flex flex-wrap gap-1 py-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Posted on {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="px-4 flex justify-between items-center border-t border-b py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 p-0 ${voteStatus === "up" ? "text-green-500" : ""}`}
                onClick={() => handleVote("up")}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{likeCount}</span>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 p-0 ${voteStatus === "down" ? "text-red-500" : ""}`}
                onClick={() => handleVote("down")}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1 h-8 px-2"
                onClick={() => {
                  if (commentsRef.current) {
                    commentsRef.current.scrollIntoView({ behavior: "smooth" })
                  }
                }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{comments.length}</span>
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div ref={commentsRef} id="comments" className="px-4 space-y-4">
            <h2 className="font-semibold text-lg">Comments ({comments.length})</h2>

            {/* 主评论输入框 */}
            {!replyTo && (
              <div className="flex items-center gap-2 pt-2 pb-4">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentUser?.avatar || "/placeholder.svg?height=32&width=32"} />
                  <AvatarFallback>{currentUser?.name.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <Input
                  placeholder="Add a comment..."
                  className="flex-1"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddComment()
                    }
                  }}
                />
                <Button size="sm" onClick={handleAddComment}>
                  Post
                </Button>
              </div>
            )}

            {/* 回复评论输入框 */}
            {replyTo && (
              <div className="pt-2 pb-4">
                <div className="flex items-center justify-between bg-muted/50 rounded-t-md px-3 py-2">
                  <div className="text-sm">
                    Reply to <span className="font-semibold">@{replyTo.username}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelReply}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </Button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border border-muted rounded-b-md">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentUser?.avatar || "/placeholder.svg?height=32&width=32"} />
                    <AvatarFallback>{currentUser?.name.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <Input
                    placeholder={`Reply to @${replyTo.username}...`}
                    className="flex-1"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddComment()
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddComment}>
                    Reply
                  </Button>
                </div>
              </div>
            )}

            {/* 评论列表 */}
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 py-3 border-b">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{comment.user.username}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </div>
                      {isCommentOwner(comment) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  
                  {/* 如果是回复，显示被回复的用户名 */}
                  {comment.parentId && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Reply to <span className="font-medium">@{
                        comments.find(c => c.id === comment.parentId)?.user.username || "user"
                      }</span>
                    </div>
                  )}
                  
                  <p className="text-sm mt-1">{comment.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 px-1 text-xs ${likedComments.has(comment.id) ? "text-rose-500" : ""}`}
                      onClick={() => handleLikeComment(comment.id)}
                    >
                      <Heart className={`h-3 w-3 mr-1 ${likedComments.has(comment.id) ? "fill-current" : ""}`} />
                      <span>{comment.likes}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-1 text-xs"
                      onClick={() => handleReply(comment.id, comment.user.username)}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Comment Alert Dialog */}
      <AlertDialog open={commentToDelete !== null} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteComment} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Post Alert Dialog */}
      <AlertDialog open={showDeletePostAlert} onOpenChange={setShowDeletePostAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}