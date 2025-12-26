/**
 * Get Transfer API Route
 * Returns details for a specific transfer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * GET /api/operations/transfers/[id] - Get transfer details
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['operations:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id: transferId } = await params

    const supabase = await createClient()

    const { data: transfer, error } = await supabase
      .from('apr.ownership_transfers')
      .select(`
        id,
        transfer_type,
        current_holder_name,
        new_holder_name,
        new_holder_type,
        new_holder_id_number,
        consideration_amount,
        consideration_currency,
        transfer_date,
        effective_date,
        transfer_instrument_type,
        transfer_instrument_reference,
        status,
        apr.sectional_titles!inner(
          title_number
        )
      `)
      .eq('id', transferId)
      .single()

    if (error || !transfer) {
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Transfer not found',
        },
        { status: 404 }
      )
    }

    const transferAny = transfer as any
    const metadata = (transferAny.metadata as Record<string, unknown>) || {}

    return NextResponse.json({
      success: true,
      transfer: {
        id: transferAny.id,
        titleNumber: (transferAny.sectional_titles as any)?.title_number || '',
        transferType: transferAny.transfer_type,
        currentHolder: transferAny.current_holder_name,
        newHolder: transferAny.new_holder_name,
        newHolderType: transferAny.new_holder_type,
        newHolderIdNumber: transferAny.new_holder_id_number || undefined,
        considerationAmount: transferAny.consideration_amount || undefined,
        considerationCurrency: transferAny.consideration_currency || 'USD',
        transferDate: transferAny.transfer_date,
        effectiveDate: transferAny.effective_date,
        transferInstrumentType: transferAny.transfer_instrument_type,
        transferInstrumentReference: transferAny.transfer_instrument_reference || undefined,
        status: transferAny.status,
        stampDuty: metadata.stampDuty as number | undefined,
        validationErrors: [],
        validationWarnings: (metadata.validationWarnings as string[]) || [],
      },
    })
  })
})

