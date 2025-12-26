/**
 * Lease Detail API Route
 * Get details for a specific lease
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getLease } from '@/lib/operations/leases'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/leases/[id] - Get lease details
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getLease(id)

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
      lease: result.lease,
    })
  })
})

