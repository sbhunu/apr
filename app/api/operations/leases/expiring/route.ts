/**
 * Get Expiring Leases API Route
 * Returns leases expiring within a specified number of days
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getExpiringLeases } from '@/lib/operations/leases'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/leases/expiring - Get expiring leases
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('days') || '90', 10)

    const result = await getExpiringLeases(daysAhead)

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
      leases: result.leases || [],
    })
  })
})

