/**
 * Admin Statistics API Route
 * Provides system statistics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSystemStatistics } from '@/lib/admin/user-management'

/**
 * GET /api/admin/statistics - Get system statistics
 */
export const GET = createRBACMiddleware({
  requiredRole: 'admin',
})(async (request: NextRequest, userId: string) => {
  const result = await getSystemStatistics()

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
    statistics: result.statistics,
  })
})

