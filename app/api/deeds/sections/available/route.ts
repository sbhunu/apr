/**
 * Get Available Sections API Route
 * Returns sections from sealed surveys available for drafting
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getAvailableSectionsForDrafting } from '@/lib/deeds/drafting-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/sections/available - Get available sections
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const schemeId = searchParams.get('schemeId') || undefined

    const result = await getAvailableSectionsForDrafting(schemeId)

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
      sections: result.sections,
    })
  })
})

