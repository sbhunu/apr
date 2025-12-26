/**
 * Survey Review Service
 * Handles Surveyor-General review workflow
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { transitionSurveyState } from '@/lib/workflows/survey-workflow'
import { SurveyState } from '@/types/workflows'
import { ChecklistItem } from './review-checklist'

/**
 * Review decision
 */
export type ReviewDecision = 'approve' | 'reject' | 'request_revision'

/**
 * Submit review decision
 */
export async function submitReviewDecision(
  surveyPlanId: string,
  decision: ReviewDecision,
  userId: string,
  notes?: string,
  checklist?: ChecklistItem[]
): Promise<{
  success: boolean
  newState?: SurveyState
  error?: string
}> {
  return monitor('submit_review_decision', async () => {
    const supabase = await createClient()

    try {
      // Get current survey plan state
      const { data: surveyPlan, error: planError } = await supabase
        .from('apr.survey_sectional_plans')
        .select('status, workflow_state')
        .eq('id', surveyPlanId)
        .single()

      if (planError || !surveyPlan) {
        return {
          success: false,
          error: 'Survey plan not found',
        }
      }

      // Determine new state based on decision
      let newState: SurveyState
      let updateData: Record<string, unknown> = {
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        review_notes: notes,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }

      switch (decision) {
        case 'approve':
          newState = 'sealed'
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
            rejected_at: new Date().toISOString(),
            rejected_by: userId,
            rejection_reason: notes,
          }
          break
        case 'request_revision':
          newState = 'revision_requested'
          updateData = {
            ...updateData,
            amendment_requested_at: new Date().toISOString(),
            amendment_requested_by: userId,
            amendment_notes: notes,
          }
          break
        default:
          return {
            success: false,
            error: 'Invalid review decision',
          }
      }

      // Transition workflow state
      const transitionResult = await transitionSurveyState(
        surveyPlan.workflow_state as SurveyState,
        newState,
        {
          userId,
          resourceId: surveyPlanId,
          metadata: {
            decision,
            notes,
            checklist: checklist?.map((item) => ({
              id: item.id,
              checked: item.checked,
              notes: item.notes,
            })),
          },
        },
        notes || `Review decision: ${decision}`
      )

      if (!transitionResult.success) {
        return {
          success: false,
          error: `Workflow transition failed: ${transitionResult.error}`,
        }
      }

      // Update survey plan
      const { error: updateError } = await supabase
        .from('apr.survey_sectional_plans')
        .update({
          status: newState,
          workflow_state: newState,
          ...updateData,
        })
        .eq('id', surveyPlanId)

      if (updateError) {
        logger.error('Failed to update survey plan', updateError, {
          surveyPlanId,
          userId,
        })
        return {
          success: false,
          error: `Failed to update survey plan: ${updateError.message}`,
        }
      }

      // Store checklist results in metadata
      if (checklist) {
        await supabase
          .from('apr.survey_sectional_plans')
          .update({
            metadata: {
              reviewChecklist: checklist.map((item) => ({
                id: item.id,
                checked: item.checked,
                notes: item.notes,
              })),
            },
          })
          .eq('id', surveyPlanId)
      }

      logger.info('Review decision submitted', {
        surveyPlanId,
        decision,
        newState,
        userId,
      })

      return {
        success: true,
        newState,
      }
    } catch (error) {
      logger.error('Exception submitting review decision', error as Error, {
        surveyPlanId,
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
 * Get pending surveys for review
 */
export async function getPendingSurveysForReview(): Promise<{
  success: boolean
  surveys?: Array<{
    id: string
    surveyNumber: string
    title: string
    surveyorName: string
    submittedAt: string
    sectionCount: number
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('survey_sectional_plans')
      .select('id, survey_number, title, surveyor_name, submitted_at')
      .eq('status', 'under_review')
      .order('submitted_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const plans = data || []
    if (plans.length === 0) {
      return {
        success: true,
        surveys: [],
      }
    }

    const planIds = plans.map((plan: any) => plan.id)
    const { data: geometryRows } = await supabase
      .from('section_geometries')
      .select('survey_plan_id')
      .in('survey_plan_id', planIds)

    const counts = geometryRows?.reduce<Record<string, number>>((acc, row: any) => {
      acc[row.survey_plan_id] = (acc[row.survey_plan_id] ?? 0) + 1
      return acc
    }, {}) ?? {}

    return {
      success: true,
      surveys: plans.map((s: any) => ({
        id: s.id,
        surveyNumber: s.survey_number,
        title: s.title,
        surveyorName: s.surveyor_name || 'Unknown',
        submittedAt: s.submitted_at || '',
        sectionCount: counts[s.id] || 0,
      })),
    }
  } catch (error) {
    logger.error('Exception getting pending surveys', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

