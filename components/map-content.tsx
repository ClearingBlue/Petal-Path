"use client"

import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import { createMarkerIcon, createUserLocationIcon } from "@/lib/leaflet-utils"

interface MapContentProps {
  userLocation: { lat: number; lng: number }
  locations: any[]
  selectedLocation: number | null
  onSelectLocation: (id: number) => void
}

export default function MapContent({
  userLocation,
  locations,
  selectedLocation,
  onSelectLocation
}: MapContentProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const zoomControlRef = useRef<any>(null);
  
  // 尝试获取地图实例，但如果失败则返回 null (例如在 SSR 期间)
  let map = null;
  try {
    map = useMap();
    mapRef.current = map;
  } catch (error) {
    console.error("Error getting map instance:", error);
  }
  
  // 确保只在客户端运行所有逻辑
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 现在，地图实例已在组件主体中获取
    const currentMap = mapRef.current; 
    if (!currentMap) return;
    
    // 添加缩放控件到右上角
    import("leaflet").then((L) => {
      // 移除现有的缩放控件（如果有）
      if (zoomControlRef.current) {
        zoomControlRef.current.remove();
      }
      
      // 创建新的缩放控件并添加到地图右上角
      const zoomControl = new L.Control.Zoom({ 
        position: 'topright',
        zoomInTitle: 'Zoom in',
        zoomOutTitle: 'Zoom out'
      });
      zoomControl.addTo(currentMap);
      zoomControlRef.current = zoomControl;
      
      // 添加自定义样式到缩放控件，使其更紧凑
      if (typeof document !== 'undefined') {
        const style = document.createElement('style');
        style.textContent = `
          .leaflet-control-zoom {
            margin-right: 12px !important;
            margin-top: 12px !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            border: none !important;
          }
          .leaflet-control-zoom a {
            width: 32px !important;
            height: 32px !important;
            line-height: 30px !important;
            background-color: white !important;
            color: #333 !important;
          }
          .leaflet-control-zoom a:hover {
            background-color: #f9f9f9 !important;
            color: #000 !important;
          }
        `;
        document.head.appendChild(style);
      }
    }).catch(error => {
      console.error("Error importing Leaflet for zoom control:", error);
    });
  }, []);

  // Update map view when user location changes
  useEffect(() => {
    // Use ref to ensure we have the latest map instance
    const currentMap = mapRef.current;
    if (currentMap && currentMap.setView && typeof window !== 'undefined') {
      try {
        currentMap.setView([userLocation.lat, userLocation.lng], 15);
      } catch (error) {
        console.error("Error setting map view:", error);
      }
    }
  }, [userLocation]);

  // Handle user location marker
  useEffect(() => {
    // Exit early if not in browser or no map
    if (typeof window === 'undefined') return;
    const currentMap = mapRef.current;
    if (!currentMap) return;

    let isMounted = true;

    // Import Leaflet and create user marker
    import("leaflet").then((L) => {
      if (!isMounted || !currentMap) return;

      try {
        // Remove previous marker
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        // Create user location marker
        const icon = L.icon(createUserLocationIcon());
        const marker = L.marker([userLocation.lat, userLocation.lng], { icon });
        marker.addTo(currentMap);
        marker.bindPopup("Stanford University");

        userMarkerRef.current = marker;
      } catch (error) {
        console.error("Error creating user marker:", error);
      }
    }).catch(error => {
      console.error("Error importing Leaflet:", error);
    });

    return () => {
      isMounted = false;
      try {
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }
      } catch (error) {
        console.error("Error cleaning up user marker:", error);
      }
    };
  }, [userLocation]);

  // Handle location markers
  useEffect(() => {
    // Exit early if not in browser or no map
    if (typeof window === 'undefined') return;
    const currentMap = mapRef.current;
    if (!currentMap) return;

    let isMounted = true;

    // Import Leaflet dynamically to avoid SSR issues
    import("leaflet").then((L) => {
      if (!isMounted || !currentMap) return;

      try {
        // Clear previous markers
        markersRef.current.forEach((marker) => {
          if (marker) {
            marker.remove();
          }
        });
        markersRef.current = [];

        // Add new markers
        locations.forEach((location) => {
          if (!isMounted || !currentMap) return;

          const isSelected = selectedLocation === location.id;

          // Create custom icon
          const icon = L.icon(createMarkerIcon(isSelected ? "#f43f5e" : "#ef4444", isSelected));

          // Create marker
          const marker = L.marker([location.lat, location.lng], { icon });
          marker.addTo(currentMap);
          marker.on("click", () => {
            onSelectLocation(location.id);
          });

          // Add popup
          marker.bindPopup(`<b>${location.name}</b><br>${Array.isArray(location.tags) ? location.tags.join(", ") : ""}`);

          // Store marker reference
          markersRef.current.push(marker);
        });

        // If a location is selected, center the map on it
        if (selectedLocation && isMounted && currentMap) {
          const selectedLoc = locations.find(loc => loc.id === selectedLocation);
          if (selectedLoc) {
            currentMap.setView([selectedLoc.lat, selectedLoc.lng], 17);
          }
        }
      } catch (error) {
        console.error("Error creating location markers:", error);
      }
    }).catch(error => {
      console.error("Error importing Leaflet:", error);
    });

    return () => {
      isMounted = false;
      try {
        markersRef.current.forEach((marker) => {
          if (marker) {
            marker.remove();
          }
        });
        markersRef.current = [];
      } catch (error) {
        console.error("Error cleaning up location markers:", error);
      }
    };
  }, [locations, selectedLocation, onSelectLocation]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        try {
          if (zoomControlRef.current) {
            zoomControlRef.current.remove();
          }
        } catch (error) {
          console.error("Error cleaning up zoom control:", error);
        }
      }
    };
  }, []);

  return null;
} 