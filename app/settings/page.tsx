"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Save, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getCurrentUser } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import cache from "@/lib/cache"
import { resetAllData } from "@/lib/data/services/data-service"

export default function Settings() {
  const { toast } = useToast()
  const [user, setUser] = useState(getCurrentUser())
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [avatar, setAvatar] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Load user data from cache or fetch it
  useEffect(() => {
    const cachedUserSettings = cache.get<{
      name: string
      username: string
      bio: string
      location: string
      avatar: string
    }>("user-settings")

    if (cachedUserSettings) {
      setName(cachedUserSettings.name)
      setUsername(cachedUserSettings.username)
      setBio(cachedUserSettings.bio)
      setLocation(cachedUserSettings.location)
      setAvatar(cachedUserSettings.avatar)
    } else {
      // Initialize with current user data
      setName(user.name)
      setUsername(user.username)
      setBio("Stanford '25 | Computer Science | Coffee enthusiast | Always exploring campus")
      setLocation("Stanford, CA")
      setAvatar(user.avatar)
    }
  }, [user])

  const handleSave = () => {
    setIsSaving(true)

    // Simulate API call
    setTimeout(() => {
      // Save to cache
      cache.set(
        "user-settings",
        {
          name,
          username,
          bio,
          location,
          avatar,
        },
        // Cache for 30 days
        30 * 24 * 60 * 60 * 1000,
      )

      // Update user object in cache
      const updatedUser = {
        ...user,
        name,
        username,
        avatar,
      }

      cache.set("current-user", updatedUser)

      setIsSaving(false)
      toast({
        title: "Settings saved",
        description: "Your profile information has been updated.",
      })
    }, 1000)
  }

  const handleResetCache = () => {
    setIsResetting(true)

    // Simulate API call to reset cache
    setTimeout(() => {
      // Reset all cached data
      resetAllData()

      setIsResetting(false)
      toast({
        title: "Cache reset",
        description: "All cached data has been cleared. The app will reload fresh data.",
      })

      // Force a page reload to reinitialize data from /data
      window.location.href = "/"
    }, 1000)
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
          <span className="text-lg font-semibold">Settings</span>
          <Button className="ml-auto" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </header>
      <div className="flex-1 p-4">
        <div className="container max-w-md mx-auto space-y-6">
          <div className="flex flex-col items-center">
            <Avatar className="w-24 h-24 mb-4">
              <AvatarImage src={avatar || "/placeholder.svg?height=96&width=96"} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              Change Photo
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Your location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value="jane.doe@example.com" disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support for assistance.</p>
            </div>

            <div className="pt-6 space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResetCache}
                disabled={isResetting}
              >
                {isResetting ? (
                  "Resetting..."
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset App Cache
                  </>
                )}
              </Button>

              <Button variant="outline" className="w-full text-destructive border-destructive">
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
