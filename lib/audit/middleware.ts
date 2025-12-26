/**
 * Audit Middleware
 * Middleware for automatic audit logging in API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { logAuditEvent } from './audit-service'
import type { AuditEventType, ResourceType } from './types'

/**
 * Extract resource type from path
 */
function extractResourceType(pathname: string): ResourceType | null {
  if (pathname.includes('/planning/')) return 'planning_plan'
  if (pathname.includes('/survey/')) return 'survey_plan'
  if (pathname.includes('/deeds/')) return 'sectional_title'
  if (pathname.includes('/operations/transfers')) return 'ownership_transfer'
  if (pathname.includes('/operations/mortgages')) return 'mortgage'
  if (pathname.includes('/operations/leases')) return 'lease'
  if (pathname.includes('/operations/amendments')) return 'scheme_amendment'
  if (pathname.includes('/admin/users')) return 'user'
  return null
}

/**
 * Extract event type from HTTP method
 */
function extractEventType(method: string): AuditEventType {
  switch (method) {
    case 'POST':
      return 'create'
    case 'PUT':
    case 'PATCH':
      return 'update'
    case 'DELETE':
      return 'delete'
    case 'GET':
      return 'view'
    default:
      return 'system'
  }
}

/**
 * Create audit middleware
 */
export function createAuditMiddleware(options?: {
  enabled?: boolean
  excludePaths?: string[]
}) {
  const enabled = options?.enabled !== false
  const excludePaths = options?.excludePaths || ['/api/health', '/api/analytics']

  return async function auditMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    if (!enabled) {
      return handler(request)
    }

    // Skip excluded paths
    if (excludePaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
      return handler(request)
    }

    const startTime = Date.now()
    const method = request.method
    const pathname = request.nextUrl.pathname
    const resourceType = extractResourceType(pathname)
    const eventType = extractEventType(method)

    // Extract user ID from request (would need to be set by auth middleware)
    const userId = request.headers.get('x-user-id') || 'system'
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Execute handler
    const response = await handler(request)

    // Log audit event if resource type identified
    if (resourceType && userId !== 'system') {
      // Extract resource ID from path or response
      const resourceId = pathname.split('/').pop() || 'unknown'

      // Log audit event (non-blocking)
      logAuditEvent(
        eventType,
        resourceType,
        resourceId,
        userId,
        `${method} ${pathname}`,
        `${method} request to ${pathname}`,
        {
          metadata: {
            pathname,
            method,
            statusCode: response.status,
            duration: Date.now() - startTime,
          },
          ipAddress,
          userAgent,
        }
      ).catch((error) => {
        // Log error but don't fail the request
        console.error('Failed to log audit event', error)
      })
    }

    return response
  }
}

