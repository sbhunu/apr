/**
 * Next.js Middleware
 * Applies security headers, rate limiting, CSRF protection, and Supabase session management
 */

import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders } from '@/lib/security/headers'
import { checkRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter'
import { validateCSRFToken } from '@/lib/security/csrf'
import { checkAdminIPWhitelist } from '@/lib/security/ip-whitelist'
import { updateSession } from '@/lib/supabase/middleware'
import { logger } from '@/lib/logger'

/**
 * Routes that require CSRF protection
 */
const CSRF_PROTECTED_ROUTES = [
  '/api/planning',
  '/api/survey',
  '/api/deeds',
  '/api/admin',
  '/api/storage/upload',
]

/**
 * Routes that require admin IP whitelist
 */
const ADMIN_ROUTES = ['/api/admin']

/**
 * Routes that are public (no rate limiting)
 */
const PUBLIC_ROUTES = ['/api/public', '/api/verify']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Update Supabase session first
  let response = await updateSession(request)

  // Apply security headers
  response = applySecurityHeaders(response)

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return response
  }

  // Admin IP whitelist check
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const ipAllowed = checkAdminIPWhitelist(request)
    if (!ipAllowed) {
      logger.warn('Admin route accessed from non-whitelisted IP', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        path: pathname,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. IP address not whitelisted.',
        },
        { status: 403 }
      )
    }
  }

  // Rate limiting - DISABLED
  // To re-enable rate limiting, uncomment the code below
  /*
  if (!PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // Determine rate limit config based on route
    let config = rateLimitConfigs.authenticated

    if (pathname.startsWith('/api/admin')) {
      config = rateLimitConfigs.admin
    } else if (pathname.startsWith('/api/verify')) {
      config = rateLimitConfigs.verification
    } else if (pathname.includes('/upload')) {
      config = rateLimitConfigs.upload
    } else if (pathname.startsWith('/api/public')) {
      config = rateLimitConfigs.public
    }

    const rateLimitResult = checkRateLimit(request, config)
    if (!rateLimitResult.allowed) {
      response.headers.set('X-RateLimit-Limit', String(config.maxRequests))
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
      response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
      if (rateLimitResult.retryAfter) {
        response.headers.set('Retry-After', String(rateLimitResult.retryAfter))
      }

      return NextResponse.json(
        {
          success: false,
          error: config.message || 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      )
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
  }
  */

  // CSRF protection for state-changing operations
  if (CSRF_PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const method = request.method.toUpperCase()
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfValid = await validateCSRFToken(request)
      if (!csrfValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'CSRF token validation failed',
          },
          { status: 403 }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

