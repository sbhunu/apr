/**
 * Process Amendment API Route
 * Processes an approved amendment (registers and updates scheme)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { processAmendment } from '@/lib/operations/amendments'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/amendments/[id]/process - Process amendment
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:update'],
  requiredRoles: ['registrar', 'admin'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id: amendmentId } = await params
    const body = await request.json()
    const { approvalNumber } = body

    const result = await processAmendment(amendmentId, userId, approvalNumber)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'operations', {
      resourceId: amendmentId,
      metadata: {
        action: 'amendment_processing',
        registrationNumber: result.registrationNumber,
        newSectionIds: result.newSectionIds,
      },
    })

    return NextResponse.json({
      success: true,
      amendmentId: result.amendmentId,
      registrationNumber: result.registrationNumber,
      newSectionIds: result.newSectionIds,
      message: 'Amendment processed successfully',
    })
  })
})

