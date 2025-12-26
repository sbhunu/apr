/**
 * Get Pending Transfers API Route
 * Returns list of pending transfers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingTransfers } from '@/lib/operations/transfers'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/transfers/pending - Get pending transfers
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['operations:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingTransfers()

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
      transfers: result.transfers,
    })
  })
})

