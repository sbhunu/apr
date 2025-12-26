/**
 * Approve Amendment API Route
 * Approves an amendment for processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * POST /api/operations/amendments/[id]/approve - Approve amendment
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
    const { notes } = body

    const supabase = await createClient()

    // Update amendment status
    const { error: updateError } = await supabase
      .from('apr.scheme_amendments')
      .update({
        status: 'approved',
        workflow_state: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
        review_notes: notes,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', amendmentId)

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to approve amendment: ${updateError.message}`,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'operations', {
      resourceId: amendmentId,
      metadata: {
        action: 'amendment_approval',
      },
    })

    logger.info('Amendment approved', { amendmentId, userId })

    return NextResponse.json({
      success: true,
      message: 'Amendment approved successfully',
    })
  })
})

