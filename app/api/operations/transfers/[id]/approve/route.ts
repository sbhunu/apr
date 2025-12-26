/**
 * Approve Transfer API Route
 * Approves a transfer for processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * POST /api/operations/transfers/[id]/approve - Approve transfer
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
    const { notes } = body

    const supabase = await createClient()

    // Update transfer status
    const { error: updateError } = await supabase
      .from('apr.ownership_transfers')
      .update({
        status: 'approved',
        workflow_state: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
        review_notes: notes,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', transferId)

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to approve transfer: ${updateError.message}`,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'operations', {
      resourceId: transferId,
      metadata: {
        action: 'transfer_approval',
      },
    })

    logger.info('Transfer approved', { transferId, userId })

    return NextResponse.json({
      success: true,
      message: 'Transfer approved successfully',
    })
  })
})

