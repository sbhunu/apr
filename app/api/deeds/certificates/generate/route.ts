/**
 * Generate Certificate API Route
 * Generates certificate for a registered title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { generateTitleCertificate } from '@/lib/deeds/certificate-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/deeds/certificates/generate - Generate certificate
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { titleId, templateId, templateVersion, includeQRCode, includeSignature } = body

    if (!titleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title ID is required',
        },
        { status: 400 }
      )
    }

    const result = await generateTitleCertificate(titleId, {
      templateVersion: templateId || templateVersion, // Support both for backward compatibility
      includeQRCode: includeQRCode !== false, // Default to true
      includeSignature: includeSignature !== false, // Default to true
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'create', 'deeds', {
      resourceId: titleId,
      metadata: {
        action: 'certificate_generation',
        certificateHash: result.certificateHash,
      },
    })

    return NextResponse.json({
      success: true,
      certificateUrl: result.certificateUrl,
      certificateHash: result.certificateHash,
      qrCode: result.qrCode,
      verificationUrl: result.verificationUrl,
      digitalSignatureId: result.digitalSignatureId,
      message: 'Certificate generated successfully',
    })
  })
})

