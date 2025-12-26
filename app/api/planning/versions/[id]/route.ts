/**
 * Plan Version History API Route
 * Returns version history for a plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPlanVersionHistory } from '@/lib/planning/plan-locking'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/planning/versions/[id] - Get plan version history
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getPlanVersionHistory(id)

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
      history: result.history,
    })
  })
})

