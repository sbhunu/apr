/**
 * Get Signature Audit Trail API Route
 * Gets audit trail for a signature
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSignatureAuditTrail } from '@/lib/signatures/signature-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/signatures/audit/[signatureId] - Get signature audit trail
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['signatures:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ signatureId: string }> }
) => {
  return withErrorHandler(async () => {
    const { signatureId } = await params

    const result = await getSignatureAuditTrail(signatureId)

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
      auditTrail: result.auditTrail,
    })
  })
})

