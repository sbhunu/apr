/**
 * Resolve Dispute API Route
 * Resolves a dispute
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { resolveDispute } from '@/lib/operations/disputes'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/disputes/[id]/resolve - Resolve dispute
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['admin:write'],
  requiredRoles: ['admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const result = await resolveDispute(
      id,
      body.resolution,
      body.resolutionType,
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

