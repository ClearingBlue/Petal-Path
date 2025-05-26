"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Save, RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { fetchCurrentUserProfile, updateProfile, uploadAvatar, checkUsernameAvailable, type Profile } from "@/lib/db/profiles"
import { createSupabaseClient } from "@/lib/supabase"

export default function Settings() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [avatar, setAvatar] = useState("")
  const [email, setEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [usernameError, setUsernameError] = useState("")

  // Load user profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const userProfile = await fetchCurrentUserProfile()
        if (userProfile) {
          setProfile(userProfile)
          setName(userProfile.full_name || "")
          setUsername(userProfile.username || "")
          setBio(userProfile.bio || "")
          setLocation(userProfile.location || "")
          setAvatar(userProfile.avatar_url || "")
        }
        
        // Get email from auth
        const supabase = createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setEmail(user.email || "")
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive"
        })
      }
    }

    loadProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    
    setIsSaving(true)
    setUsernameError("")

    try {
      // Check username availability if it changed
      if (username !== profile.username) {
        const isAvailable = await checkUsernameAvailable(username, profile.id)
        if (!isAvailable) {
          setUsernameError("Username is already taken")
          setIsSaving(false)
          return
        }
      }

      // Update profile
      await updateProfile(profile.id, {
        full_name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        location: location || undefined,
      })

      toast({
        title: "Settings saved",
        description: "Your profile information has been updated.",
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "Failed to save profile changes.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    setIsUploading(true)
    try {
      const avatarUrl = await uploadAvatar(profile.id, file)
      setAvatar(avatarUrl)
      
      // Update profile with new avatar
      await updateProfile(profile.id, { avatar_url: avatarUrl })
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Error",
        description: "Failed to upload avatar.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createSupabaseClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
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
              <AvatarFallback>{name.charAt(0) || username.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                "Uploading..."
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Change Photo
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
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
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
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
              <Input id="email" type="email" value={email} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support for assistance.</p>
            </div>

            <div className="pt-6 space-y-3">
              <Button 
                variant="outline" 
                className="w-full text-destructive border-destructive"
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
