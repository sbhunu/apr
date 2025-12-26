/**
 * Generate Compliance Report API Route
 * Generates compliance reports for legal proceedings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { generateComplianceReport } from '@/lib/audit/audit-service'
import { withErrorHandler } from '@/lib/api-error-handler'
import { ResourceType } from '@/lib/audit/types'

/**
 * POST /api/audit/compliance - Generate compliance report
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['audit:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { entityType, entityId, startDate, endDate, includeArchived } = body

    if (!entityType || !entityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'entityType and entityId are required',
        },
        { status: 400 }
      )
    }

    const result = await generateComplianceReport({
      entityType: entityType as ResourceType,
      entityId,
      startDate,
      endDate,
      includeArchived: includeArchived || false,
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

    return NextResponse.json({
      success: true,
      report: result.report,
    })
  })
})

