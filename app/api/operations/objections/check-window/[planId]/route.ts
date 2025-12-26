/**
 * Check Objection Window API Route
 * Checks if a planning plan is within the objection window
 */

import { NextRequest, NextResponse } from 'next/server'
import { isWithinObjectionWindow } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/objections/check-window/[planId] - Check objection window
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) => {
  const { planId } = await params
  const result = await isWithinObjectionWindow(planId)

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
    withinWindow: result.withinWindow,
    windowStart: result.windowStart,
    windowEnd: result.windowEnd,
    daysRemaining: result.daysRemaining,
  })
})

