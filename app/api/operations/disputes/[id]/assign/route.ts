/**
 * Assign Dispute API Route
 * Assigns a dispute to an authority for review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { assignDispute } from '@/lib/operations/disputes'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/disputes/[id]/assign - Assign dispute
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['admin:write'],
  requiredRoles: ['admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const result = await assignDispute(
      id,
      body.assignedTo,
      body.assignedAuthority
    )

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
    })
  })
})

