/**
 * Get Certificate API Route
 * Returns certificate information for a title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getTitleCertificate, regenerateCertificate } from '@/lib/deeds/certificate-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/certificates/[titleId] - Get certificate
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ titleId: string }> }
) => {
  return withErrorHandler(async () => {
    const { titleId } = await params

    const result = await getTitleCertificate(titleId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      certificateUrl: result.certificateUrl,
      certificateHash: result.certificateHash,
      qrCode: result.qrCode,
      verificationUrl: result.verificationUrl,
    })
  })
})

/**
 * POST /api/deeds/certificates/[titleId] - Regenerate certificate
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:update'],
  requiredRoles: ['admin', 'registrar'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ titleId: string }> }
) => {
  return withErrorHandler(async () => {
    const { titleId } = await params
    const body = await request.json()
    const { reason, templateVersion, includeQRCode, includeSignature } = body

    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Regeneration reason is required',
        },
        { status: 400 }
      )
    }

    const result = await regenerateCertificate(titleId, reason, {
      templateVersion,
      includeQRCode: includeQRCode !== false,
      includeSignature: includeSignature !== false,
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

    await logActivity(userId, 'update', 'deeds', {
      resourceId: titleId,
      metadata: {
        action: 'certificate_regeneration',
        reason,
        certificateHash: result.certificateHash,
      },
    })

    return NextResponse.json({
      success: true,
      certificateUrl: result.certificateUrl,
      certificateHash: result.certificateHash,
      qrCode: result.qrCode,
      verificationUrl: result.verificationUrl,
      message: 'Certificate regenerated successfully',
    })
  })
})

