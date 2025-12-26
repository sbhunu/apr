/**
 * Validate Transfer API Route
 * Validates transfer submission data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { validateTransferSubmission } from '@/lib/operations/transfers'
import { withErrorHandler } from '@/lib/api-error-handler'
import { TransferSubmissionData } from '@/lib/operations/transfers'

/**
 * POST /api/operations/transfers/validate - Validate transfer submission
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['operations:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const data = body as TransferSubmissionData

    const result = await validateTransferSubmission(data)

    return NextResponse.json({
      success: true,
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      stampDuty: result.stampDuty,
      currentHolder: result.currentHolder,
    })
  })
})

