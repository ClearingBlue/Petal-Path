"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, ImagePlus, X, Search, Loader2 } from "lucide-react"
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
import { createPost } from "@/lib/data/services/post-service"
import Image from "next/image"
import { locations, Location } from "@/lib/data/models/location"
import dynamic from "next/dynamic"
import { createMarkerIcon, createUserLocationIcon } from "@/lib/leaflet-utils"

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
  const [searchTerm, setSearchTerm] = useState(""); 

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 处理图像选择
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 处理图像移除
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 切换标签选择
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

  // 确认位置选择
  const confirmLocation = (location: string) => {
    setFormData(prev => ({ ...prev, location }));
    setIsLocationDialogOpen(false);
  };
  
  // 处理搜索输入
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value.toLowerCase());
  };
  
  // 过滤位置列表
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchTerm)
  );

  // 提交表单
  const handleSubmit = async () => {
    // 验证表单
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
      
      // 模拟图像上传过程，在实际应用中我们会处理实际上传
      // 演示目的，我们将直接使用预览URL
      const imageUrl = imagePreview || "";
      
      // 创建新帖子 - 从描述的前几个词生成标题
      const generatedTitle = formData.description.split(' ').slice(0, 3).join(' ') + '...';
      
      // 创建新帖子
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

      // 重定向到Feed页面
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
        {/* 照片上传区域 */}
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
          {/* 描述 */}
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

          {/* 标签 */}
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

          {/* 位置 */}
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

      {/* 位置选择对话框 */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          
          {/* 地图组件 */}
          {isLocationDialogOpen && (
            <LocationMapWithNoSSR
              selectedLocation={formData.location}
              onSelectLocation={confirmLocation}
            />
          )}
          
          <div className="space-y-2 mt-4">
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
            
            <div className="mt-2 h-[200px] overflow-y-auto space-y-1">
              {filteredLocations.length > 0 ? (
                filteredLocations.map(location => (
                  <Button 
                    key={location.id}
                    variant={formData.location === location.name ? "default" : "outline"} 
                    className="w-full justify-start" 
                    onClick={() => confirmLocation(location.name)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{location.name}</span>
                  </Button>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No locations found
                </div>
              )}
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
