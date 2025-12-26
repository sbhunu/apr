/**
 * Submit Review API Route
 * Handles review submission and workflow transitions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { submitReview, startReview } from '@/lib/planning/review-service'
import { validateChecklist } from '@/lib/planning/review-checklist'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import type { ReviewSubmissionData } from '@/lib/planning/review-service'

/**
 * POST /api/planning/review/submit - Submit review decision
 */
export const POST = createRBACMiddleware({
  requiredRole: 'planning_authority',
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const {
      planId,
      reviewType,
      checklist,
      reviewNotes,
      findings,
      decision,
      reason,
    } = body as ReviewSubmissionData

    // Validate required fields
    if (!planId || !decision) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan ID and decision are required',
        },
        { status: 400 }
      )
    }

    // Validate checklist if approving
    if (decision === 'approved') {
      const validation = validateChecklist(checklist || [])
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required checklist items: ${validation.missingRequired.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    // Validate reason for rejection/amendment
    if ((decision === 'rejected' || decision === 'requires_amendment') && !reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reason is required for rejection or amendment requests',
        },
        { status: 400 }
      )
    }

    // Start review if not already started
    const startResult = await startReview(planId, userId, reviewType || 'initial_review')
    if (!startResult.success && startResult.error?.includes('already')) {
      // Review already started, continue
    }

    // Submit review
    const result = await submitReview(
      {
        planId,
        reviewType: reviewType || 'initial_review',
        checklist: checklist || [],
        reviewNotes: reviewNotes || '',
        findings: findings || [],
        decision,
        reason: reason || reviewNotes || '',
      },
      userId
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    await logActivity(userId, 'update', 'planning', {
      resourceId: planId,
      metadata: {
        action: 'submit_review',
        decision,
        reviewType,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Scheme ${decision} successfully`,
    })
  })
})

