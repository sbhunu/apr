/**
 * Get Pending Disputes API Route
 * Returns list of pending disputes for review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingDisputes } from '@/lib/operations/disputes'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/disputes/pending - Get pending disputes
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingDisputes()

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
      disputes: result.disputes || [],
    })
  })
})

