/**
 * Generate Scheme Plan API Route
 * Generates standardized sectional title scheme plan PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { generateSchemePlan, SchemePlanOptions } from '@/lib/survey/scheme-plan-generator'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/survey/plans/generate - Generate scheme plan PDF
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['survey:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { surveyPlanId, options } = body

    if (!surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    const result = await generateSchemePlan(
      surveyPlanId,
      (options as SchemePlanOptions) || {},
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

    await logActivity(userId, 'read', 'survey', {
      resourceId: surveyPlanId,
      metadata: {
        action: 'generate_scheme_plan',
        pageCount: result.pageCount,
        scale: result.metadata?.scale,
      },
    })

    // Return PDF as base64 for now (in production, upload to storage and return URL)
    const base64Pdf = Buffer.from(result.pdfBuffer!).toString('base64')

    return NextResponse.json({
      success: true,
      pdf: base64Pdf,
      metadata: result.metadata,
      pageCount: result.pageCount,
      message: 'Scheme plan generated successfully',
    })
  })
})

