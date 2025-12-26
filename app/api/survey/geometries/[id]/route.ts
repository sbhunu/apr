/**
 * Get Sectional Geometries API Route
 * Retrieves sectional geometries for a survey plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSectionalGeometries } from '@/lib/survey/sectional-geometry-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/survey/geometries/[id] - Get sectional geometries
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
    const result = await getSectionalGeometries(id)

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
      geometries: result.geometries,
    })
  })
})

