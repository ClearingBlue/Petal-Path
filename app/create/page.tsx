"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, ImagePlus, X } from "lucide-react"
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { createPost } from "@/lib/data/services/post-service"
import Image from "next/image"
import { locations } from "@/lib/data/models/location"

// Preset tags list
const PRESET_TAGS = [
  "Study Room", "Dining Hall", "Library", "Cafe", "Scenery", "Outdoor", "Quiet", "Crowded",
  "Academic", "Sports", "Events", "Arts", "Hidden Spot", "Dorms", "Entertainment"
];

export default function CreatePost() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    description: "",
    location: "",
    tags: [] as string[]
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
  const confirmLocation = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
    setIsLocationDialogOpen(false);
  };

  // Submit form
  const handleSubmit = async () => {
    // Validate form
    if (!formData.description.trim()) {
      toast({
        title: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: "Please add a photo",
        variant: "destructive",
      });
      return;
    }

    if (!formData.location) {
      toast({
        title: "Please select a location",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Mock image upload process, in a real app we would handle actual uploads
      // For demo purposes, we'll use the preview URL directly
      const imageUrl = imagePreview || "";
      
      // Create new post - generate a title from the first few words of description
      const generatedTitle = formData.description.split(' ').slice(0, 3).join(' ') + '...';
      
      // Create new post
      await createPost({
        title: generatedTitle,
        content: formData.description,
        location: formData.location,
        tags: formData.tags,
        imageUrl
      });
      
      toast({
        title: "Post successful",
        description: "Your post has been published",
      });

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
      <div className="flex-1 p-4 space-y-6 max-w-2xl mx-auto w-full">
        {/* Photo upload area */}
        <div 
          className="aspect-square bg-muted rounded-md relative overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
        >
          {imagePreview ? (
            <>
              <Image 
                src={imagePreview} 
                alt="Post preview" 
                fill 
                className="object-cover"
              />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-2 right-2 rounded-full opacity-90"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full cursor-pointer">
              <ImagePlus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Click to add a photo</p>
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageChange}
          />
        </div>

        <div className="space-y-4">
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
      </div>

      {/* Location selection dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          <div className="h-[300px] bg-muted rounded-md mb-4 flex items-center justify-center">
            <p className="text-muted-foreground">Map should display here</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationSearch">Search Location</Label>
            <Input id="locationSearch" placeholder="Search..." />
            <div className="mt-2 space-y-2">
              {locations.map(location => (
                <Button 
                  key={location.id}
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => confirmLocation(location.name)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{location.name}</span>
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsLocationDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
