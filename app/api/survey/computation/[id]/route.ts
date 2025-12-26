/**
 * Get Survey Computation Results API Route
 * Retrieves computation results for a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getComputationResults } from '@/lib/survey/computation-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/survey/computation/[id] - Get computation results
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
    const result = await getComputationResults(id)

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
      result: result.result,
    })
  })
})

