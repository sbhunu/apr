/**
 * Survey Verification Route
 * Returns sealed survey details for verification portals.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api-error-handler'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/survey/verify/[planNumber]
 */
export const GET = async (
  request: NextRequest,
  _context: { params: Promise<{ planNumber: string }> }
) => {
  return withErrorHandler(async () => {
    const { planNumber } = await _context.params

    const supabase = await createClient()

    const { data: plan, error: planError } = await supabase
      .from('survey_sectional_plans')
      .select(
        'id, plan_number, planner_name, status, submitted_at, approved_at, sealed_at, seal_hash, metadata'
      )
      .eq('plan_number', planNumber)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sealed survey not found',
        },
        { status: 404 }
      )
    }

    const { data: signatures, error: signatureError } = await supabase
      .from('digital_signatures')
      .select(
        'signature_id, signature_status, signature_value, certificate_serial, signed_at, signer_name, signer_role'
      )
      .eq('document_id', plan.id)
      .order('signed_at', { ascending: false })

    if (signatureError) {
      return NextResponse.json(
        {
          success: false,
          error: signatureError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      survey: plan,
      signatures: signatures || [],
    })
  })
}

