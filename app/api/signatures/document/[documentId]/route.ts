/**
 * Get Document Signatures API Route
 * Gets all signatures for a document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getDocumentSignatures } from '@/lib/signatures/signature-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/signatures/document/[documentId] - Get document signatures
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['signatures:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ documentId: string }> }
) => {
  return withErrorHandler(async () => {
    const { documentId } = await params

    const result = await getDocumentSignatures(documentId)

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
      signatures: result.signatures,
    })
  })
})

