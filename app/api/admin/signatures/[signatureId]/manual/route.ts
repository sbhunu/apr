/**
 * Manual Signature API Route
 * Applies manual signature to a pending signature record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { applyManualSignature } from '@/lib/signatures/manual-signature-service'
import { ManualSignatureData } from '@/lib/pki/types'

export const POST = createRBACMiddleware({
  requiredPermissions: ['admin:write'],
})(
  async (
    request: NextRequest,
    userId: string,
    { params }: { params: Promise<{ signatureId: string }> }
  ) => {
    return withErrorHandler(async () => {
      const { signatureId } = await params
      const body = await request.json()

      const manualData: ManualSignatureData = {
        signerName: body.signerName,
        signerRole: body.signerRole,
        signerId: body.signerId,
        signedAt: body.signedAt || new Date().toISOString(),
        signatureImage: body.signatureImage,
        witnessName: body.witnessName,
        witnessId: body.witnessId,
        notes: body.notes,
      }

      // Validate required fields
      if (!manualData.signerName || !manualData.signerRole || !manualData.signerId) {
        return NextResponse.json(
          {
            success: false,
            error: 'signerName, signerRole, and signerId are required',
          },
          { status: 400 }
        )
      }

      const result = await applyManualSignature(signatureId, userId, manualData)
      return NextResponse.json(result)
    })
  }
)

