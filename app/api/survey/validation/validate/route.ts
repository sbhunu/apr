/**
 * Validate Scheme Topology API Route
 * Runs comprehensive topology validation for a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { validateSchemeTopology } from '@/lib/survey/topology-validation-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/validation/validate - Validate scheme topology
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, options } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    const result = await validateSchemeTopology(surveyPlanId, options || {}, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'read', 'survey', {
      resourceId: surveyPlanId,
      metadata: {
        action: 'validate_topology',
        isValid: result.report?.isValid,
        errorCount: result.report?.summary.totalErrors || 0,
        warningCount: result.report?.summary.totalWarnings || 0,
      },
    })

    return NextResponse.json({
      success: true,
      report: result.report,
      message: result.report?.isValid
        ? 'Topology validation passed'
        : 'Topology validation found errors',
    })
  })
})

