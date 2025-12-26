/**
 * Mortgage Registration API Route
 * Registers a new mortgage/charge against a sectional title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { registerMortgage, MortgageRegistrationData } from '@/lib/operations/mortgages'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/mortgages/register - Register a new mortgage
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
  requiredRoles: ['deeds_registrar', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()

    const mortgageData: MortgageRegistrationData = {
      titleId: body.titleId,
      lenderName: body.lenderName,
      lenderType: body.lenderType,
      lenderRegistrationNumber: body.lenderRegistrationNumber,
      lenderContactEmail: body.lenderContactEmail,
      lenderContactPhone: body.lenderContactPhone,
      mortgageAmount: body.mortgageAmount,
      mortgageCurrency: body.mortgageCurrency || 'USD',
      interestRate: body.interestRate,
      termMonths: body.termMonths,
      mortgageDate: body.mortgageDate,
      registrationDate: body.registrationDate || new Date().toISOString().split('T')[0],
      effectiveDate: body.effectiveDate || body.registrationDate || new Date().toISOString().split('T')[0],
      expiryDate: body.expiryDate,
      mortgageDeedReference: body.mortgageDeedReference,
      mortgageDeedDocumentId: body.mortgageDeedDocumentId,
      lenderSignatureId: body.lenderSignatureId,
      borrowerSignatureId: body.borrowerSignatureId,
    }

    const result = await registerMortgage(mortgageData)

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
      mortgageId: result.mortgageId,
      mortgageNumber: result.mortgageNumber,
      priority: result.priority,
    })
  })
})

