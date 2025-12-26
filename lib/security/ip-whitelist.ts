/**
 * IP Whitelist Service
 * Manages IP whitelisting for admin and sensitive functions
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // In development, try to get IP from request
  if (process.env.NODE_ENV === 'development') {
    // For localhost requests, return localhost
    const hostname = request.headers.get('host') || ''
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return '127.0.0.1'
    }
  }

  // Fallback (shouldn't happen in production with proper proxy)
  return 'unknown'
}

/**
 * Check if IP is whitelisted
 */
export function isIPWhitelisted(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    return true // No whitelist means all IPs allowed
  }

  // Check exact match
  if (whitelist.includes(ip)) {
    return true
  }

  // Check CIDR notation
  for (const cidr of whitelist) {
    if (cidr.includes('/')) {
      if (isIPInCIDR(ip, cidr)) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [network, prefixLength] = cidr.split('/')
    const prefix = parseInt(prefixLength, 10)

    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      return false
    }

    const ipNum = ipToNumber(ip)
    const networkNum = ipToNumber(network)
    const mask = (0xffffffff << (32 - prefix)) >>> 0

    return (ipNum & mask) === (networkNum & mask)
  } catch {
    return false
  }
}

/**
 * Convert IP address to number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map((part) => parseInt(part, 10))
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error('Invalid IP address')
  }
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
}

/**
 * Admin IP whitelist (from environment)
 */
export function getAdminIPWhitelist(): string[] {
  const whitelist = process.env.ADMIN_IP_WHITELIST || ''
  if (!whitelist) {
    return [] // Empty means no restriction (not recommended for production)
  }
  return whitelist.split(',').map((ip) => ip.trim()).filter(Boolean)
}

/**
 * Check if request is from whitelisted IP for admin functions
 */
export function checkAdminIPWhitelist(request: NextRequest): boolean {
  // In development, always allow localhost
  if (process.env.NODE_ENV === 'development') {
    const ip = getClientIP(request)
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === 'unknown') {
      return true
    }
  }

  const ip = getClientIP(request)
  const whitelist = getAdminIPWhitelist()

  if (whitelist.length === 0) {
    // In development, allow all if no whitelist
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    logger.warn('Admin IP whitelist is empty - denying access in production', {
      ip,
      path: request.nextUrl.pathname,
    })
    return false // Deny in production if no whitelist
  }

  const allowed = isIPWhitelisted(ip, whitelist)

  if (!allowed) {
    logger.warn('Admin IP whitelist check failed', {
      ip,
      whitelist,
      path: request.nextUrl.pathname,
    })
  }

  return allowed
}

