/**
 * Pin model definition and data for map
 */

import { getUnsplashImage } from "../utils/image-utils";

export interface Pin {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  lat: number;
  lng: number;
  userId: number;
  locationId?: number;
  createdAt: string;
}

// Mock pin data for map
export const pins: Pin[] = [
  {
    id: 1,
    title: "Green Library Study Corner",
    description: "Quiet corner on the 2nd floor with natural lighting",
    imageUrl: getUnsplashImage("pin", 1, 400, 300),
    lat: 37.4275,
    lng: -122.1697,
    userId: 1,
    locationId: 2,
    createdAt: "2023-05-10T14:32:00Z",
  },
  {
    id: 2,
    title: "CoHo Coffee Spot",
    description: "Best spot for coffee and light studying",
    imageUrl: getUnsplashImage("pin", 2, 400, 300),
    lat: 37.4241,
    lng: -122.1699,
    userId: 2,
    locationId: 3,
    createdAt: "2023-06-12T09:15:00Z",
  },
];
