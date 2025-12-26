/**
 * Get Title API Route
 * Returns details for a specific title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/titles/[id] - Get title details
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ titleId: string }> }
) => {
  return withErrorHandler(async () => {
    const { titleId } = await params

    const supabase = await createClient()

    const { data: title, error } = await supabase
      .from('apr.sectional_titles')
      .select(`
        id,
        title_number,
        holder_name,
        registration_status,
        apr.sections!inner(
          section_number,
          apr.sectional_schemes!inner(
            scheme_number
          )
        )
      `)
      .eq('id', titleId)
      .single()

    if (error || !title) {
      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Title not found',
        },
        { status: 404 }
      )
    }

    const titleAny = title as any

    return NextResponse.json({
      success: true,
      title: {
        id: titleAny.id,
        titleNumber: titleAny.title_number,
        sectionNumber: (titleAny.sections as any)?.section_number || '',
        holderName: titleAny.holder_name,
        schemeNumber: (titleAny.sections as any)?.sectional_schemes?.scheme_number || '',
        registrationStatus: titleAny.registration_status,
      },
    })
  })
})

