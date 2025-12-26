/**
 * Generate Sectional Geometries API Route
 * Generates unit geometries from plan specifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { generateAndStoreSectionalGeometries } from '@/lib/survey/sectional-geometry-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { UnitSpecification } from '@/lib/survey/geometry-generator'

/**
 * POST /api/survey/geometries/generate - Generate sectional geometries
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, unitSpecifications } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    const specs: UnitSpecification[] = unitSpecifications || []

    const result = await generateAndStoreSectionalGeometries(
      surveyPlanId,
      specs,
      userId
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'create', 'survey', {
      resourceId: surveyPlanId,
      metadata: {
        action: 'generate_sectional_geometries',
        unitCount: result.result?.units.length || 0,
        commonPropertyArea: result.result?.commonProperty.area || 0,
        validationPassed: result.result?.validation.allContained && result.result?.validation.noOverlaps,
      },
    })

    return NextResponse.json({
      success: true,
      result: result.result,
      message: 'Sectional geometries generated successfully',
    })
  })
})

