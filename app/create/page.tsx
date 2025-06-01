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
import { createSupabaseClient } from '@/lib/supabase'
import { heicTo } from 'heic-to'

// Preset tags list
const PRESET_TAGS = [
  "Study Room", "Dining Hall", "Library", "Cafe", "Scenery", "Outdoor", "Quiet", "Crowded",
  "Academic", "Sports", "Events", "Arts", "Hidden Spot", "Dorms", "Entertainment"
];

// Map component with no SSR
const LocationMapWithNoSSR = dynamic(() => import("@/components/location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[180px] bg-muted rounded-md flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

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
        const data = await fetchLocations() // Use fast path for performance
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
      // Don't restore images - they were base64 and too large
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
      // Don't save image previews - they're too large for localStorage
      imageCount: imagePreviews.length
    }
    try {
      localStorage.setItem('post-draft', JSON.stringify(draft))
    } catch {
      // quota exceeded – ignore silently
    }
  }, [formData, selectedLocationId, imagePreviews.length])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle image selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check file types - allow standard images and HEIC
    const acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter(file => {
      const isStandardImage = acceptedFormats.includes(file.type.toLowerCase());
      const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      return !isStandardImage && !isHeic;
    });
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Format",
        description: "Please select only JPEG, PNG, GIF, WebP, or HEIC images",
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

    // Process each file
    const processedFiles: File[] = [];
    const previews: string[] = [];

    for (const file of filesToAdd) {
      try {
        // Check file size (optional - add a reasonable limit)
        const maxSizeInMB = 20;
        if (file.size > maxSizeInMB * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than ${maxSizeInMB}MB. Please use a smaller image.`,
            variant: "destructive",
          });
          continue;
        }
        
        // Check if file is HEIC and convert it
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
        let processedFile: File = file;
        
        if (isHeic) {
          try {
            // Show conversion toast
            toast({
              title: "Converting HEIC image...",
              description: "Please wait while we process your image",
            });
            
            // Convert HEIC to JPEG using heic-to
            const jpegBlob = await heicTo({
              blob: file,
              type: "image/jpeg",
              quality: 0.9
            });
            
            // Create a new File object with JPEG extension
            const jpegFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
            processedFile = new File([jpegBlob], jpegFileName, { type: 'image/jpeg' });
            
            toast({
              title: "Conversion successful",
              description: "HEIC image has been converted to JPEG",
            });
          } catch (conversionError) {
            console.error('HEIC conversion failed:', conversionError);
            toast({
              title: "HEIC Conversion Failed",
              description: `Unable to convert ${file.name}. Please convert it to JPEG/PNG manually.`,
              variant: "destructive",
            });
            continue;
          }
        }
        
        processedFiles.push(processedFile);
        
        // Create preview
        const reader = new FileReader();
        const preview = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(processedFile);
        });
        previews.push(preview);
        
      } catch (error) {
        console.error('Error processing file:', error);
        toast({
          title: "Error",
          description: `Failed to process image: ${file.name}`,
          variant: "destructive",
        });
      }
    }

    // Update state with processed files and previews
    setImageFiles(prev => [...prev, ...processedFiles]);
    setImagePreviews(prev => [...prev, ...previews]);

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
    setSearchTerm(e.target.value);
  };
  
  // Filter locations list with improved partial matching
  const filteredLocations = locationsList.filter((loc) => {
    const search = searchTerm.toLowerCase();
    const locationName = loc.name.toLowerCase();
    
    // Support multiple search strategies:
    // 1. Exact substring match (current behavior)
    if (locationName.includes(search)) return true;
    
    // 2. Match if search terms are found as word beginnings
    const searchWords = search.split(' ').filter(word => word.length > 0);
    const locationWords = locationName.split(' ');
    
    // Check if all search words match the beginning of any location words
    return searchWords.every(searchWord => 
      locationWords.some(locationWord => locationWord.startsWith(searchWord))
    );
  });

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

    if (imageFiles.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one image for your post",
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
      // Upload images to Supabase Storage and get URLs
      const imageUrls: string[] = []
      const supabase = createSupabaseClient()
      const user = (await supabase.auth.getUser()).data.user
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Create a unique folder for this post
      const timestamp = Date.now()
      const postFolder = `${user.id}/${timestamp}`
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${i}.${fileExt}`
        const filePath = `${postFolder}/${fileName}`
        
        try {
          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (uploadError) {
            console.error('Failed to upload image:', uploadError)
            toast({
              title: "Upload failed",
              description: `Failed to upload image ${i + 1}: ${uploadError.message}`,
              variant: "destructive",
            })
            continue
          }
          
          // Get public URL for the final file
          const { data } = supabase.storage
            .from('posts')
            .getPublicUrl(filePath)
          
          imageUrls.push(data.publicUrl)
        } catch (uploadError) {
          console.error('Failed to upload image:', uploadError)
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

      // Redirect to Feed page with new tab selected
      router.push("/?tab=new");
      
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
            disabled={isSubmitting || imageFiles.length === 0}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </div>
      </header>
      
      <div className="container max-w-md mx-auto p-4 space-y-4">
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

        {/* Photo upload area */}
        <div className="space-y-2">
          <Label>Photos (up to 5) <span className="text-red-500">*</span></Label>
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
                className={`aspect-square bg-muted rounded-md relative overflow-hidden cursor-pointer border-2 border-dashed ${
                  imageFiles.length === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                } hover:border-gray-400 transition-colors`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <ImagePlus className={`h-12 w-12 mb-2 ${imageFiles.length === 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
                  <p className={`${imageFiles.length === 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {imageFiles.length === 0 ? 'Add photo (required)' : 'Add photo'}
                  </p>
                </div>
              </div>
            )}
          </div>
          <input 
            type="file" 
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,.heic,.heif" 
            multiple
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageChange}
          />
          {imageFiles.length === 0 && (
            <p className="text-sm text-red-500">At least one image is required to create a post</p>
          )}
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
      </div>

      {/* Location selection dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-2">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="locationSearch" 
                  placeholder="Search location..." 
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              
              {/* Map - Made more compact */}
              <div className="w-full h-[20vh] sm:h-[180px] mb-3 rounded-md overflow-hidden">
                {isLocationDialogOpen && (
                  <LocationMapWithNoSSR
                    selectedLocation={formData.location}
                    onSelectLocation={confirmLocation}
                  />
                )}
              </div>
              </div>
              
            {/* Scrollable location list - Now has more space */}
            <div className="flex-1 overflow-y-auto px-4 pb-3 min-h-0">
              <div className="space-y-1.5">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((location) => (
                    <Button
                      key={location.id}
                      variant={formData.location === location.name ? 'default' : 'outline'}
                      className="w-full justify-start text-left h-9"
                      onClick={() => confirmLocation(location.name)}
                    >
                      <MapPin className="h-4 w-4 min-w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{location.name}</span>
                    </Button>
                  ))
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-muted-foreground text-sm">No results for "{searchTerm}"</p>
                  </div>
                )}
              </div>
              </div>

            {/* Fixed create location button */}
            <div className="border-t bg-background p-3">
              <Button variant="outline" className="w-full h-9" onClick={() => {
                  setIsLocationDialogOpen(false)
                  router.push('/create/location')
                }}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Location
                </Button>
            </div>
          </div>
          
          <DialogFooter className="p-4 pt-0">
            <Button variant="secondary" size="sm" onClick={() => setIsLocationDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
