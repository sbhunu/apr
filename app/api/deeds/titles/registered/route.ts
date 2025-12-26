/**
 * Get Registered Titles API Route
 * Returns list of registered titles
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

/**
 * GET /api/deeds/titles/registered - Get registered titles
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const supabase = await createClient()

    try {
      // Get registered titles
      const { data: titles, error: titlesError } = await supabase
        .from('sectional_titles')
        .select('id, title_number, holder_name, registration_date, section_id')
        .eq('registration_status', 'registered')
        .order('registration_date', { ascending: false })

      if (titlesError) {
        return NextResponse.json(
          {
            success: false,
            error: titlesError.message,
          },
          { status: 400 }
        )
      }

      if (!titles || titles.length === 0) {
        return NextResponse.json({
          success: true,
          titles: [],
        })
      }

      // Get section IDs
      const sectionIds = titles
        .map((t: any) => t.section_id)
        .filter((id): id is string => id !== null && id !== '')

      if (sectionIds.length === 0) {
        return NextResponse.json({
          success: true,
          titles: titles.map((t: any) => ({
            id: t.id,
            titleNumber: t.title_number || 'DRAFT',
            sectionNumber: '',
            holderName: t.holder_name,
            registrationDate: t.registration_date || '',
            schemeNumber: '',
          })),
        })
      }

      // Get sections with scheme IDs
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_number, scheme_id')
        .in('id', sectionIds)

      if (sectionsError) {
        return NextResponse.json(
          {
            success: false,
            error: sectionsError.message,
          },
          { status: 400 }
        )
      }

      // Create section map
      const sectionMap = new Map<string, { sectionNumber: string; schemeId: string }>()
      for (const section of sections || []) {
        sectionMap.set(section.id, {
          sectionNumber: section.section_number || '',
          schemeId: section.scheme_id || '',
        })
      }

      // Get scheme IDs
      const schemeIds = Array.from(sectionMap.values())
        .map((s) => s.schemeId)
        .filter((id): id is string => id !== null && id !== '')

      // Get schemes
      const { data: schemes, error: schemesError } = await supabase
        .from('sectional_schemes')
        .select('id, scheme_number')
        .in('id', schemeIds)

      if (schemesError) {
        return NextResponse.json(
          {
            success: false,
            error: schemesError.message,
          },
          { status: 400 }
        )
      }

      // Create scheme map
      const schemeMap = new Map<string, string>()
      for (const scheme of schemes || []) {
        schemeMap.set(scheme.id, scheme.scheme_number || '')
      }

      // Combine data
      const titlesWithDetails = titles.map((t: any) => {
        const sectionData = sectionMap.get(t.section_id)
        const schemeNumber = sectionData?.schemeId ? schemeMap.get(sectionData.schemeId) || '' : ''

        return {
          id: t.id,
          titleNumber: t.title_number || 'DRAFT',
          sectionNumber: sectionData?.sectionNumber || '',
          holderName: t.holder_name,
          registrationDate: t.registration_date || '',
          schemeNumber,
        }
      })

      return NextResponse.json({
        success: true,
        titles: titlesWithDetails,
      })
    } catch (error) {
      logger.error('Exception getting registered titles', error as Error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  })
})

