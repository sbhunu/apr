/**
 * Get Pending Amendments API Route
 * Returns list of pending amendments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingAmendments } from '@/lib/operations/amendments'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/amendments/pending - Get pending amendments
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['operations:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingAmendments()

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
      amendments: result.amendments,
    })
  })
})

