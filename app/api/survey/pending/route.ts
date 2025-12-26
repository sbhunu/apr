/**
 * Pending Survey Plans API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingSurveyPlans } from '@/lib/survey/survey-service'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['survey:read'],
})(async (_request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingSurveyPlans()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      surveys: result.plans,
    })
  })
})

