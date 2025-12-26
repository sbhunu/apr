/**
 * Mortgage Discharge API Route
 * Discharge/terminate a registered mortgage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { dischargeMortgage, MortgageDischargeData } from '@/lib/operations/mortgages'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/mortgages/[id]/discharge - Discharge a mortgage
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
  requiredRoles: ['deeds_registrar', 'admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const dischargeData: MortgageDischargeData = {
      mortgageId: id,
      dischargeDate: body.dischargeDate || new Date().toISOString().split('T')[0],
      dischargeReference: body.dischargeReference,
      dischargeDocumentId: body.dischargeDocumentId,
      registrarSignatureId: body.registrarSignatureId,
    }

    const result = await dischargeMortgage(dischargeData)

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
      dischargedAt: result.dischargedAt,
    })
  })
})

