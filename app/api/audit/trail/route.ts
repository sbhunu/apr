/**
 * Query Audit Trail API Route
 * Queries audit trail with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { queryAuditTrail } from '@/lib/audit/audit-service'
import { withErrorHandler } from '@/lib/api-error-handler'
import { AuditEventType, ResourceType } from '@/lib/audit/types'

/**
 * GET /api/audit/trail - Query audit trail
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['audit:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const eventType = searchParams.get('eventType') as AuditEventType | null
    const resourceType = searchParams.get('resourceType') as ResourceType | null
    const resourceId = searchParams.get('resourceId') || undefined
    const userIdFilter = searchParams.get('userId') || undefined
    const userRole = searchParams.get('userRole') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const action = searchParams.get('action') || undefined
    const archived = searchParams.get('archived') === 'true' ? true : undefined
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await queryAuditTrail({
      eventType: eventType || undefined,
      resourceType: resourceType || undefined,
      resourceId,
      userId: userIdFilter,
      userRole,
      startDate,
      endDate,
      action,
      archived,
      limit,
      offset,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      entries: result.entries,
      total: result.total,
    })
  })
})

