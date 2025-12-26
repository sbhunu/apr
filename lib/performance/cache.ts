/**
 * Caching Service
 * Implements in-memory and persistent caching strategies
 */

import { logger } from '@/lib/logger'

/**
 * Cache entry
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttl: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
}

/**
 * In-memory cache implementation
 */
class MemoryCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private config: Required<CacheConfig>
  private cleanupInterval: NodeJS.Timeout

  constructor(config: CacheConfig) {
    this.config = {
      ttl: config.ttl,
      maxSize: config.maxSize || 1000,
    }

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, customTTL?: number): void {
    // Remove oldest entries if at max size
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    const ttl = customTTL || this.config.ttl
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    }

    this.cache.set(key, entry)
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`)
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
  }
}

/**
 * Cache instances for different data types
 */
export const statisticsCache = new MemoryCache<any>({
  ttl: 15 * 60 * 1000, // 15 minutes
  maxSize: 100,
})

export const queryCache = new MemoryCache<any>({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
})

export const certificateCache = new MemoryCache<any>({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 1000,
})

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, ...params: unknown[]): string {
  const key = params.map((p) => JSON.stringify(p)).join(':')
  return `${prefix}:${key}`
}

/**
 * Cache wrapper for async functions
 */
export async function cached<T>(
  cache: MemoryCache<T>,
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = cache.get(key)
  if (cached !== null) {
    return cached
  }

  // Execute function and cache result
  const result = await fn()
  cache.set(key, result, ttl)
  return result
}

