/**
 * Cross-Validate Title API Route
 * Validates title against sealed survey data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { crossValidateWithSurvey } from '@/lib/deeds/examination-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/examination/validate - Cross-validate title with survey
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
  requiredRoles: ['deeds_examiner', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const titleId = searchParams.get('titleId')

    if (!titleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title ID is required',
        },
        { status: 400 }
      )
    }

    const result = await crossValidateWithSurvey(titleId)

    return NextResponse.json({
      success: true,
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
    })
  })
})

