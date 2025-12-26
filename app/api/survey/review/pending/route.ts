/**
 * Get Pending Surveys API Route
 * Returns list of surveys awaiting SG review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingSurveysForReview } from '@/lib/survey/review-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/survey/review/pending - Get pending surveys
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['survey:read'],
  requiredRoles: ['surveyor_general', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingSurveysForReview()

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
      surveys: result.surveys,
    })
  })
})

