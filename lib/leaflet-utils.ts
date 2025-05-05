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
  return {
    iconUrl: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="${
      selected ? 5 : 3
    }" fill="white"></circle></svg>`,
    iconSize: [30, 30] as PointTuple,
    iconAnchor: [15, 30] as PointTuple,
    popupAnchor: [0, -30] as PointTuple,
  };
}

// Create a custom icon for user location
export function createUserLocationIcon() {
  return {
    iconUrl: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234285F4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4" fill="white"></circle></svg>`,
    iconSize: [24, 24] as PointTuple,
    iconAnchor: [12, 12] as PointTuple,
    popupAnchor: [0, -12] as PointTuple,
  };
}
