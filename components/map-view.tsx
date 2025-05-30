"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { filterLocationsByRadius, fetchLocations } from "@/lib/db/locations"
import type { ExtendedLocation as Location } from "@/lib/data/models/location"
import { createMarkerIcon, createUserLocationIcon } from "@/lib/leaflet-utils"
import dynamic from "next/dynamic"
import { fetchUserSavedLocations, fetchUserVisitedLocations } from '@/lib/db/user-locations'
import { fetchTopPostsByLocation } from '@/lib/db/posts'
import type { Post } from "@/lib/db/posts"
import { fetchCurrentUserProfile } from '@/lib/db/profiles'

// Define a type for the map content props
interface MapContentProps {
  userLocation: { lat: number; lng: number }
  locations: any[]
  selectedLocation: number | null
  onSelectLocation: (id: number) => void
}

// Dynamically import all Leaflet components with no SSR
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const MapContentComponent = dynamic<MapContentProps>(() => import("./map-content").then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
});

// Create a wrapped map component that includes all children to avoid mounting issues
const Map = dynamic(
  () =>
    import("react").then((mod) => {
      const React = mod;
      
      function MapComponent({ center, zoom, children }: {
        center: [number, number],
        zoom: number,
        children: React.ReactNode
      }) {
        return (
          <>
            <LeafletCssLoader />
            <MapContainer
              center={center}
              zoom={zoom}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              {children}
            </MapContainer>
          </>
        );
      }
      
      return MapComponent;
    }),
  { ssr: false }
);

// Import the Leaflet CSS directly in client components
function LeafletCssLoader() {
  useEffect(() => {
    // Exit if not in browser
    if (typeof window === 'undefined' || !document || !document.head) return;

    try {
      // Check if Leaflet CSS is already loaded
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }
    } catch (error) {
      console.error("Failed to load Leaflet CSS:", error);
    }

    return () => {
      // No cleanup needed, as we don't want to remove the CSS if other components are using it
    };
  }, []);

  return null;
}

// Add static CSS for the map layout instead of dynamic injection
// This avoids the "Cannot read properties of undefined (reading 'appendChild')" error
const mapStyles = `
.leaflet-container {
  height: 100%;
  width: 100%;
}
#map-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 64px; /* Leave space for the bottom navigation */
  z-index: 1;
  height: auto;
  width: 100%;
}
#main-map-container {
  height: calc(100vh - 64px); /* Reduce height to accommodate bottom nav */
  width: 100%;
  position: relative;
  overflow: hidden;
}
`;

