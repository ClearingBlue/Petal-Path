"use client"

import { useRef } from "react"
import { locations } from "@/lib/data/models/location"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// 地图标记类型
interface MapMarker {
  id: number;
  position: [number, number]; // Leaflet positions are [lat, lng] tuples
  name: string;
  selected: boolean;
}

// 组件属性类型
interface LocationMapProps {
  selectedLocation: string;
  onSelectLocation: (location: string) => void;
}

// 动态导入Leaflet，设置加载状态
const LeafletMap = dynamic(
  () => import('./leaflet-map'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-muted rounded-md flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// 地图组件主函数
export default function LocationMap({ selectedLocation, onSelectLocation }: LocationMapProps) {
  const mapKey = useRef(`map-${Date.now()}`).current; // 为每个地图实例创建唯一key
  
  // 处理标记点击
  const handleMarkerClick = (locationName: string) => {
    onSelectLocation(locationName);
  };
  
  // 斯坦福大学坐标
  const stanfordCoordinates = { lat: 37.4275, lng: -122.1697 };
  
  // 准备地图标记数据
  const mapMarkers = locations.map(location => ({
    id: location.id,
    position: [location.lat, location.lng] as [number, number],
    name: location.name,
    selected: selectedLocation === location.name
  }));
  
  return (
    <LeafletMap
      mapKey={mapKey}
      center={[stanfordCoordinates.lat, stanfordCoordinates.lng]}
      zoom={14}
      markers={mapMarkers}
      selectedLocation={selectedLocation}
      onMarkerClick={handleMarkerClick}
    />
  );
} 