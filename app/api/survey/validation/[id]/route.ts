/**
 * Get Validation Report API Route
 * Retrieves stored validation report for a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getValidationReport } from '@/lib/survey/topology-validation-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/survey/validation/[id] - Get validation report
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['survey:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getValidationReport(id)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      report: result.report,
    })
  })
})

