/**
 * Submit Transfer API Route
 * Handles transfer submission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { submitTransfer } from '@/lib/operations/transfers'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { TransferSubmissionData } from '@/lib/operations/transfers'

/**
 * POST /api/operations/transfers/submit - Submit transfer
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const data = body as TransferSubmissionData

    const result = await submitTransfer(data, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'create', 'operations', {
      resourceId: result.transferId,
      metadata: {
        action: 'transfer_submission',
        titleId: data.titleId,
        transferType: data.transferType,
      },
    })

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
      message: 'Transfer submitted successfully',
    })
  })
})

