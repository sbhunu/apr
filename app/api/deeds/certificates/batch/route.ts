/**
 * Batch Generate Certificates API Route
 * Generates certificates for multiple titles
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { generateCertificatesBatch } from '@/lib/deeds/certificate-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/deeds/certificates/batch - Batch generate certificates
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
  requiredRoles: ['admin', 'registrar'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { titleIds, templateId, templateVersion, includeQRCode, includeSignature } = body

    if (!titleIds || !Array.isArray(titleIds) || titleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title IDs array is required',
        },
        { status: 400 }
      )
    }

    if (titleIds.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 100 titles per batch',
        },
        { status: 400 }
      )
    }

    const result = await generateCertificatesBatch(titleIds, {
      templateVersion: templateId || templateVersion, // Support both for backward compatibility
      includeQRCode: includeQRCode !== false,
      includeSignature: includeSignature !== false,
    })

    await logActivity(userId, 'create', 'deeds', {
      metadata: {
        action: 'batch_certificate_generation',
        titleCount: titleIds.length,
        successful: result.summary.successful,
        failed: result.summary.failed,
      },
    })

    return NextResponse.json({
      success: result.success,
      results: result.results,
      summary: result.summary,
    })
  })
})

