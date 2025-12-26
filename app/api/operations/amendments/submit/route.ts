/**
 * Submit Amendment API Route
 * Handles amendment submission
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { submitAmendment } from '@/lib/operations/amendments'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { AmendmentSubmissionData } from '@/lib/operations/amendments'

/**
 * POST /api/operations/amendments/submit - Submit amendment
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const data = body as AmendmentSubmissionData

    const result = await submitAmendment(data, userId)

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
      resourceId: result.amendmentId,
      metadata: {
        action: 'amendment_submission',
        schemeId: data.schemeId,
        amendmentType: data.amendmentType,
      },
    })

    return NextResponse.json({
      success: true,
      amendmentId: result.amendmentId,
      message: 'Amendment submitted successfully',
    })
  })
})

