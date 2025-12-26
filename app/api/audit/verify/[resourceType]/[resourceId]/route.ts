/**
 * Verify Audit Trail Integrity API Route
 * Verifies hash chain integrity for audit trail
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { verifyAuditTrailIntegrity } from '@/lib/audit/audit-service'
import { withErrorHandler } from '@/lib/api-error-handler'
import { ResourceType } from '@/lib/audit/types'

/**
 * GET /api/audit/verify/[resourceType]/[resourceId] - Verify audit trail integrity
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['audit:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ resourceType: string; resourceId: string }> }
) => {
  return withErrorHandler(async () => {
    const { resourceType, resourceId } = await params
    const result = await verifyAuditTrailIntegrity(
      resourceType as ResourceType,
      resourceId
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors?.[0] || 'Failed to verify audit trail integrity',
          errors: result.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      valid: result.valid,
      tamperDetected: result.tamperDetected,
      errors: result.errors,
    })
  })
})

