/**
 * Verify Certificate API Route
 * Verifies certificate authenticity via hash
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/deeds/certificates/verify - Verify certificate
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const titleId = searchParams.get('titleId')
  const hash = searchParams.get('hash')

  if (!titleId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Title ID is required',
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get title with certificate information
  const { data: title, error } = await supabase
    .from('apr.sectional_titles')
    .select(`
      id,
      title_number,
      registration_date,
      holder_name,
      certificate_hash,
      apr.sections!inner(
        section_number,
        apr.sectional_schemes!inner(
          scheme_name
        )
      )
    `)
    .eq('id', titleId)
    .single()

  if (error || !title) {
    return NextResponse.json(
      {
        success: false,
        error: 'Title not found',
      },
      { status: 404 }
    )
  }

  const titleAny = title as any

  if (!titleAny.certificate_hash) {
    return NextResponse.json(
      {
        success: false,
        error: 'Certificate not yet generated',
      },
      { status: 404 }
    )
  }

  // Verify hash if provided
  const isValid = hash ? titleAny.certificate_hash === hash : true

  const section = titleAny.sections as any
  const scheme = section?.sectional_schemes

  return NextResponse.json({
    success: true,
    certificate: {
      titleNumber: titleAny.title_number || '',
      schemeName: scheme?.scheme_name || '',
      sectionNumber: section?.section_number || '',
      holderName: titleAny.holder_name,
      registrationDate: titleAny.registration_date || '',
      certificateHash: titleAny.certificate_hash,
      isValid,
    },
  })
})

