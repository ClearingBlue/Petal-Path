"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import React from "react"
import { ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { getLocation, getPostsByLocation } from "@/lib/data"
import type { Location } from "@/lib/data/models/location"

// 扩展 Location 类型以包含缺少的属性
interface ExtendedLocation extends Location {
  preview?: string;
  tags: string[];
}

export default function LocationFeed({ params }: { params: { id: string } }) {
  const router = useRouter()
  const unwrappedParams = React.use(params as any) as { id: string };
  const locationId = Number.parseInt(unwrappedParams.id)
  const location = getLocation(locationId) as ExtendedLocation;
  const posts = getPostsByLocation(locationId)

  if (!location) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Location not found</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Go back home
        </Button>
      </div>
    )
  }

  const handlePostClick = (postId: number) => {
    router.push(`/post/${postId}`)
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
            src={location.preview || "/placeholder.svg"}
            alt={location.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <h1 className="text-white font-bold text-xl">{location.name}</h1>
            <div className="flex flex-wrap gap-1 mt-1">
              {location.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-black/30 text-white">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="container max-w-md mx-auto py-4">
          <div className="flex items-center justify-between px-4 mb-4">
            <div className="text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 inline mr-1" />
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </div>
            <div className="font-semibold">{posts.length} posts</div>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden" onClick={() => handlePostClick(post.id)}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center space-y-0">
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
                <CardContent className="p-0 pt-4">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">{post.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div>{post.likes} likes</div>
                    <div>{post.comments} comments</div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
