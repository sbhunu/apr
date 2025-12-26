/**
 * Reject Amendment API Route
 * Rejects an amendment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * POST /api/operations/amendments/[id]/reject - Reject amendment
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:update'],
  requiredRoles: ['planning_authority', 'admin'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id: amendmentId } = await params
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

    // Update amendment status
    const { error: updateError } = await supabase
      .from('apr.scheme_amendments')
      .update({
        status: 'rejected',
        workflow_state: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: userId,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', amendmentId)

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to reject amendment: ${updateError.message}`,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'operations', {
      resourceId: amendmentId,
      metadata: {
        action: 'amendment_rejection',
        reason,
      },
    })

    logger.info('Amendment rejected', { amendmentId, userId })

    return NextResponse.json({
      success: true,
      message: 'Amendment rejected',
    })
  })
})

