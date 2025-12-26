/**
 * Get Statistics API Route
 * Returns aggregated statistics for analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getRegistrationStatistics } from '@/lib/analytics/statistics'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/analytics/statistics - Get registration statistics
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['analytics:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const province = searchParams.get('province') || undefined

    const result = await getRegistrationStatistics({
      startDate,
      endDate,
      province,
    })

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
      statistics: result.statistics,
    })
  })
})

