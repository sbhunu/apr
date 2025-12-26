/**
 * Validate Amendment API Route
 * Validates amendment submission data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { validateAmendmentSubmission } from '@/lib/operations/amendments'
import { withErrorHandler } from '@/lib/api-error-handler'
import { AmendmentSubmissionData } from '@/lib/operations/amendments'

/**
 * POST /api/operations/amendments/validate - Validate amendment submission
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const data = body as AmendmentSubmissionData

    const result = await validateAmendmentSubmission(data)

    return NextResponse.json({
      success: true,
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      geometryValid: result.geometryValid,
      quotaValid: result.quotaValid,
    })
  })
})

