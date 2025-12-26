/**
 * Reject Transfer API Route
 * Rejects a transfer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * POST /api/operations/transfers/[id]/reject - Reject transfer
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:update'],
  requiredRoles: ['deeds_examiner', 'admin'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id: transferId } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required',
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update transfer status
    const { error: updateError } = await supabase
      .from('apr.ownership_transfers')
      .update({
        status: 'rejected',
        workflow_state: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: userId,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', transferId)

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to reject transfer: ${updateError.message}`,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'operations', {
      resourceId: transferId,
      metadata: {
        action: 'transfer_rejection',
        reason,
      },
    })

    logger.info('Transfer rejected', { transferId, userId })

    return NextResponse.json({
      success: true,
      message: 'Transfer rejected',
    })
  })
})

