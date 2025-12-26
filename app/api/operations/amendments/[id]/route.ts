/**
 * Get Amendment API Route
 * Returns details for a specific amendment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * GET /api/operations/amendments/[id] - Get amendment details
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['operations:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id: amendmentId } = await params

    const supabase = await createClient()

    const { data: amendment, error } = await supabase
      .from('apr.scheme_amendments')
      .select(`
        id,
        amendment_type,
        description,
        reason,
        affected_section_ids,
        new_section_count,
        status,
        metadata,
        apr.sectional_schemes!inner(
          scheme_number
        )
      `)
      .eq('id', amendmentId)
      .single()

    if (error || !amendment) {
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Amendment not found',
        },
        { status: 404 }
      )
    }

    const amendmentAny = amendment as any
    const metadata = (amendmentAny.metadata as Record<string, unknown>) || {}

    return NextResponse.json({
      success: true,
      amendment: {
        id: amendmentAny.id,
        schemeNumber: (amendmentAny.sectional_schemes as any)?.scheme_number || '',
        amendmentType: amendmentAny.amendment_type,
        description: amendmentAny.description,
        reason: amendmentAny.reason,
        affectedSectionIds: amendmentAny.affected_section_ids || [],
        newSectionCount: amendmentAny.new_section_count || 0,
        status: amendmentAny.status,
        newSections: metadata.newSections || [],
        validationWarnings: metadata.validationWarnings || [],
      },
    })
  })
})

