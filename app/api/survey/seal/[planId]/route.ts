/**
 * Survey Sealing API Route
 * Allows Surveyor-General to seal validated survey plans.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { sealSurveyPlan } from '@/lib/survey/sealing-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/seal/[planId]
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:seal'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ planId: string }> }
) => {
  return withErrorHandler(async () => {
    const { planId } = await params

    const body = await request.json()
    const { sealNotes } = body || {}

    const result = await sealSurveyPlan(planId, userId, {
      sealNotes: sealNotes || 'Sealed by Surveyor-General',
    })

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
      sealHash: result.sealHash,
      sealedAt: result.sealedAt,
      certificateUrl: result.certificateUrl,
    })
  })
})

