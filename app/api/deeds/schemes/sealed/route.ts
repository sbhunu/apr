/**
 * Get sealed surveys ready for scheme registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSealedSurveysForRegistration } from '@/lib/deeds/scheme-registration'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (_request: NextRequest) => {
  return withErrorHandler(async () => {
    const result = await getSealedSurveysForRegistration()

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
      surveys: result.surveys || [],
    })
  })
})

