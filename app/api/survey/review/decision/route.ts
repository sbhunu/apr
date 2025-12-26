/**
 * Submit Review Decision API Route
 * Handles SG review decisions (approve, reject, request revision)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { submitReviewDecision } from '@/lib/survey/review-service'
import { sealSurveyPlan } from '@/lib/survey/sealing-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/review/decision - Submit review decision
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:update'],
  requiredRoles: ['surveyor_general', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, decision, notes, checklist } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    if (!decision || !['approve', 'reject', 'request_revision'].includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid decision is required (approve, reject, request_revision)',
        },
        { status: 400 }
      )
    }

    // Submit review decision
    const result = await submitReviewDecision(surveyPlanId, decision, userId, notes, checklist)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    // If approving, also seal the survey
    if (decision === 'approve') {
      const sealResult = await sealSurveyPlan(surveyPlanId, userId, {
        sealNotes: notes,
      })

      if (!sealResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: `Review approved but sealing failed: ${sealResult.error}`,
          },
          { status: 400 }
        )
      }

      await logActivity(userId, 'update', 'survey', {
        resourceId: surveyPlanId,
        metadata: {
          action: 'seal_survey',
          sealHash: sealResult.sealHash,
          decision,
        },
      })

      return NextResponse.json({
        success: true,
        newState: result.newState,
        sealHash: sealResult.sealHash,
        sealedAt: sealResult.sealedAt,
        certificateUrl: sealResult.certificateUrl,
        message: 'Survey approved and sealed successfully',
      })
    }

    await logActivity(userId, 'update', 'survey', {
      resourceId: surveyPlanId,
      metadata: {
        action: 'review_decision',
        decision,
      },
    })

    return NextResponse.json({
      success: true,
      newState: result.newState,
      message: `Survey ${decision === 'reject' ? 'rejected' : 'revision requested'}`,
    })
  })
})

