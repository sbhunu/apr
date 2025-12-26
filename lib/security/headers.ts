/**
 * Security Headers
 * Implements security headers for HTTP responses
 */

import { NextResponse } from 'next/server'

/**
 * Security headers configuration
 */
export interface SecurityHeaders {
  'X-DNS-Prefetch-Control'?: string
  'Strict-Transport-Security'?: string
  'X-Frame-Options'?: string
  'X-Content-Type-Options'?: string
  'X-XSS-Protection'?: string
  'Referrer-Policy'?: string
  'Content-Security-Policy'?: string
  'Permissions-Policy'?: string
  'X-Permitted-Cross-Domain-Policies'?: string
}

/**
 * Build Content Security Policy
 */
function buildCSP(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const connectSrc = ["'self'", 'https:']

  // In development, allow localhost connections
  if (process.env.NODE_ENV === 'development') {
    connectSrc.push('http://localhost:*', 'ws://localhost:*', 'wss://localhost:*')
  }

  // Add Supabase URL to connect-src if it's different from self
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl)
      // Only add if it's not localhost (already covered) and not same origin
      if (!url.hostname.includes('localhost') && url.origin !== process.env.NEXT_PUBLIC_APP_URL) {
        connectSrc.push(`${url.protocol}//${url.host}`)
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:" + (process.env.NODE_ENV === 'development' ? ' http://localhost:*' : ''),
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    "frame-ancestors 'none'",
  ].join('; ')
}

/**
 * Default security headers
 */
export const defaultSecurityHeaders: SecurityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': buildCSP(),
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Permitted-Cross-Domain-Policies': 'none',
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  customHeaders?: Partial<SecurityHeaders>
): NextResponse {
  const headers = { ...defaultSecurityHeaders, ...customHeaders }

  // Only apply HSTS in production
  if (process.env.NODE_ENV !== 'production') {
    delete headers['Strict-Transport-Security']
  }

  // Apply headers
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })

  return response
}

/**
 * Create security headers middleware
 */
export function createSecurityHeadersMiddleware(customHeaders?: Partial<SecurityHeaders>) {
  return (response: NextResponse): NextResponse => {
    return applySecurityHeaders(response, customHeaders)
  }
}

