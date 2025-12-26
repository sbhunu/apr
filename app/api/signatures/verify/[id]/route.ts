/**
 * Verify Signature API Route
 * Verifies a digital signature
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { verifySignature } from '@/lib/signatures/signature-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/signatures/verify/[id] - Verify signature
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['signatures:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id: signatureId } = await params

    const result = await verifySignature(signatureId)

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
      valid: result.valid,
      verified: result.verified,
      error: result.error,
    })
  })
})

