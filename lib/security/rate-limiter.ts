/**
 * Rate Limiting Service
 * Implements rate limiting to prevent abuse and DoS attacks
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * In-memory rate limit store (for single-instance deployments)
 * For production, use Redis or similar distributed cache
 */
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key)
        }
      }
    }, 5 * 60 * 1000)
  }

  get(key: string): { count: number; resetTime: number } | undefined {
    return this.store.get(key)
  }

  set(key: string, value: { count: number; resetTime: number }): void {
    this.store.set(key, value)
  }

  increment(key: string, resetTime: number): number {
    const current = this.store.get(key)
    if (!current || current.resetTime < Date.now()) {
      this.store.set(key, { count: 1, resetTime })
      return 1
    }
    current.count++
    return current.count
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

const rateLimitStore = new RateLimitStore()

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Use IP address as primary identifier
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Include user ID if authenticated
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `${ip}:${userId}`
  }

  return ip
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitResult {
  const clientId = getClientId(request)
  const now = Date.now()
  const resetTime = now + config.windowMs

  const current = rateLimitStore.get(clientId)

  if (!current || current.resetTime < now) {
    // New window or expired window
    rateLimitStore.set(clientId, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  const count = rateLimitStore.increment(clientId, resetTime)
  const allowed = count <= config.maxRequests

  if (!allowed) {
    logger.warn('Rate limit exceeded', {
      clientId,
      count,
      maxRequests: config.maxRequests,
      path: request.nextUrl.pathname,
    })
  }

  return {
    allowed,
    remaining: Math.max(0, config.maxRequests - count),
    resetTime: current.resetTime,
    retryAfter: allowed ? undefined : Math.ceil((current.resetTime - now) / 1000),
  }
}

/**
 * Default rate limit configurations
 */
export const rateLimitConfigs = {
  // Public API endpoints
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please try again later.',
  },
  // Authenticated API endpoints
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    message: 'Rate limit exceeded. Please try again later.',
  },
  // Admin endpoints
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Admin rate limit exceeded.',
  },
  // Certificate verification (public)
  verification: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // Lower limit to prevent abuse
    message: 'Too many verification attempts. Please try again later.',
  },
  // File uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Upload limit exceeded. Please try again later.',
  },
}

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return (request: NextRequest): RateLimitResult | null => {
    const result = checkRateLimit(request, config)
    return result.allowed ? null : result
  }
}

