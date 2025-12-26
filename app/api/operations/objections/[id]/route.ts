/**
 * Objection Detail API Route
 * Get details for a specific objection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getObjection } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/objections/[id] - Get objection details
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getObjection(id)

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
      objection: result.objection,
    })
  })
})

