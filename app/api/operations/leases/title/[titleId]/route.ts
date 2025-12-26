/**
 * Get Leases for Title API Route
 * Returns all leases registered against a specific title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getTitleLeases } from '@/lib/operations/leases'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/leases/title/[titleId] - Get leases for a title
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ titleId: string }> }) => {
  return withErrorHandler(async () => {
    const { titleId } = await params
    const result = await getTitleLeases(titleId)

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

