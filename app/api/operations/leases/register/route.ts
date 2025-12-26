/**
 * Lease Registration API Route
 * Registers a new lease on a sectional title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { registerLease, LeaseRegistrationData } from '@/lib/operations/leases'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/leases/register - Register a new lease
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
  requiredRoles: ['deeds_registrar', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()

    const leaseData: LeaseRegistrationData = {
      titleId: body.titleId,
      lesseeName: body.lesseeName,
      lesseeType: body.lesseeType,
      lesseeIdNumber: body.lesseeIdNumber,
      lesseeContactEmail: body.lesseeContactEmail,
      lesseeContactPhone: body.lesseeContactPhone,
      leaseStartDate: body.leaseStartDate,
      leaseEndDate: body.leaseEndDate,
      monthlyRent: body.monthlyRent,
      rentCurrency: body.rentCurrency || 'USD',
      depositAmount: body.depositAmount,
      renewalOption: body.renewalOption,
      renewalTermMonths: body.renewalTermMonths,
      earlyTerminationAllowed: body.earlyTerminationAllowed,
      terminationNoticeDays: body.terminationNoticeDays,
      leaseAgreementReference: body.leaseAgreementReference,
      leaseAgreementDocumentId: body.leaseAgreementDocumentId,
    }

    const result = await registerLease(leaseData)

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
      leaseId: result.leaseId,
      leaseNumber: result.leaseNumber,
    })
  })
})

