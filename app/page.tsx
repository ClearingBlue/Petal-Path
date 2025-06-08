"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { MapPin, Plus, PenSquare, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MapView from "@/components/map-view"
import FeedView from "@/components/feed-view"
import ProfileView from "@/components/profile-view"
import { useRouter } from "next/navigation"
import { getUserLocation } from "@/lib/services/geolocation"
import { useNotifications } from "@/components/notification-provider"

export default function Home() {
  const router = useRouter()
  const { unreadCount, clearNotifications } = useNotifications()
  const [isLocationLoaded, setIsLocationLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState("feed")

  // Get user's location on app launch
  useEffect(() => {
    let isMounted = true

    async function initializeLocation() {
      try {
        console.log("Initializing app with user location...")

        // Get user location
        await getUserLocation()

        if (isMounted) {
          setIsLocationLoaded(true)
        }
      } catch (error) {
        console.error("Error initializing location:", error)
        if (isMounted) {
          setIsLocationLoaded(true) // Continue anyway
        }
      }
    }

    initializeLocation()
    
    // 确保默认激活Feed选项卡
    setActiveTab("feed")

    return () => {
      isMounted = false
    }
  }, [])

  // Navigate to create page when create tab is clicked
  useEffect(() => {
    if (activeTab === "create") {
      router.push("/create")
    }
  }, [activeTab, router])

  const handleMessageClick = () => {
    clearNotifications()
    router.push("/message")
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <MapPin className="h-5 w-5 text-rose-500" />
            <span className="text-xl font-bold">PetalPath</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {/* Message icon with unread badge */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={handleMessageClick}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>
      <Tabs defaultValue="feed" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsContent value="map" className="flex-1 p-0 data-[state=active]:flex data-[state=active]:flex-col relative">
          {activeTab === "map" && <MapView />}
        </TabsContent>
        <TabsContent value="feed" className="flex-1 p-0 data-[state=active]:flex data-[state=active]:flex-col relative">
          {activeTab === "feed" && <FeedView />}
        </TabsContent>
        <TabsContent value="create" className="flex-1 p-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="p-4 text-center">
              <h1 className="text-2xl font-bold">Create Post</h1>
              <p className="text-muted-foreground mt-2">Redirecting to post creation page...</p>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="profile" className="flex-1 p-0 data-[state=active]:flex data-[state=active]:flex-col">
          {activeTab === "profile" && <ProfileView />}
        </TabsContent>
        <TabsList className="fixed bottom-0 left-0 right-0 h-auto min-h-16 grid w-full grid-cols-4 gap-4 border-t bg-background p-2 pb-safe">
          <TabsTrigger
            value="map"
            className="flex flex-col items-center justify-center rounded-md data-[state=active]:bg-muted"
          >
            <MapPin className="h-5 w-5" />
            <span className="text-xs">Map</span>
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="flex flex-col items-center justify-center rounded-md data-[state=active]:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
            <span className="text-xs">Feed</span>
          </TabsTrigger>
          <TabsTrigger
            value="create"
            className="flex flex-col items-center justify-center rounded-md data-[state=active]:bg-muted"
            onClick={() => router.push("/create")}
          >
            <PenSquare className="h-5 w-5" />
            <span className="text-xs">Create</span>
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="flex flex-col items-center justify-center rounded-md data-[state=active]:bg-muted"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
            <span className="text-xs">Profile</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </main>
  )
}
