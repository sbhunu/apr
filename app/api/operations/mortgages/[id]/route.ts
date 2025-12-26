/**
 * Mortgage Detail API Route
 * Get details for a specific mortgage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getMortgage } from '@/lib/operations/mortgages'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/mortgages/[id] - Get mortgage details
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getMortgage(id)

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
      mortgage: result.mortgage,
    })
  })
})

