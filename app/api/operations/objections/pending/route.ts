/**
 * Get Pending Objections API Route
 * Returns list of pending objections for review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingObjections } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/objections/pending - Get pending objections
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingObjections()

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

