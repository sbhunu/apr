/**
 * Adjust Participation Quota API Route
 * Manually adjusts quota for a specific unit
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { adjustUnitQuota } from '@/lib/survey/quota-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/quotas/adjust - Adjust unit quota
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:update'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, sectionNumber, newQuota, commonPropertyArea } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    if (!sectionNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Section number is required',
        },
        { status: 400 }
      )
    }

    if (newQuota === undefined || newQuota === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'New quota is required',
        },
        { status: 400 }
      )
    }

    if (newQuota < 0 || newQuota > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quota must be between 0 and 100',
        },
        { status: 400 }
      )
    }

    const result = await adjustUnitQuota(
      surveyPlanId,
      sectionNumber,
      newQuota,
      commonPropertyArea,
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

    await logActivity(userId, 'update', 'survey', {
      resourceId: surveyPlanId,
      metadata: {
        action: 'adjust_quota',
        sectionNumber,
        newQuota,
        totalQuota: result.result?.totalQuota || 0,
      },
    })

    return NextResponse.json({
      success: true,
      result: result.result,
      message: 'Quota adjusted successfully',
    })
  })
})

