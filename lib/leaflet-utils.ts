// Leaflet utility functions
import type { PointTuple } from "leaflet";

// Calculate distance between two points in meters
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // in meters
}

// Create a custom icon for markers
export function createMarkerIcon(color: string, selected: boolean) {
  // 使用固定的粉色而不是传入的颜色
  const pinkColor = "#f472b6"; // 粉色
  const darkPinkColor = "#db2777"; // 深粉色(选中状态)
  const markerColor = selected ? darkPinkColor : pinkColor;
  
  // 花瓣形状的SVG图标 - 更精致的设计
  return {
    iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125" fill="${markerColor}" stroke="#ffffff" stroke-width="2">
    <path d="M50 20C43.8 20 38.3 22.2 34 26C29.7 29.8 27 35 27 40.9C27 46.8 30 52.1 33.3 57.3C36.7 62.5 40.5 67.6 43.8 72.6C45.4 75.1 46.9 77.6 48 80.1C48.5 81.1 48.9 82.1 49.2 83.1C49.3 83.4 49.4 83.8 49.5 84.1C49.6 84.4 49.6 84.8 50 85C50.4 84.8 50.4 84.4 50.5 84.1C50.6 83.8 50.7 83.4 50.8 83.1C51.1 82.1 51.5 81.1 52 80.1C53.1 77.6 54.6 75.1 56.2 72.6C59.5 67.6 63.3 62.5 66.7 57.3C70 52.1 73 46.8 73 40.9C73 35 70.3 29.8 66 26C61.7 22.2 56.2 20 50 20z"/>
    <circle cx="50" cy="40.9" r="${selected ? 9 : 7}" fill="white"/>
    </svg>`)}`,
    iconSize: [36, 46] as PointTuple,
    iconAnchor: [18, 46] as PointTuple,
    popupAnchor: [0, -46] as PointTuple,
  };
}

// Create a custom icon for user location
export function createUserLocationIcon() {
  // 用户位置图标使用紫罗兰色调
  return {
    iconUrl: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="#a78bfa" opacity="0.6" />
    <circle cx="12" cy="12" r="6" fill="#a78bfa" opacity="0.8" />
    <circle cx="12" cy="12" r="3" fill="white" />
    </svg>`)}`,
    iconSize: [24, 24] as PointTuple,
    iconAnchor: [12, 12] as PointTuple,
    popupAnchor: [0, -12] as PointTuple,
  };
}
