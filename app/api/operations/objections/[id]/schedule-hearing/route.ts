/**
 * Schedule Hearing API Route
 * Schedules a hearing for an objection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { scheduleHearing } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/objections/[id]/schedule-hearing - Schedule hearing
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:write'],
  requiredRoles: ['planning_authority', 'admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const result = await scheduleHearing(
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

