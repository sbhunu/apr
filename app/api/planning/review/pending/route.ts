/**
 * Pending Reviews API Route
 * Returns schemes pending review
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPendingSchemes } from '@/lib/planning/review-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/planning/review/pending - Get pending schemes
 */
export const GET = createRBACMiddleware({
  requiredRole: 'planning_authority',
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const result = await getPendingSchemes({
      reviewerId: userId,
      status: status || undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    await logActivity(userId, 'read', 'planning', {
      metadata: { action: 'list_pending_reviews', count: result.schemes?.length || 0 },
    })

    return NextResponse.json({
      success: true,
      schemes: result.schemes,
    })
  })
})

