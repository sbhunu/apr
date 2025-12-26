/**
 * Process Transfer API Route
 * Processes an approved transfer (registers and updates title)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { processTransfer } from '@/lib/operations/transfers'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/transfers/[id]/process - Process transfer
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
    const { id: transferId } = await params

    const result = await processTransfer(transferId, userId)

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
      resourceId: transferId,
      metadata: {
        action: 'transfer_processing',
        registrationNumber: result.registrationNumber,
      },
    })

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
      registrationNumber: result.registrationNumber,
      newCertificateUrl: result.newCertificateUrl,
      message: 'Transfer processed successfully',
    })
  })
})

