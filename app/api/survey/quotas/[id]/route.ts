/**
 * Get Participation Quotas API Route
 * Retrieves quotas for a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getQuotas } from '@/lib/survey/quota-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/survey/quotas/[id] - Get participation quotas
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['survey:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getQuotas(id)

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
      quotas: result.quotas,
      validation: result.validation,
    })
  })
})

