"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, ImagePlus, X, Search, Loader2, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"
import { createPost } from '@/lib/db/posts'
import { fetchLocations } from '@/lib/db/locations'
import type { ExtendedLocation } from '@/lib/data/models/location'
import dynamic from "next/dynamic"
import { useSession } from '@supabase/auth-helpers-react'

// Preset tags list
const PRESET_TAGS = [
  "Study Room", "Dining Hall", "Library", "Cafe", "Scenery", "Outdoor", "Quiet", "Crowded",
  "Academic", "Sports", "Events", "Arts", "Hidden Spot", "Dorms", "Entertainment"
];

// Map component with no SSR
const LocationMapWithNoSSR = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-muted rounded-md flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

function dataURLtoFile(dataUrl: string, fileName: string): File {
  const arr = dataUrl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(arr[arr.length - 1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], fileName, { type: mime })
}

export default function CreatePost() {
  const router = useRouter();
  const session = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    tags: [] as string[]
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationsList, setLocationsList] = useState<ExtendedLocation[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (session === null) {
      router.push('/login')
    }
  }, [session, router])

  // Show loading while checking session
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Redirect if not authenticated (this will trigger the useEffect above)
  if (session === null) {
    return null
  }

  // load locations on mount
  useEffect(() => {
    async function loadLocs() {
      try {
        const data = await fetchLocations()
        setLocationsList(data)
      } catch (e) {
        console.error('Failed to load locations', e)
      }
    }
    loadLocs()
  }, [])

  // restore draft from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem('post-draft')
    if (!raw) return
    try {
      const draft = JSON.parse(raw)
      setFormData({
        description: draft.description ?? '',
        location: draft.location ?? '',
        tags: draft.tags ?? [],
      })
      setSelectedLocationId(draft.locationId ?? null)
      if (Array.isArray(draft.previews)) {
        setImagePreviews(draft.previews)
        const files = draft.previews.map((url: string, idx: number) => dataURLtoFile(url, `draft-${idx}.png`))
        setImageFiles(files)
      }
    } catch {
      /* ignore */
    }
  }, [])

  // persist draft on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft = {
      description: formData.description,
      location: formData.location,
      locationId: selectedLocationId,
      tags: formData.tags,
    }
    try {
      localStorage.setItem('post-draft', JSON.stringify(draft))
    } catch {
      // quota exceeded – ignore silently
    }
  }, [formData, selectedLocationId, imagePreviews])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Error",
        description: "Please select only image files",
        variant: "destructive",
      });
      return;
    }

    // Limit to 5 images
    const remainingSlots = 5 - imageFiles.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Error",
        description: "You can upload up to 5 images",
        variant: "destructive",
      });
      return;
    }

    // Only take the first N files that fit within the limit
    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast({
        title: "Notice",
        description: `Only the first ${remainingSlots} image${remainingSlots > 1 ? 's' : ''} will be added`,
      });
    }

    setImageFiles(prev => [...prev, ...filesToAdd]);
    
    // Create previews
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setFormData(prev => {
      const tags = [...prev.tags];
      const tagIndex = tags.indexOf(tag);
      
      if (tagIndex >= 0) {
        tags.splice(tagIndex, 1);
      } else {
        tags.push(tag);
      }
      
      return { ...prev, tags };
    });
  };

  // Confirm location selection
  const confirmLocation = (locationName: string) => {
    const loc = locationsList.find((l) => l.name === locationName)
    if (!loc) return
    setFormData(prev => ({ ...prev, location: locationName }));
    setSelectedLocationId(loc.id)
    setIsLocationDialogOpen(false);
  };
  
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };
  
  // Filter locations list
  const filteredLocations = locationsList.filter((loc) =>
    loc.name.toLowerCase().includes(searchTerm)
  )

  // Submit form
  const handleSubmit = async () => {
    // Check authentication
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a post",
        variant: "destructive",
      });
      router.push('/login');
      return;
    }

    // Validate form
    if (!formData.description.trim()) {
      toast({
        title: "Description required",
        description: "Please add a description to your post",
        variant: "destructive",
      });
      return;
    }

    if (!selectedLocationId) {
      toast({
        title: "Location required", 
        description: "Please select a location for your post",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload images and get URLs
      const imageUrls: string[] = []
      
      for (const file of imageFiles) {
        try {
          // Create a data URL from the file for now
          // In a real app, you would upload to your storage service here
          const reader = new FileReader()
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
          imageUrls.push(dataUrl)
        } catch (uploadError) {
          console.error('Failed to process image:', uploadError)
          // Continue with other images even if one fails
        }
      }
      
      // Create new post - generate title from first few words of description
      const generatedTitle = formData.description.split(' ').slice(0, 3).join(' ') + '...';
      
      if (!selectedLocationId) {
        toast({ title: 'Please select a valid location', variant: 'destructive' })
        return
      }

      await createPost({
        title: generatedTitle,
        description: formData.description,
        locationId: selectedLocationId,
        tags: formData.tags,
        images: imageUrls,
      })
      
      toast({
        title: "Post successful",
        description: "Your post has been published",
      });

      if (typeof window !== 'undefined') localStorage.removeItem('post-draft')

      // Redirect to Feed page
      router.push("/");
      
    } catch (error) {
      console.error("Posting failed:", error);
      toast({
        title: "Posting failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <span className="text-lg font-semibold">Create Post</span>
          <Button 
            className="ml-auto" 
            size="sm" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </header>
      
      <div className="container max-w-md mx-auto p-4 space-y-4">
        {/* Photo upload area */}
        <div className="space-y-2">
          <Label>Photos (up to 5)</Label>
          <div className="grid grid-cols-2 gap-2">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="aspect-square bg-muted rounded-md relative overflow-hidden group">
                <Image 
                  src={preview} 
                  alt={`Preview ${index + 1}`} 
                  fill 
                  className="object-cover"
                />
                <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {imagePreviews.length < 5 && (
              <div 
                className="aspect-square bg-muted rounded-md relative overflow-hidden cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <ImagePlus className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Add photo</p>
                </div>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            multiple
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageChange}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a description..." 
            className="min-h-[100px]" 
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map(tag => (
              <Badge 
                key={tag}
                variant={formData.tags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="location" 
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Select a location" 
              readOnly
              className="cursor-pointer"
              onClick={() => setIsLocationDialogOpen(true)}
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsLocationDialogOpen(true)}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Location selection dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 pr-1 -mr-1">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="locationSearch" 
                  placeholder="Search location..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              
              {/* Map */}
              <div className="w-full h-[30vh] sm:h-[300px]">
                {isLocationDialogOpen && (
                  <LocationMapWithNoSSR
                    selectedLocation={formData.location}
                    onSelectLocation={confirmLocation}
                  />
                )}
              </div>
              
              {/* Location list */}
              <div className="space-y-2">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <Button
                      key={location.id}
                      variant={formData.location === location.name ? 'default' : 'outline'}
                      className="w-full justify-start text-left"
                      onClick={() => confirmLocation(location.name)}
                    >
                      <MapPin className="h-4 w-4 min-w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{location.name}</span>
                    </Button>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground">No results for "{searchTerm}"</p>
                  </div>
                )}
              </div>

              {/* Create new location action */}
              <div className="flex justify-center pt-4">
                <Button variant="outline" className="w-full" onClick={() => {
                  setIsLocationDialogOpen(false)
                  router.push('/create/location')
                }}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Location
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end mt-4">
            <Button variant="secondary" onClick={() => setIsLocationDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
