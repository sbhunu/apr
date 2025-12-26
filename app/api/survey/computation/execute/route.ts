/**
 * Execute Survey Computation API Route
 * Runs outside figure computation for a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { executeComputation } from '@/lib/survey/computation-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/computation/execute - Execute computation
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:update'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    const result = await executeComputation(surveyPlanId, userId)

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
        action: 'execute_computation',
        closureError: result.result?.closure.closureError,
        area: result.result?.area.area,
        accuracyRatio: result.result?.closure.closureErrorRatio,
      },
    })

    return NextResponse.json({
      success: true,
      result: result.result,
      message: 'Computation executed successfully',
    })
  })
})

