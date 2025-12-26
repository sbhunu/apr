/**
 * Scheme Selection Service for Module 4
 * Helps conveyancers select registered schemes with sealed surveys for drafting
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Scheme available for drafting
 */
export interface DraftableScheme {
  id: string
  scheme_number: string
  scheme_name: string
  registration_date: string
  survey_plan_id: string
  survey_number: string
  sealed_at: string
  seal_hash: string
  section_count: number
  location?: string
  province_code?: string
  body_corporate_id?: string
}

/**
 * Get registered schemes with sealed surveys available for drafting
 */
export async function getDraftableSchemes(): Promise<{
  success: boolean
  schemes?: DraftableScheme[]
  error?: string
}> {
  return monitor('get_draftable_schemes', async () => {
    const supabase = await createClient()

    try {
      // Get registered schemes with sealed surveys
      const { data: schemes, error } = await supabase
        .from('sectional_schemes')
        .select(`
          id,
          scheme_number,
          scheme_name,
          registration_date,
          survey_plan_id,
          body_corporate_id,
          metadata,
          survey_sectional_plans!inner(
            id,
            survey_number,
            sealed_at,
            seal_hash,
            status
          ),
          sectional_scheme_plans!inner(
            location_name
          )
        `)
        .eq('status', 'registered')
        .eq('survey_sectional_plans.status', 'sealed')
        .not('survey_sectional_plans.sealed_at', 'is', null)
        .order('registration_date', { ascending: false })

      if (error) {
        logger.error('Failed to get draftable schemes', error, {})
        return {
          success: false,
          error: error.message,
        }
      }

      // Get section counts for each scheme
      const schemeIds = schemes?.map((s: any) => s.id) || []
      const { data: sectionCounts } = await supabase
        .from('sections')
        .select('scheme_id')
        .in('scheme_id', schemeIds)

      const countsByScheme = new Map<string, number>()
      sectionCounts?.forEach((s: any) => {
        countsByScheme.set(s.scheme_id, (countsByScheme.get(s.scheme_id) || 0) + 1)
      })

      // Transform to DraftableScheme format
      const draftableSchemes: DraftableScheme[] =
        schemes?.map((s: any) => {
          const survey = s.survey_sectional_plans
          const planning = s.sectional_scheme_plans
          const metadata = (s.metadata as Record<string, unknown>) || {}

          return {
            id: s.id,
            scheme_number: s.scheme_number,
            scheme_name: s.scheme_name,
            registration_date: s.registration_date,
            survey_plan_id: s.survey_plan_id,
            survey_number: survey?.survey_number || '',
            sealed_at: survey?.sealed_at || '',
            seal_hash: survey?.seal_hash || '',
            section_count: countsByScheme.get(s.id) || 0,
            location: planning?.location_name || metadata.location as string,
            province_code: metadata.province_code as string,
            body_corporate_id: s.body_corporate_id,
          }
        }) || []

      return {
        success: true,
        schemes: draftableSchemes,
      }
    } catch (error) {
      logger.error('Exception getting draftable schemes', error as Error, {})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get sections for a specific scheme
 */
export async function getSchemeSections(schemeId: string): Promise<{
  success: boolean
  sections?: Array<{
    id: string
    section_number: string
    area: number
    participation_quota: number
    has_draft: boolean
    draft_status?: string
  }>
  error?: string
}> {
  return monitor('get_scheme_sections', async () => {
    const supabase = await createClient()

    try {
      // Get sections for the scheme
      const { data: sections, error } = await supabase
        .from('sections')
        .select(`
          id,
          section_number,
          area,
          participation_quota
        `)
        .eq('scheme_id', schemeId)
        .order('section_number', { ascending: true })

      if (error) {
        logger.error('Failed to get scheme sections', error, { schemeId })
        return {
          success: false,
          error: error.message,
        }
      }

      // Check which sections have drafts
      const sectionIds = sections?.map((s: any) => s.id) || []
      const { data: drafts } = await supabase
        .from('sectional_titles')
        .select('section_id, registration_status')
        .in('section_id', sectionIds)

      const draftMap = new Map<string, string>()
      drafts?.forEach((d: any) => {
        draftMap.set(d.section_id, d.registration_status)
      })

      const sectionsWithDraftStatus =
        sections?.map((s: any) => ({
          id: s.id,
          section_number: s.section_number,
          area: s.area,
          participation_quota: s.participation_quota,
          has_draft: draftMap.has(s.id),
          draft_status: draftMap.get(s.id),
        })) || []

      return {
        success: true,
        sections: sectionsWithDraftStatus,
      }
    } catch (error) {
      logger.error('Exception getting scheme sections', error as Error, { schemeId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

