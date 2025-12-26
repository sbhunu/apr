/**
 * Workflow Events API Route
 * Provides access to workflow event log for monitoring and debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getWorkflowEvents, getPendingWorkflowEvents } from '@/lib/workflows/triggers'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/workflows/events - Get workflow events
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['admin:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const entityType = searchParams.get('entityType')
    const pending = searchParams.get('pending') === 'true'

    if (pending) {
      const result = await getPendingWorkflowEvents()
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        events: result.events || [],
      })
    }

    if (!entityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'entityId parameter is required',
        },
        { status: 400 }
      )
    }

    const result = await getWorkflowEvents(entityId, entityType || undefined)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      events: result.events || [],
    })
  })
})

