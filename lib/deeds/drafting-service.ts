/**
 * Deeds Drafting Service
 * Handles drafting and saving of title deeds
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { TitleDraft, DeedsPacket, SectionData, HolderData } from './types'
import { generateCompleteLegalDescription } from './legal-description-templates'
import { ValidationError } from '@/lib/errors/base'

/**
 * Validate draft against sealed survey data
 */
export async function validateDraftAgainstSurvey(
  sectionId: string,
  draft: TitleDraft
): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  return monitor('validate_draft_against_survey', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get section from database
      const { data: section, error: sectionError } = await supabase
        .from('apr.sections')
        .select(`
          id,
          section_number,
          area,
          participation_quota,
          apr.sectional_schemes!inner(
            id,
            scheme_number,
            scheme_name,
            apr.survey_sectional_plans!inner(
              id,
              status,
              seal_hash
            )
          )
        `)
        .eq('id', sectionId)
        .single()

      if (sectionError || !section) {
        return {
          isValid: false,
          errors: ['Section not found'],
          warnings: [],
        }
      }

      // Verify survey is sealed
      const surveyPlan = section.sectional_schemes?.survey_sectional_plans
      if (!surveyPlan || surveyPlan.status !== 'sealed') {
        errors.push('Survey plan must be sealed before drafting deeds')
      }

      if (!surveyPlan?.seal_hash) {
        errors.push('Survey plan seal hash is missing')
      }

      // Validate section number matches
      if (draft.sectionNumber !== section.section_number) {
        errors.push(
          `Section number mismatch: draft has "${draft.sectionNumber}", database has "${section.section_number}"`
        )
      }

      // Validate area matches (allow small tolerance)
      const areaMatch = draft.legalDescription.match(/(\d+\.?\d*)\s*m²/)
      const describedArea = areaMatch?.[1] ? parseFloat(areaMatch[1]) : 0
      const areaDiff = Math.abs(describedArea - section.area)
      if (areaDiff > 0.01) {
        warnings.push(
          `Area in legal description (${describedArea.toFixed(2)} m²) differs from survey area (${section.area} m²)`
        )
      }

      // Validate quota matches
      const quotaMatch = draft.legalDescription.match(/(\d+\.?\d*)%/)?.[1]
      if (quotaMatch) {
        const draftQuota = parseFloat(quotaMatch)
        const quotaDiff = Math.abs(draftQuota - section.participation_quota)
        if (quotaDiff > 0.0001) {
          warnings.push(
            `Quota in legal description (${draftQuota.toFixed(4)}%) differs from survey quota (${section.participation_quota.toFixed(4)}%)`
          )
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error) {
      logger.error('Exception validating draft', error as Error, { sectionId })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Save title draft
 */
export async function saveTitleDraft(
  draft: TitleDraft,
  userId: string
): Promise<{
  success: boolean
  draftId?: string
  error?: string
}> {
  return monitor('save_title_draft', async () => {
    const supabase = await createClient()

    try {
      // Validate draft
      const validation = await validateDraftAgainstSurvey(draft.sectionId, draft)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join('; ')}`,
        }
      }

      // Check if draft already exists
      const { data: existing } = await supabase
        .from('apr.sectional_titles')
        .select('id')
        .eq('section_id', draft.sectionId)
        .eq('registration_status', 'draft')
        .single()

      const now = new Date().toISOString()

      if (existing) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('apr.sectional_titles')
          .update({
            holder_name: draft.holder.holderName,
            holder_type: draft.holder.holderType,
            holder_id_number: draft.holder.holderIdNumber,
            conditions: draft.conditions || draft.rightsAndConditions,
            restrictions: draft.restrictions,
            encumbrances: draft.encumbrances || [],
            updated_at: now,
            updated_by: userId,
            metadata: {
              legalDescription: draft.legalDescription,
              rightsAndConditions: draft.rightsAndConditions,
              validationWarnings: validation.warnings,
            },
          })
          .eq('id', existing.id)

        if (updateError) {
          return {
            success: false,
            error: `Failed to update draft: ${updateError.message}`,
          }
        }

        return {
          success: true,
          draftId: existing.id,
        }
      } else {
        // Create new draft
        const { data: newDraft, error: createError } = await supabase
          .from('apr.sectional_titles')
          .insert({
            section_id: draft.sectionId,
            title_number: `DRAFT-${Date.now()}`, // Temporary draft number
            holder_name: draft.holder.holderName,
            holder_type: draft.holder.holderType,
            holder_id_number: draft.holder.holderIdNumber,
            registration_status: 'draft',
            conditions: draft.conditions || draft.rightsAndConditions,
            restrictions: draft.restrictions,
            encumbrances: draft.encumbrances || [],
            created_by: userId,
            updated_by: userId,
            metadata: {
              legalDescription: draft.legalDescription,
              rightsAndConditions: draft.rightsAndConditions,
              validationWarnings: validation.warnings,
            },
          })
          .select('id')
          .single()

        if (createError) {
          return {
            success: false,
            error: `Failed to create draft: ${createError.message}`,
          }
        }

        return {
          success: true,
          draftId: newDraft.id,
        }
      }
    } catch (error) {
      logger.error('Exception saving title draft', error as Error, { draft, userId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get available sections for drafting
 */
export async function getAvailableSectionsForDrafting(
  schemeId?: string
): Promise<{
  success: boolean
  sections?: SectionData[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    // First get sealed survey plans
    const { data: sealedSurveys, error: surveysError } = await supabase
      .from('survey_sectional_plans')
      .select('id, planning_plan_id, status, seal_hash')
      .eq('status', 'sealed')

    if (surveysError) {
      return {
        success: false,
        error: surveysError.message,
      }
    }

    if (!sealedSurveys || sealedSurveys.length === 0) {
      return {
        success: true,
        sections: [],
      }
    }

    const surveyPlanIds = sealedSurveys.map((s) => s.id)

    // Get schemes linked to these sealed surveys
    const { data: schemes, error: schemesError } = await supabase
      .from('sectional_schemes')
      .select('id, scheme_number, scheme_name, survey_plan_id')
      .in('survey_plan_id', surveyPlanIds)

    if (schemesError) {
      return {
        success: false,
        error: schemesError.message,
      }
    }

    if (!schemes || schemes.length === 0) {
      return {
        success: true,
        sections: [],
      }
    }

    // Filter by schemeId if provided
    const filteredSchemes = schemeId
      ? schemes.filter((s) => s.id === schemeId)
      : schemes

    if (filteredSchemes.length === 0) {
      return {
        success: true,
        sections: [],
      }
    }

    const filteredSchemeIds = filteredSchemes.map((s) => s.id)

    // Get planning plan IDs for location data
    const planningPlanIds = sealedSurveys
      .map((s) => s.planning_plan_id)
      .filter((id): id is string => id !== null)

    const planningPlansMap = new Map<string, { location: string }>()
    if (planningPlanIds.length > 0) {
      const { data: planningPlans } = await supabase
        .from('sectional_scheme_plans')
        .select('id, location')
        .in('id', planningPlanIds)

      if (planningPlans) {
        for (const plan of planningPlans) {
          planningPlansMap.set(plan.id, { location: plan.location || '' })
        }
      }
    }

    // Create survey to planning plan map
    const surveyToPlanningMap = new Map<string, string>()
    for (const survey of sealedSurveys) {
      if (survey.planning_plan_id) {
        surveyToPlanningMap.set(survey.id, survey.planning_plan_id)
      }
    }

    // Then get sections from those schemes
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select(`
        id,
        section_number,
        area,
        participation_quota,
        section_type,
        scheme_id
      `)
      .in('scheme_id', filteredSchemeIds)

    if (sectionsError) {
      return {
        success: false,
        error: sectionsError.message,
      }
    }

    // Create scheme map for lookup
    const schemeMap = new Map<string, { schemeNumber: string; schemeName: string; location: string }>()
    
    for (const scheme of filteredSchemes) {
      // Find the survey plan for this scheme
      const surveyPlan = sealedSurveys.find((s) => s.id === scheme.survey_plan_id)
      const planningPlanId = surveyPlan ? surveyToPlanningMap.get(surveyPlan.id) : null
      const planningPlan = planningPlanId ? planningPlansMap.get(planningPlanId) : null

      schemeMap.set(scheme.id, {
        schemeNumber: scheme.scheme_number || '',
        schemeName: scheme.scheme_name || '',
        location: planningPlan?.location || '',
      })
    }

    const sectionData: SectionData[] =
      sections?.map((s: any) => {
        const schemeData = schemeMap.get(s.scheme_id) || {
          schemeNumber: '',
          schemeName: '',
          location: '',
        }
        return {
          id: s.id,
          sectionNumber: s.section_number,
          area: s.area,
          quota: s.participation_quota,
          schemeNumber: schemeData.schemeNumber,
          schemeName: schemeData.schemeName,
          location: schemeData.location,
          sectionType: s.section_type,
          schemeId: s.scheme_id, // Include scheme ID for map integration
        }
      }) || []

    return {
      success: true,
      sections: sectionData,
    }
  } catch (error) {
    logger.error('Exception getting available sections', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get title draft
 */
export async function getTitleDraft(
  sectionId: string
): Promise<{
  success: boolean
  draft?: TitleDraft
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: title, error } = await supabase
      .from('apr.sectional_titles')
      .select('*')
      .eq('section_id', sectionId)
      .eq('registration_status', 'draft')
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - acceptable for new drafts
      return {
        success: false,
        error: error.message,
      }
    }

    if (!title) {
      return {
        success: true,
        draft: undefined,
      }
    }

    const metadata = (title.metadata as Record<string, unknown>) || {}

    const draft: TitleDraft = {
      id: title.id,
      sectionId: title.section_id,
      sectionNumber: '', // Will be populated from section
      legalDescription: metadata.legalDescription as string || '',
      rightsAndConditions: metadata.rightsAndConditions as string || '',
      restrictions: title.restrictions || '',
      holder: {
        holderName: title.holder_name,
        holderType: title.holder_type as HolderData['holderType'],
        holderIdNumber: title.holder_id_number || undefined,
      },
      conditions: title.conditions || undefined,
      encumbrances: (title.encumbrances as TitleDraft['encumbrances']) || [],
      status: title.registration_status as TitleDraft['status'],
      createdAt: title.created_at,
      updatedAt: title.updated_at,
    }

    return {
      success: true,
      draft,
    }
  } catch (error) {
    logger.error('Exception getting title draft', error as Error, { sectionId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

