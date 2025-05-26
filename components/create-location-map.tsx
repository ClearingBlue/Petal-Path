"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin, PlusCircle } from "lucide-react"
import { createMarkerIcon } from "@/lib/leaflet-utils"
import { createLocation } from '@/lib/db/locations'

interface CreateLocationMapProps {
  onLocationCreated: (locationName: string) => void
}

function MapEventHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function CreateLocationMap({ onLocationCreated }: CreateLocationMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [locationName, setLocationName] = useState("")
  const [locationAddress, setLocationAddress] = useState("")
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const mapKey = useRef(`create-map-${Date.now()}`).current

  // 加载地图时获取用户位置
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          if (error && typeof error === 'object' && 'message' in error) {
            console.error("Error getting user location:", (error as GeolocationPositionError).message)
          } else {
            console.error("Error getting user location:", error)
          }
          // 默认斯坦福坐标
          setUserLocation([37.4275, -122.1697])
        }
      )
    } else {
      // 默认斯坦福坐标
      setUserLocation([37.4275, -122.1697])
    }
    setMapLoaded(true)
  }, [])

  // 处理地图点击事件
  const handleMapClick = (lat: number, lng: number) => {
    setMarkerPosition([lat, lng])
  }

  // 创建图标
  const createIcon = (selected: boolean) => {
    if (typeof window === "undefined") return null

    try {
      const L = require("leaflet")
      return L.icon(createMarkerIcon("#f472b6", selected))
    } catch (error) {
      console.error("Error creating icon:", error)
      return null
    }
  }

  // 加载Leaflet CSS
  useEffect(() => {
    if (typeof window === "undefined") return

    const linkId = "leaflet-css"
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link")
      link.id = linkId
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }
  }, [])

  // 提交新地点
  const handleSubmit = async () => {
    if (!locationName.trim() || !markerPosition || !locationAddress.trim()) {
      return
    }

    try {
      setIsCreating(true)
      const [lat, lng] = markerPosition

      // 添加新位置
      await createLocation({
        name: locationName,
        address: locationAddress,
        lat,
        lng,
        category: 'custom',
        rating: 0,
        visitCount: 0,
        imageUrl: 'https://source.unsplash.com/random/800x600?place',
        tags: [],
        description: '',
      })

      onLocationCreated(locationName)
    } catch (error) {
      console.error("Error creating location:", error)
    } finally {
      setIsCreating(false)
    }
  }

  if (!mapLoaded || !userLocation) {
    return (
      <div className="h-[400px] bg-muted rounded-md flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Input
          placeholder="地点名称"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
        />
        <Input
          placeholder="地点地址"
          value={locationAddress}
          onChange={(e) => setLocationAddress(e.target.value)}
        />
        <Button
          onClick={handleSubmit}
          disabled={!locationName.trim() || !locationAddress.trim() || !markerPosition || isCreating}
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
          创建地点
        </Button>
      </div>

      <div className="h-[400px] rounded-md overflow-hidden relative">
        <div className="absolute top-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm shadow pointer-events-auto">
            点击地图选择位置
          </div>
        </div>

        <MapContainer
          center={userLocation}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
          attributionControl={true}
          id={`map-${mapKey}`}
          key={mapKey}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapEventHandler onMapClick={handleMapClick} />

          {markerPosition && (
            <Marker position={markerPosition} icon={createIcon(true)}>
              <Popup>
                {locationName || "新地点"}
                <br />
                {`位置: ${markerPosition[0].toFixed(6)}, ${markerPosition[1].toFixed(6)}`}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  )
} 