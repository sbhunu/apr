/**
 * Get Approved Titles API Route
 * Returns list of titles approved and ready for registration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getApprovedTitlesForRegistration } from '@/lib/deeds/title-registration'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/registration/approved - Get approved titles
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
  requiredRoles: ['registrar', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getApprovedTitlesForRegistration()

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
      titles: result.titles,
    })
  })
})

