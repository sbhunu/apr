/**
 * Get Objections for Plan API Route
 * Returns all objections for a specific planning plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getObjectionsForPlan } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/objections/plan/[planId] - Get objections for a plan
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ planId: string }> }) => {
  return withErrorHandler(async () => {
    const { planId } = await params
    const result = await getObjectionsForPlan(planId)

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
      objections: result.objections || [],
    })
  })
})

