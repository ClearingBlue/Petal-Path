/**
 * Data initialization module
 * Loads mock data into cache on app initialization
 */
import { initializeData } from "./services/data-service";
import { locations } from "./models/location";
import { users } from "./models/user";
import { posts } from "./models/post";
import { pins } from "./models/pin";

export function initializeAppData(): void {
  console.log("[Data] Initializing app data...");

  // Initialize all data models in cache
  initializeData("locations", locations);
  initializeData("users", users);
  initializeData("posts", posts);
  initializeData("pins", pins);

  console.log("[Data] App data initialization complete");
}

// Function to check if data needs initialization
export function initDataIfNeeded(): void {
  // This would typically check if the app is starting fresh
  // For now, we'll just call initialize
  initializeAppData();
}
