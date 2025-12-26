/**
 * Planning Scheme Submit API Route
 * Submits a scheme draft for Planning Authority review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware, logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { submitScheme } from '@/lib/planning/scheme-service'

/**
 * POST /api/planning/schemes/[id]/submit - Submit scheme for review
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:update'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json().catch(() => ({} as any))
    const reason = typeof body?.reason === 'string' ? body.reason : undefined

    const result = await submitScheme(id, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'submit', 'planning', {
      resourceId: id,
      metadata: { reason },
    })

    return NextResponse.json({
      success: true,
      message: 'Scheme submitted for review',
    })
  })
})



