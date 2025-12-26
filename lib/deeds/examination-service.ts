/**
 * Deeds Examination Service
 * Handles examination workflow for Deeds Office
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { transitionDeedsState } from '@/lib/workflows/deeds-workflow'
import { DeedState } from '@/types/workflows'
import type { ExaminationChecklistItem } from './examination-checklist'
import { verifySeal } from '@/lib/survey/sealing-service'
import {
  validateCommunalAuthorization,
  validateCommunalTenureCompliance,
} from './communal-validation'

export type { ExaminationChecklistItem } from './examination-checklist'

/**
 * Examination defect
 */
export interface ExaminationDefect {
  id: string
  checklistItemId: string
  title: string
  description: string
  severity: 'error' | 'warning' | 'info'
  category: string
  sectionId?: string
  suggestedCorrection?: string
}

/**
 * Examination result
 */
export interface ExaminationResult {
  isValid: boolean
  defects: ExaminationDefect[]
  warnings: string[]
  checklist: ExaminationChecklistItem[]
  examinedAt: string
  examinedBy: string
}

/**
 * Cross-validate title with sealed survey
 */
export async function crossValidateWithSurvey(
  titleId: string
): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
}> {
  return monitor('cross_validate_with_survey', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get title
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('id, section_id')
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          isValid: false,
          errors: ['Title not found'],
          warnings: [],
        }
      }

      // Get section
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('id, section_number, area, participation_quota, scheme_id')
        .eq('id', title.section_id)
        .single()

      if (sectionError || !section) {
        return {
          isValid: false,
          errors: ['Section not found'],
          warnings: [],
        }
      }

      // Get scheme
      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .select('id, survey_plan_id')
        .eq('id', section.scheme_id)
        .single()

      if (schemeError || !scheme) {
        return {
          isValid: false,
          errors: ['Scheme not found'],
          warnings: [],
        }
      }

      // Get survey plan
      const { data: surveyPlan, error: surveyError } = await supabase
        .from('survey_sectional_plans')
        .select('id, status, seal_hash')
        .eq('id', scheme.survey_plan_id)
        .single()

      if (surveyError || !surveyPlan) {
        return {
          isValid: false,
          errors: ['Survey plan not found'],
          warnings: [],
        }
      }

      // Verify survey is sealed
      if (surveyPlan.status !== 'sealed') {
        errors.push('Survey plan must be sealed before examination')
      }

      // Verify seal hash
      if (surveyPlan.seal_hash) {
        const sealVerification = await verifySeal(surveyPlan.id)
        if (!sealVerification.isValid) {
          errors.push(`Survey seal verification failed: ${sealVerification.error}`)
        }
      } else {
        errors.push('Survey plan seal hash is missing')
      }

      // Get legal description from metadata
      const { data: titleWithMetadata } = await supabase
        .from('sectional_titles')
        .select('metadata')
        .eq('id', titleId)
        .single()

      const metadata = (titleWithMetadata?.metadata as Record<string, unknown>) || {}
      const legalDescription = (metadata.legalDescription as string) || ''

      // Validate area matches
      const areaMatch = legalDescription.match(/(\d+\.?\d*)\s*m²/)
      if (areaMatch) {
        const describedArea = parseFloat(areaMatch[1])
        const surveyArea = section.area || 0
        const areaDiff = Math.abs(describedArea - surveyArea)
        if (areaDiff > 0.01) {
          errors.push(
            `Area mismatch: Legal description has ${describedArea.toFixed(2)} m², survey has ${surveyArea.toFixed(2)} m²`
          )
        }
      } else {
        warnings.push('Area not found in legal description')
      }

      // Validate quota matches
      const quotaMatch = legalDescription.match(/(\d+\.?\d*)\s*%/)
      if (quotaMatch) {
        const describedQuota = parseFloat(quotaMatch[1])
        const surveyQuota = section.participation_quota || 0
        const quotaDiff = Math.abs(describedQuota - surveyQuota)
        if (quotaDiff > 0.0001) {
          errors.push(
            `Quota mismatch: Legal description has ${describedQuota.toFixed(4)}%, survey has ${surveyQuota.toFixed(4)}%`
          )
        }
      } else {
        warnings.push('Participation quota not found in legal description')
      }

      // Validate section number matches
      const sectionNumberMatch = legalDescription.match(/Section\s+(\w+)/i)
      if (sectionNumberMatch) {
        const describedSection = sectionNumberMatch[1].toUpperCase()
        const surveySection = section?.section_number?.toUpperCase() || ''
        if (describedSection !== surveySection) {
          errors.push(
            `Section number mismatch: Legal description has "${describedSection}", survey has "${surveySection}"`
          )
        }
      } else {
        warnings.push('Section number not found in legal description')
      }

      // Cross-validate communal authorization
      const communalValidation = await validateCommunalAuthorization(titleId)
      if (!communalValidation.isValid) {
        errors.push(...communalValidation.errors)
      }
      warnings.push(...communalValidation.warnings)

      // Validate communal tenure compliance
      const tenureValidation = await validateCommunalTenureCompliance(titleId)
      if (!tenureValidation.isValid) {
        errors.push(...tenureValidation.errors)
      }
      warnings.push(...tenureValidation.warnings)

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error) {
      logger.error('Exception cross-validating with survey', error as Error, {
        titleId,
      })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Submit examination decision
 */
export async function submitExaminationDecision(
  titleId: string,
  decision: 'approve' | 'reject' | 'request_revision',
  userId: string,
  notes?: string,
  checklist?: ExaminationChecklistItem[],
  defects?: ExaminationDefect[]
): Promise<{
  success: boolean
  newState?: DeedState
  error?: string
}> {
  return monitor('submit_examination_decision', async () => {
    const supabase = await createClient()

    try {
      // Get current title state
      const { data: title, error: titleError } = await supabase
        .from('apr.sectional_titles')
        .select('registration_status')
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Title not found',
        }
      }

      // Determine new state based on decision
      let newState: DeedState
      let updateData: Record<string, unknown> = {
        examined_at: new Date().toISOString(),
        examined_by: userId,
        examination_notes: notes,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }

      switch (decision) {
        case 'approve':
          newState = 'approved'
          updateData = {
            ...updateData,
            approved_at: new Date().toISOString(),
            approved_by: userId,
          }
          break
        case 'reject':
          newState = 'rejected'
          updateData = {
            ...updateData,
            cancelled_at: new Date().toISOString(),
            cancelled_by: userId,
            cancellation_reason: notes,
          }
          break
        case 'request_revision':
          newState = 'revision_requested'
          break
        default:
          return {
            success: false,
            error: 'Invalid examination decision',
          }
      }

      // Transition workflow state
      const transitionResult = await transitionDeedsState(
        title.registration_status as DeedState,
        newState,
        {
          userId,
          resourceId: titleId,
          metadata: {
            decision,
            notes,
            checklist: checklist?.map((item) => ({
              id: item.id,
              checked: item.checked,
              notes: item.notes,
            })),
            defects: defects?.map((d) => ({
              id: d.id,
              title: d.title,
              description: d.description,
              severity: d.severity,
            })),
          },
        },
        notes || `Examination decision: ${decision}`
      )

      if (!transitionResult.success) {
        return {
          success: false,
          error: `Workflow transition failed: ${transitionResult.error}`,
        }
      }

      // Update title
      const { error: updateError } = await supabase
        .from('sectional_titles')
        .update({
          registration_status: newState,
          ...updateData,
        })
        .eq('id', titleId)

      if (updateError) {
        logger.error('Failed to update title', updateError, {
          titleId,
          userId,
        })
        return {
          success: false,
          error: `Failed to update title: ${updateError.message}`,
        }
      }

      // Store examination results in metadata
      if (checklist || defects) {
        await supabase
          .from('sectional_titles')
          .update({
            metadata: {
              examinationChecklist: checklist?.map((item) => ({
                id: item.id,
                checked: item.checked,
                notes: item.notes,
              })),
              examinationDefects: defects?.map((d) => ({
                id: d.id,
                title: d.title,
                description: d.description,
                severity: d.severity,
                suggestedCorrection: d.suggestedCorrection,
              })),
            },
          })
          .eq('id', titleId)
      }

      logger.info('Examination decision submitted', {
        titleId,
        decision,
        newState,
        userId,
      })

      return {
        success: true,
        newState,
      }
    } catch (error) {
      logger.error('Exception submitting examination decision', error as Error, {
        titleId,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
  }
  })
}

/**
 * Get pending titles for examination
 */
export async function getPendingTitlesForExamination(): Promise<{
  success: boolean
  titles?: Array<{
    id: string
    titleNumber: string
    sectionNumber: string
    holderName: string
    submittedAt: string
    schemeNumber: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    // Get pending titles
    const { data: titles, error: titlesError } = await supabase
      .from('sectional_titles')
      .select('id, title_number, holder_name, section_id, created_at')
      .eq('registration_status', 'submitted')
      .order('created_at', { ascending: true })

    if (titlesError) {
      return {
        success: false,
        error: titlesError.message,
      }
    }

    if (!titles || titles.length === 0) {
      return {
        success: true,
        titles: [],
      }
    }

    // Get section IDs
    const sectionIds = titles.map((t: any) => t.section_id).filter((id): id is string => id !== null)

    if (sectionIds.length === 0) {
      return {
        success: true,
        titles: [],
      }
    }

    // Get sections with scheme IDs
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('id, section_number, scheme_id')
      .in('id', sectionIds)

    if (sectionsError) {
      return {
        success: false,
        error: sectionsError.message,
      }
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
      return {
        success: false,
        error: schemesError.message,
      }
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
        titleNumber: t.title_number,
        sectionNumber: sectionData?.sectionNumber || '',
        holderName: t.holder_name,
        submittedAt: t.created_at || '',
        schemeNumber,
      }
    })

    return {
      success: true,
      titles: titlesWithDetails,
    }
  } catch (error) {
    logger.error('Exception getting pending titles', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get examination history for a title
 */
export async function getExaminationHistory(
  titleId: string
): Promise<{
  success: boolean
  history?: Array<{
    examinedAt: string
    examinedBy: string
    decision: string
    notes?: string
    defects?: ExaminationDefect[]
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    // Get examination history from workflow history
    const { data: workflowHistory, error } = await supabase
      .from('apr.workflow_history')
      .select('*')
      .eq('resource_id', titleId)
      .eq('resource_type', 'sectional_title')
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const history =
      workflowHistory?.map((h: any) => {
        const metadata = (h.metadata as Record<string, unknown>) || {}
        return {
          examinedAt: h.created_at,
          examinedBy: h.user_id,
          decision: h.to_state,
          notes: h.reason || undefined,
          defects: metadata.defects as ExaminationDefect[] | undefined,
        }
      }) || []

    return {
      success: true,
      history,
    }
  } catch (error) {
    logger.error('Exception getting examination history', error as Error, {
      titleId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

