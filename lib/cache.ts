// Simple in-memory cache implementation
// In a real app, this would use a more robust solution like React Query, SWR, or Redux

type CacheItem<T> = {
  data: T
  timestamp: number
  expiry: number // in milliseconds
}

class Cache {
  private cache: Record<string, CacheItem<any>> = {}
  private static instance: Cache

  // Make constructor private for singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache()
    }
    return Cache.instance
  }

  // Default cache expiry of 5 minutes
  set<T>(key: string, data: T, expiry: number = 5 * 60 * 1000): void {
    console.log(`[Cache] Setting cache for ${key}`)
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiry,
    }
  }

  get<T>(key: string): T | null {
    const item = this.cache[key]

    if (!item) {
      console.log(`[Cache] Cache miss for ${key}`)
      return null
    }

    // Check if the item has expired
    if (Date.now() > item.timestamp + item.expiry) {
      console.log(`[Cache] Cache expired for ${key}`)
      this.remove(key)
      return null
    }

    console.log(`[Cache] Cache hit for ${key}`)
    return item.data
  }

  remove(key: string): void {
    console.log(`[Cache] Removing cache for ${key}`)
    delete this.cache[key]
  }

  clear(): void {
    console.log(`[Cache] Clearing all cache`)
    this.cache = {}
  }

  // Get all keys that match a pattern
  getKeysByPattern(pattern: string): string[] {
    return Object.keys(this.cache).filter((key) => key.includes(pattern))
  }

  // Check if a key exists in the cache
  has(key: string): boolean {
    return key in this.cache
  }

  // Get cache stats
  getStats(): { totalItems: number; keys: string[] } {
    return {
      totalItems: Object.keys(this.cache).length,
      keys: Object.keys(this.cache),
    }
  }
}

// Create a singleton instance
const cache = Cache.getInstance()

export default cache
