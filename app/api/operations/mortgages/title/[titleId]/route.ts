/**
 * Get Mortgages for Title API Route
 * Returns all mortgages registered against a specific title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getTitleMortgages } from '@/lib/operations/mortgages'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/mortgages/title/[titleId] - Get mortgages for a title
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ titleId: string }> }) => {
  return withErrorHandler(async () => {
    const { titleId } = await params
    const result = await getTitleMortgages(titleId)

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
      mortgages: result.mortgages || [],
    })
  })
})

