/**
 * Resolve Objection API Route
 * Resolves an objection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { resolveObjection } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/objections/[id]/resolve - Resolve objection
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:write'],
  requiredRoles: ['planning_authority', 'admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const result = await resolveObjection(
      id,
      body.resolution,
      userId,
      body.resolutionDocumentId
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

