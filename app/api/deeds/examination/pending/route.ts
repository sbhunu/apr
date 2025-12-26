/**
 * Get Pending Titles API Route
 * Returns list of titles awaiting examination
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingTitlesForExamination } from '@/lib/deeds/examination-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/examination/pending - Get pending titles
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
  requiredRoles: ['deeds_examiner', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const result = await getPendingTitlesForExamination()

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