export default function MapView() {
  const router = useRouter()
  const [userLocation, setUserLocation] = useState({ lat: 37.4275, lng: -122.1697 })
  const [locations, setLocations] = useState<Location[]>([])
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [topPosts, setTopPosts] = useState<Post[]>([])
  const [filterDistance, setFilterDistance] = useState([500])
  const [filterVisited, setFilterVisited] = useState(false)
  const [visitedLocationIds, setVisitedLocationIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isBrowser, setIsBrowser] = useState(false)
  const containerId = "map-container"
  const styleElementRef = useRef<HTMLStyleElement | null>(null);
  const cssLinkRef = useRef<HTMLLinkElement | null>(null);

  // 在组件挂载时设置客户端状态
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Stanford University coordinates
  const stanfordCoordinates = { lat: 37.4275, lng: -122.1697 }

  // Check if we're in browser environment
  useEffect(() => {
    // Set browser flag
    setIsBrowser(true);
    setIsMapReady(true);

    // Add map-specific styles
    if (typeof window !== 'undefined' && document && document.head) {
      try {
        // Add styles from our static CSS variable
        const style = document.createElement('style');
        style.textContent = mapStyles;
        document.head.appendChild(style);
        styleElementRef.current = style;
      } catch (error) {
        console.error("Error adding map styles:", error);
      }
    }

    return () => {
      // Clean up map-specific styles
      if (typeof window !== 'undefined' && document) {
        try {
          // Remove our style element
          if (styleElementRef.current && styleElementRef.current.parentNode) {
            styleElementRef.current.parentNode.removeChild(styleElementRef.current);
          }
        } catch (error) {
          console.error("Error cleaning up styles:", error);
        }
      }
    };
  }, []);

  // Initialize with Stanford locations 
  useEffect(() => {
    if (!isBrowser) return

    let active = true

    async function load() {
      try {
        setIsLoading(true)
        const locs = await fetchLocations()
        if (!active) return
        setAllLocations(locs)
        
        // Load user's visited locations
        try {
          const currentUser = await fetchCurrentUserProfile()
          if (currentUser) {
            const visitedLocs = await fetchUserVisitedLocations(currentUser.id)
            setVisitedLocationIds(new Set(visitedLocs.map(loc => loc.id)))
          }
        } catch (error) {
          console.error('Failed to load visited locations:', error)
        }
        
        const filtered = applyFilters(locs, filterDistance[0], filterVisited, visitedLocationIds)
        setLocations(filtered)
      } catch (err) {
        console.error('Failed to load locations', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [isBrowser])

  // Helper function to apply all filters
  const applyFilters = (
    locs: Location[], 
    distance: number, 
    hideVisited: boolean, 
    visitedIds: Set<number>
  ): Location[] => {
    let filtered = locs
    
    // Only apply distance filter if not at maximum (infinity)
    if (distance < 1000) {
      filtered = filterLocationsByRadius(locs, stanfordCoordinates.lat, stanfordCoordinates.lng, distance)
    }
    
    if (hideVisited) {
      filtered = filtered.filter(loc => !visitedIds.has(loc.id))
    }
    
    return filtered
  }

  // effect when filterDistance or filterVisited changes
  useEffect(() => {
    if (!isBrowser) return
    const filtered = applyFilters(allLocations, filterDistance[0], filterVisited, visitedLocationIds)
    setLocations(filtered)
  }, [filterDistance, filterVisited, allLocations, visitedLocationIds, isBrowser])

  // Fetch top posts when a location is selected
  useEffect(() => {
    if (!selectedLocation) {
      setTopPosts([])
      return
    }

    async function loadTopPosts() {
      try {
        const posts = await fetchTopPostsByLocation(selectedLocation!, 2)
        setTopPosts(posts)
      } catch (error) {
        console.error('Failed to load top posts:', error)
        setTopPosts([])
      }
    }

    loadTopPosts()
  }, [selectedLocation])

  const handleLocationClick = (id: number) => {
    setSelectedLocation(id)
  }

  const selectedLocationData = locations.find((loc: Location) => loc.id === selectedLocation)

  const handleViewPosts = (locationId: number) => {
    router.push(`/location/${locationId}`)
  }

  // 创建一个基础结构，确保服务器和客户端使用相同的布局
  const renderBaseContainer = () => (
    <div className="bg-muted" id={containerId}>
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </div>
  );

  // 如果在服务器端，就返回基础结构
  if (typeof window === 'undefined') {
    return renderBaseContainer();
  }

  return (
    <div className="bg-muted" id={containerId}>
      {!isClient ? (
        <div className="h-full w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Search and filter controls */}
          <div className="absolute top-4 left-4 right-16 z-20 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 pr-3" placeholder="Search locations..." />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter</SheetTitle>
                  <SheetDescription>Customize your map view</SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Distance</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs">100m</span>
                        <span className="text-xs">
                          {filterDistance[0] >= 1000 ? '∞' : `${filterDistance[0]}m`}
                        </span>
                        <span className="text-xs">∞</span>
                      </div>
                      <Slider
                        defaultValue={[500]}
                        min={100}
                        max={1000}
                        step={100}
                        value={filterDistance}
                        onValueChange={setFilterDistance}
                      />
                      <div className="text-xs text-muted-foreground">
                        Set to maximum (1km) for unlimited distance
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Visited</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="visited" 
                          checked={filterVisited} 
                          onCheckedChange={(checked) => setFilterVisited(checked === true)} 
                        />
                        <Label htmlFor="visited">Hide visited locations</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Map container */}
          <div id="map-wrapper">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading map...</span>
                </div>
              </div>
            ) : isBrowser && isMapReady ? (
              <div className="h-full w-full" id="map">
                <Map
                  center={[userLocation.lat, userLocation.lng]}
                  zoom={15}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />

                  {/* All map interactions in a separate component */}
                  <MapContentComponent
                    userLocation={userLocation}
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onSelectLocation={handleLocationClick}
                  />
                </Map>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Selected location details */}
          {selectedLocation && selectedLocationData && (
            <Dialog>
              <DialogTrigger asChild>
                <Card className="absolute bottom-20 left-4 right-4 overflow-hidden cursor-pointer z-30">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={selectedLocationData.imageUrl}
                        alt={selectedLocationData.name}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <h3 className="text-white font-semibold">{selectedLocationData.name}</h3>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="secondary" className="bg-black/30 text-white text-xs">
                            #{selectedLocationData.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{selectedLocationData.name}</DialogTitle>
                  <DialogDescription>{selectedLocationData.visitCount} visits</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <img
                    src={selectedLocationData.imageUrl}
                    alt={selectedLocationData.name}
                    className="w-full aspect-video object-cover rounded-md"
                  />
                  <div className="flex gap-1">
                    <Badge variant="secondary">
                      #{selectedLocationData.category}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    {topPosts.length > 0 ? (
                      topPosts.map((post, index) => (
                        <div key={post.id} className={`flex items-start gap-3 ${index < topPosts.length - 1 ? 'border-b pb-4' : ''}`}>
                          <Avatar>
                            <AvatarImage src={post.user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{post.user.name.charAt(0) || post.user.username.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{post.user.username}</div>
                            <p className="text-sm text-muted-foreground">
                              {post.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        <p>No posts yet for this location</p>
                      </div>
                    )}
                  </div>
                  <Button className="w-full" onClick={() => handleViewPosts(selectedLocation)}>
                    View All Posts
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  )
}
