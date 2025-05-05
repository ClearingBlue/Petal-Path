"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import { createMarkerIcon } from "@/lib/leaflet-utils"

// 地图标记类型
interface MapMarker {
  id: number;
  position: [number, number];
  name: string;
  selected: boolean;
}

// 组件属性类型
interface LeafletMapProps {
  mapKey: string;
  center: [number, number];
  zoom: number;
  markers: MapMarker[];
  selectedLocation: string;
  onMarkerClick: (locationName: string) => void;
}

// 加载Leaflet CSS
function LeafletCSS() {
  useEffect(() => {
    // 仅在浏览器环境中执行
    if (typeof window === 'undefined') return;
    
    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
  }, []);
  
  return null;
}

export default function LeafletMap({
  mapKey,
  center,
  zoom,
  markers,
  selectedLocation,
  onMarkerClick
}: LeafletMapProps) {
  // 创建自定义图标
  const createIcon = (selected: boolean) => {
    if (typeof window === 'undefined') return null;
    
    try {
      // 使用require而不是import确保只在客户端加载
      const L = require('leaflet');
      return L.icon(createMarkerIcon(selected ? "#f43f5e" : "#ef4444", selected));
    } catch (error) {
      console.error("Error creating icon:", error);
      return null;
    }
  };
  
  return (
    <div className="h-[300px] rounded-md overflow-hidden">
      <LeafletCSS />
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        attributionControl={true}
        id={`map-${mapKey}`}
        key={mapKey}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => {
          const isSelected = selectedLocation === marker.name;
          return (
            <Marker
              key={`marker-${marker.id}-${mapKey}`}
              position={marker.position}
              icon={createIcon(isSelected)}
              eventHandlers={{
                click: () => onMarkerClick(marker.name),
              }}
            >
              <Popup>{marker.name}</Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
} 