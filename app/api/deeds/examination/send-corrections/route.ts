/**
 * Send Correction Notifications API Route
 * Sends correction emails to planners and surveyors
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { sendCorrectionNotifications } from '@/lib/deeds/correction-notifications'
import { withErrorHandler } from '@/lib/api-error-handler'
import type { ExaminationDefect } from '@/lib/deeds/examination-service'

export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
})(async (request: NextRequest) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { titleId, defects, examinerNotes, examinerName, notifyPlanner, notifySurveyor, notifyConveyancer, actionUrl } = body

    if (!titleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title ID is required',
        },
        { status: 400 }
      )
    }

    if (!defects || !Array.isArray(defects) || defects.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one defect is required',
        },
        { status: 400 }
      )
    }

    const result = await sendCorrectionNotifications(
      titleId,
      defects as ExaminationDefect[],
      examinerNotes,
      examinerName,
      {
        notifyPlanner: notifyPlanner !== false,
        notifySurveyor: notifySurveyor !== false,
        notifyConveyancer: notifyConveyancer !== false,
        actionUrl,
      }
    )

    return NextResponse.json(result)
  })
})

