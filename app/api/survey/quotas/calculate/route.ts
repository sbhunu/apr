/**
 * Calculate Participation Quotas API Route
 * Calculates quotas for all units in a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { calculateAndStoreQuotas } from '@/lib/survey/quota-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/quotas/calculate - Calculate participation quotas
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:update'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, commonPropertyArea } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    const result = await calculateAndStoreQuotas(
      surveyPlanId,
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
        action: 'calculate_quotas',
        unitCount: result.result?.quotas.length || 0,
        totalQuota: result.result?.totalQuota || 0,
        isValid: result.result?.isValid,
        adjustmentApplied: result.result?.adjustmentApplied,
      },
    })

    return NextResponse.json({
      success: true,
      result: result.result,
      message: 'Quotas calculated successfully',
    })
  })
})

