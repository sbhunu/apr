/**
 * Schedule Dispute Hearing API Route
 * Schedules a hearing for a dispute
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { scheduleDisputeHearing } from '@/lib/operations/disputes'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/disputes/[id]/schedule-hearing - Schedule hearing
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['admin:write'],
  requiredRoles: ['admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const result = await scheduleDisputeHearing(
      id,
      body.hearingDate,
      body.hearingLocation,
      body.hearingOfficerId || userId
    )

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
    })
  })
})

