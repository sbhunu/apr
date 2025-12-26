/**
 * Upload Parent Parcel Geometry API Route
 * Handles coordinate file upload and geometry storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { uploadParentParcelGeometry } from '@/lib/survey/parent-parcel-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/parent-parcel/upload - Upload parent parcel geometry
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, coordinates, datum, projection } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least 3 coordinates are required',
        },
        { status: 400 }
      )
    }

    const result = await uploadParentParcelGeometry(
      surveyPlanId,
      coordinates,
      datum || 'WGS84',
      projection || 'UTM Zone 35S',
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
      resourceId: result.geometryId,
      metadata: {
        action: 'upload_parent_parcel',
        surveyPlanId,
        coordinateCount: coordinates.length,
        datum,
        projection,
      },
    })

    return NextResponse.json({
      success: true,
      geometryId: result.geometryId,
      message: 'Parent parcel geometry uploaded successfully',
    })
  })
})

