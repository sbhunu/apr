/**
 * Submit Objection API Route
 * Submits a new objection during the objection window
 */

import { NextRequest, NextResponse } from 'next/server'
import { submitObjection, ObjectionSubmissionData } from '@/lib/operations/objections'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/objections/submit - Submit an objection
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()

  const objectionData: ObjectionSubmissionData = {
    planningPlanId: body.planningPlanId,
    objectorName: body.objectorName,
    objectorIdNumber: body.objectorIdNumber,
    objectorContactEmail: body.objectorContactEmail,
    objectorContactPhone: body.objectorContactPhone,
    objectorAddress: body.objectorAddress,
    objectionType: body.objectionType,
    description: body.description,
    supportingDocuments: body.supportingDocuments,
  }

  const result = await submitObjection(objectionData)

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
    objectionId: result.objectionId,
  })
})

