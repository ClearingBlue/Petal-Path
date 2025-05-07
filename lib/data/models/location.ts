/**
 * Location model definition and data
 */

import { getUnsplashImage } from "../utils/image-utils";
import { Post } from "./post";

export interface Location {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  rating: number;
  visitCount: number;
  tags?: string[];
}

// 扩展位置类型，包含关联的帖子
export interface ExtendedLocation extends Location {
  posts?: Post[];
  tags: string[];
}

// Mock locations data
export const locations: ExtendedLocation[] = [
  {
    id: 1,
    name: "Memorial Church",
    description: "Stanford's non-denominational church at the center of campus",
    imageUrl: getUnsplashImage("location", 1, 400, 300),
    address: "450 Serra Mall, Stanford, CA 94305",
    lat: 37.4269,
    lng: -122.1704,
    category: "landmark",
    rating: 4.8,
    visitCount: 1250,
    tags: ["landmark", "history", "architecture"],
    posts: []
  },
  {
    id: 2,
    name: "Green Library",
    description: "Stanford's main library with extensive collections",
    imageUrl: getUnsplashImage("location", 2, 400, 300),
    address: "571 Escondido Mall, Stanford, CA 94305",
    lat: 37.4275,
    lng: -122.1697,
    category: "study",
    rating: 4.7,
    visitCount: 980,
    tags: ["study", "quiet", "academic"],
    posts: []
  },
  {
    id: 3,
    name: "Tressider Union",
    description: "A popular spot for food and social gatherings",
    imageUrl: getUnsplashImage("location", 3, 400, 400),
    address: "328 Lomita Dr, Stanford, CA 94305",
    lat: 37.4236,
    lng: -122.1703,
    category: "food",
    rating: 4.5,
    visitCount: 750,
    tags: ["food", "social", "events"],
    posts: []
  },
  {
    id: 4,
    name: "The Oval",
    description: "A grassy area surrounded by buildings",
    imageUrl: getUnsplashImage("location", 4, 400, 400),
    address: "328 Lomita Dr, Stanford, CA 94305",
    lat: 37.4305,
    lng: -122.1691,
    category: "nature",
    rating: 4.6,
    visitCount: 850,
    tags: ["nature", "outdoors", "relaxing"],
    posts: []
  },
  {
    id: 5,
    name: "CoHo Coffee House",
    description: "A cozy spot for coffee and socializing",
    imageUrl: getUnsplashImage("location", 5, 400, 400),
    address: "328 Lomita Dr, Stanford, CA 94305",
    lat: 37.4241,
    lng: -122.1699,
    category: "food",
    rating: 4.4,
    visitCount: 650,
    tags: ["coffee", "food", "social"],
    posts: []
  },
];
