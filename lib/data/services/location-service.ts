/**
 * Location service with CRUD operations
 */

import { locations, Location, ExtendedLocation } from "../models/location";
import { posts } from "../models/post";
import { calculateDistance } from "@/lib/leaflet-utils";
import { getAll, getById } from "./data-service";
import cache from "../../cache";

/**
 * Get all locations
 */
export function getLocations(): ExtendedLocation[] {
  return locations;
}

/**
 * Get location by ID
 */
export function getLocationById(id: number): ExtendedLocation | undefined {
  return locations.find(location => location.id === id);
}

/**
 * Get location by name
 */
export function getLocationByName(name: string): ExtendedLocation | undefined {
  return locations.find(location => location.name === name);
}

/**
 * Get nearby locations based on lat/lng
 */
export function getNearbyLocations(
  lat: number,
  lng: number,
  radiusInMeters: number
): ExtendedLocation[] {
  return locations.filter(location => {
    const distance = calculateDistance(lat, lng, location.lat, location.lng);
    return distance <= radiusInMeters;
  });
}

/**
 * Get saved locations for the current user
 */
export function getSavedLocations(): ExtendedLocation[] {
  const cacheKey = "saved-locations";
  const cachedLocations = cache.get<ExtendedLocation[]>(cacheKey);
  if (cachedLocations) {
    return cachedLocations;
  }

  // For demo purposes, return all locations as saved
  const allLocations = getLocations();
  cache.set(cacheKey, allLocations);
  return allLocations;
}

/**
 * Get user's current location
 */
export function getUserLocation(): Promise<{ lat: number; lng: number }> {
  const cacheKey = "user-location";
  const cachedLocation = cache.get<{ lat: number; lng: number }>(cacheKey);
  if (cachedLocation) {
    return Promise.resolve(cachedLocation);
  }

  // Simulate getting user's location
  // In a real app, this would be: return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(...))
  return new Promise((resolve) => {
    // Simulate a delay
    setTimeout(() => {
      // For demo purposes, return a location near Stanford
      const location = { lat: 37.4275, lng: -122.1697 };
      cache.set(cacheKey, location, 60 * 60 * 1000); // Cache for 1 hour
      resolve(location);
    }, 500);
  });
}

/**
 * Add a new location
 */
export function addLocation(newLocation: Omit<Location, "id">): Promise<ExtendedLocation> {
  return new Promise((resolve) => {
    // Simulate asynchronous operation
    setTimeout(() => {
      // Generate new ID (in a real application, this would be handled by the database)
      const newId = Math.max(...locations.map(l => l.id)) + 1;
      
      // Create new location object
      const location: ExtendedLocation = {
        id: newId,
        ...newLocation,
        posts: [],
        tags: [...(newLocation.tags || [])]
      };
      
      // Add to location list
      locations.push(location);
      
      // Return the newly created location
      resolve(location);
    }, 500); // Simulate network delay
  });
}

/**
 * Update location information
 */
export function updateLocation(locationId: number, updates: Partial<Location>): Promise<ExtendedLocation | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const locationIndex = locations.findIndex(l => l.id === locationId);
      
      if (locationIndex === -1) {
        resolve(undefined);
        return;
      }
      
      // Update location information
      locations[locationIndex] = {
        ...locations[locationIndex],
        ...updates
      };
      
      resolve(locations[locationIndex]);
    }, 300);
  });
}

/**
 * Update location tags based on posts
 */
export function updateLocationTags(locationId: number): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Get all posts for the location
      const locationPosts = posts.filter(post => {
        return post.location === getLocationById(locationId)?.name;
      });
      
      // If there are no posts, return an empty array
      if (locationPosts.length === 0) {
        resolve([]);
        return;
      }
      
      // Count the occurrences of each tag
      const tagCounts: Record<string, number> = {};
      
      locationPosts.forEach(post => {
        if (Array.isArray(post.tags)) {
          post.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + post.likes;
          });
        }
      });
      
      // Sort tags by likes
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)  // Take top 5
        .map(([tag]) => tag);
      
      // Update location tags
      const locationIndex = locations.findIndex(l => l.id === locationId);
      if (locationIndex !== -1) {
        locations[locationIndex].tags = topTags;
      }
      
      resolve(topTags);
    }, 300);
  });
}
