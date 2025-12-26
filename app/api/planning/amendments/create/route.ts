/**
 * Create Plan Amendment API Route
 * Creates a new plan version as an amendment to a locked plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createPlanAmendment } from '@/lib/planning/plan-locking'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/planning/amendments/create - Create plan amendment
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { parentPlanId, amendmentReason } = body

    if (!parentPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parent plan ID is required',
        },
        { status: 400 }
      )
    }

    if (!amendmentReason || !amendmentReason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amendment reason is required',
        },
        { status: 400 }
      )
    }

    const result = await createPlanAmendment(
      parentPlanId,
      amendmentReason,
      userId
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

    await logActivity(userId, 'create', 'planning', {
      resourceId: result.amendmentPlanId,
      metadata: {
        action: 'create_amendment',
        parentPlanId,
        amendmentReason,
      },
    })

    return NextResponse.json({
      success: true,
      amendmentPlanId: result.amendmentPlanId,
      message: 'Plan amendment created successfully',
    })
  })
})

