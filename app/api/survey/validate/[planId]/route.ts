/**
 * Survey Validation Route
 * Runs topology validation for a given survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { validateSchemeTopology } from '@/lib/survey/topology-validation-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/survey/validate/[planId]
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['survey:validate'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ planId: string }> }
) => {
  return withErrorHandler(async () => {
    const { planId } = await params

    const result = await validateSchemeTopology(planId, undefined, userId)

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
      report: result.report,
    })
  })
})

