/**
 * Get Spatial Analysis API Route
 * Returns spatial analytics data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSpatialAnalysis, getProvinceDistribution } from '@/lib/analytics/spatial'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/analytics/spatial - Get spatial analysis
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['analytics:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const province = searchParams.get('province') || undefined
    const distribution = searchParams.get('distribution') === 'true'

    if (distribution) {
      const result = await getProvinceDistribution()
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
        distribution: result.distribution,
      })
    }

    const result = await getSpatialAnalysis({
      province,
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
      analysis: result.analysis,
    })
  })
})

