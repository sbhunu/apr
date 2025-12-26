/**
 * Compare Plan Versions API Route
 * Compares two plan versions and returns differences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { comparePlanVersions } from '@/lib/planning/plan-locking'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/planning/versions/compare - Compare plan versions
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { planId1, planId2 } = body

    if (!planId1 || !planId2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Both plan IDs are required',
        },
        { status: 400 }
      )
    }

    const result = await comparePlanVersions(planId1, planId2)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      comparison: result.comparison,
    })
  })
})

