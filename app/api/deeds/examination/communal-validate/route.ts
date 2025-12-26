/**
 * Communal Authorization Validation API Route
 * Validates communal land authorization for a title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import {
  validateCommunalAuthorization,
  validateCommunalTenureCompliance,
} from '@/lib/deeds/communal-validation'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest) => {
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

    // Run both validations
    const [authorizationResult, tenureResult] = await Promise.all([
      validateCommunalAuthorization(titleId),
      validateCommunalTenureCompliance(titleId),
    ])

    return NextResponse.json({
      success: true,
      authorization: {
        isValid: authorizationResult.isValid,
        errors: authorizationResult.errors,
        warnings: authorizationResult.warnings,
        communalLandId: authorizationResult.communalLandId,
        communalLandCustodianName: authorizationResult.communalLandCustodianName,
        authorizationStatus: authorizationResult.authorizationStatus,
      },
      tenureCompliance: {
        isValid: tenureResult.isValid,
        errors: tenureResult.errors,
        warnings: tenureResult.warnings,
        complianceChecks: tenureResult.complianceChecks,
      },
      overallValid: authorizationResult.isValid && tenureResult.isValid,
    })
  })
})

