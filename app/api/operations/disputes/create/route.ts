/**
 * Create Dispute API Route
 * Creates a new dispute record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createDispute, DisputeCreationData } from '@/lib/operations/disputes'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/disputes/create - Create a dispute
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()

  const disputeData: DisputeCreationData = {
    disputeType: body.disputeType,
    titleId: body.titleId,
    schemeId: body.schemeId,
    amendmentId: body.amendmentId,
    complainantName: body.complainantName,
    complainantIdNumber: body.complainantIdNumber,
    complainantContactEmail: body.complainantContactEmail,
    complainantContactPhone: body.complainantContactPhone,
    complainantAddress: body.complainantAddress,
    respondentName: body.respondentName,
    respondentIdNumber: body.respondentIdNumber,
    respondentContactEmail: body.respondentContactEmail,
    respondentContactPhone: body.respondentContactPhone,
    description: body.description,
    supportingDocuments: body.supportingDocuments,
    requestedResolution: body.requestedResolution,
  }

  const result = await createDispute(disputeData)

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
    disputeId: result.disputeId,
  })
})

