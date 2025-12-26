/**
 * Submit Examination Decision API Route
 * Handles examiner decisions (approve, reject, request revision)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { submitExaminationDecision } from '@/lib/deeds/examination-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { ExaminationChecklistItem, ExaminationDefect } from '@/lib/deeds/examination-service'

/**
 * POST /api/deeds/examination/decision - Submit examination decision
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:update'],
  requiredRoles: ['deeds_examiner', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { titleId, decision, notes, checklist, defects } = body

    if (!titleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title ID is required',
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

    const result = await submitExaminationDecision(
      titleId,
      decision,
      userId,
      notes,
      checklist as ExaminationChecklistItem[],
      defects as ExaminationDefect[]
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'deeds', {
      resourceId: titleId,
      metadata: {
        action: 'examination_decision',
        decision,
        defectCount: defects?.length || 0,
      },
    })

    return NextResponse.json({
      success: true,
      newState: result.newState,
      message: `Title ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'revision requested'}`,
    })
  })
})

