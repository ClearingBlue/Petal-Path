"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import dynamic from "next/dynamic"

// Dynamic import to avoid SSR issues
const CreateLocationMapWithNoSSR = dynamic(
  () => import("@/components/create-location-map"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-muted rounded-md flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    ),
  }
)

export default function CreateLocationPage() {
  const router = useRouter()
  const [locationCreated, setLocationCreated] = useState(false)

  // Listen for location creation completion and go back
  useEffect(() => {
    if (locationCreated) {
      toast({
        title: "Location created",
        description: "You can now select this location when creating posts",
      })
      
      // Go back to previous page
      router.back()
    }
  }, [locationCreated, router])

  // Handle location creation completion
  const handleLocationCreated = (locationName: string) => {
    setLocationCreated(true)
  }

  return (
    <main className="flex min-h-screen flex-col pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href="/create">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <span className="text-lg font-semibold">Create New Location</span>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6 max-w-2xl mx-auto w-full">
        <div className="flex items-start gap-3">
          <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Add a Custom Location</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Enter a name for your location</p>
              <p>• Add the location address</p>
              <p>• Tap on the map to add a pin</p>
            </div>
          </div>
        </div>

        <CreateLocationMapWithNoSSR onLocationCreated={handleLocationCreated} />
      </div>
    </main>
  )
} 