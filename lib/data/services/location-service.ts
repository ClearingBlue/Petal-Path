/**
 * Location service with CRUD operations
 */

import { Location } from "../models/location";
import { getAll, getById } from "./data-service";
import cache from "../../cache";

/**
 * Get all locations
 */
export function getLocations(): Location[] {
  return getAll<Location>("locations");
}

/**
 * Get location by ID
 */
export function getLocation(id: number): Location | undefined {
  return getById<Location>("locations", id);
}

/**
 * Get nearby locations based on lat/lng
 */
export function getNearbyLocations(
  lat: number,
  lng: number,
  radius = 1000
): Location[] {
  const cacheKey = `nearby-locations-${lat.toFixed(4)}-${lng.toFixed(
    4
  )}-${radius}`;
  const cachedLocations = cache.get<Location[]>(cacheKey);
  if (cachedLocations) {
    return cachedLocations;
  }

  // Get all locations first
  const allLocations = getLocations();

  // In a real app, we would calculate distance and filter
  // For demo purposes, we'll just return all locations
  cache.set(cacheKey, allLocations);
  return allLocations;
}

/**
 * Get saved locations for the current user
 */
export function getSavedLocations(): Location[] {
  const cacheKey = "saved-locations";
  const cachedLocations = cache.get<Location[]>(cacheKey);
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
