/**
 * CSRF Protection
 * Implements CSRF token generation and validation
 * Edge Runtime compatible using Web Crypto API
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * CSRF token configuration
 */
const CSRF_TOKEN_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_MAX_AGE = 24 * 60 * 60 // 24 hours

/**
 * Generate CSRF token (Edge Runtime compatible)
 */
export async function generateCSRFToken(): Promise<string> {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash CSRF token for storage (Edge Runtime compatible)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get CSRF token from request
 */
export async function getCSRFToken(request: NextRequest): Promise<string | null> {
  // Try header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (headerToken) {
    return headerToken
  }

  // Try form data
  try {
    const formData = await request.formData()
    const formToken = formData.get(CSRF_TOKEN_NAME)?.toString()
    if (formToken) {
      return formToken
    }
  } catch {
    // Not form data, continue
  }

  // Try JSON body
  try {
    const body = await request.clone().json()
    if (body && typeof body === 'object' && CSRF_TOKEN_NAME in body) {
      return body[CSRF_TOKEN_NAME]?.toString() || null
    }
  } catch {
    // Not JSON, continue
  }

  return null
}

/**
 * Get stored CSRF token from cookies (Edge Runtime compatible)
 */
export function getStoredCSRFToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Validate CSRF token (Edge Runtime compatible)
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }

  const token = await getCSRFToken(request)
  const storedToken = getStoredCSRFToken(request)

  if (!token || !storedToken) {
    logger.warn('CSRF token missing', {
      hasToken: !!token,
      hasStoredToken: !!storedToken,
      path: request.nextUrl.pathname,
    })
    return false
  }

  // Compare tokens (constant-time comparison)
  const tokenHash = await hashToken(token)
  const storedHash = await hashToken(storedToken)

  if (tokenHash !== storedHash) {
    logger.warn('CSRF token mismatch', {
      path: request.nextUrl.pathname,
    })
    return false
  }

  return true
}

/**
 * Generate and set CSRF token (returns cookie string for Edge Runtime)
 */
export async function generateAndSetCSRFToken(): Promise<{ token: string; cookie: string }> {
  const token = await generateCSRFToken()
  const cookie = `${CSRF_COOKIE_NAME}=${token}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Max-Age=${CSRF_TOKEN_MAX_AGE}; Path=/`
  return { token, cookie }
}

