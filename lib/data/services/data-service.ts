/**
 * Base data service that handles loading mock data and caching
 */
import cache from "@/lib/cache";

// Generic function to get all items of a specific type
export function getAll<T>(dataKey: string, fallbackData: T[] = []): T[] {
  // Check if data exists in cache
  const cachedData = cache.get<T[]>(dataKey);

  if (cachedData) {
    return cachedData;
  }

  // If no cached data, return fallback data
  // In a real app, this would fetch from an API or database
  return fallbackData;
}

// Generic function to get an item by ID
export function getById<T extends { id: number }>(
  dataKey: string,
  id: number,
  fallbackData: T[] = []
): T | undefined {
  const items = getAll<T>(dataKey, fallbackData);
  return items.find((item) => item.id === id);
}

// Generic function to filter items by a property
export function filterBy<T>(
  dataKey: string,
  propertyName: string,
  propertyValue: any,
  fallbackData: T[] = [],
  filterFn: (item: T) => boolean
): T[] {
  const items = getAll<T>(dataKey, fallbackData);
  return items.filter(filterFn);
}

// Function to save data to cache
export function saveData<T>(dataKey: string, data: T[], expiry?: number): void {
  cache.set(dataKey, data, expiry);
}

// Function to clear specific data from cache
export function clearData(dataKey: string): void {
  cache.remove(dataKey);
}

// Function to reset all data in cache
export function resetAllData(): void {
  cache.clear();
}

// Function to initialize data in cache
export function initializeData<T>(dataKey: string, data: T[]): void {
  if (!cache.has(dataKey)) {
    saveData(dataKey, data);
  }
}
