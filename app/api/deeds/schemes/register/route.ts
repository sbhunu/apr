/**
 * Register a sectional scheme (Module 3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { registerSectionalScheme, SchemeRegistrationData } from '@/lib/deeds/scheme-registration'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logActivity } from '@/lib/admin/rbac'

export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const registrationData: SchemeRegistrationData = {
      surveyPlanId: body.surveyPlanId,
      schemeName: body.schemeName,
      provinceCode: body.provinceCode,
      communalLandId: body.communalLandId,
      communalLandCustodianName: body.communalLandCustodianName,
      registrationDate: body.registrationDate,
      initialTrustees: body.initialTrustees,
      registeredAddress: body.registeredAddress,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
    }

    if (!registrationData.surveyPlanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Survey Plan ID is required',
        },
        { status: 400 }
      )
    }

    if (!registrationData.schemeName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scheme name is required',
        },
        { status: 400 }
      )
    }

    if (!registrationData.provinceCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Province code is required',
        },
        { status: 400 }
      )
    }

    const result = await registerSectionalScheme(registrationData)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'create', 'scheme', {
      resourceId: result.schemeId,
      metadata: {
        action: 'register_sectional_scheme',
        schemeNumber: result.schemeNumber,
        surveyPlanId: registrationData.surveyPlanId,
        bodyCorporateId: result.bodyCorporateId,
      },
    })

    return NextResponse.json({
      success: true,
      schemeId: result.schemeId,
      schemeNumber: result.schemeNumber,
      bodyCorporateId: result.bodyCorporateId,
      bodyCorporateNumber: result.bodyCorporateNumber,
    })
  })
})

