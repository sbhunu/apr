/**
 * Correction Notification Service
 * Handles sending correction emails to planners and surveyors during examination
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  sendCorrectionEmailToPlanner,
  sendCorrectionEmailToSurveyor,
  sendCorrectionEmailToConveyancer,
} from '@/lib/notifications/email-service'
import type { ExaminationDefect } from './examination-service'

/**
 * Send correction notifications for a title examination
 */
export async function sendCorrectionNotifications(
  titleId: string,
  defects: ExaminationDefect[],
  examinerNotes?: string,
  examinerName?: string,
  options?: {
    notifyPlanner?: boolean
    notifySurveyor?: boolean
    notifyConveyancer?: boolean
    actionUrl?: string
  }
): Promise<{
  success: boolean
  plannerEmail?: { sent: boolean; error?: string }
  surveyorEmail?: { sent: boolean; error?: string }
  conveyancerEmail?: { sent: boolean; error?: string }
  error?: string
}> {
  const supabase = await createClient()
  const results: {
    success: boolean
    plannerEmail?: { sent: boolean; error?: string }
    surveyorEmail?: { sent: boolean; error?: string }
    conveyancerEmail?: { sent: boolean; error?: string }
    error?: string
  } = {
    success: true,
  }

  try {
    // Get title with scheme, survey plan, and planning plan to find user IDs
    const { data: title, error: titleError } = await supabase
      .from('sectional_titles')
      .select(`
        id,
        title_number,
        metadata,
        sections!inner(
          id,
          sectional_schemes!inner(
            id,
            scheme_number,
            scheme_name,
            survey_plan_id,
            survey_sectional_plans!inner(
              id,
              planning_plan_id,
              surveyor_id,
              sectional_scheme_plans!inner(
                id,
                planner_id
              )
            )
          )
        )
      `)
      .eq('id', titleId)
      .single()

    if (titleError || !title) {
      return {
        success: false,
        error: 'Title not found',
      }
    }

    const section = (title as any).sections
    const scheme = section?.sectional_schemes
    const surveyPlan = scheme?.survey_sectional_plans
    const planningPlan = surveyPlan?.sectional_scheme_plans

    const schemeName = scheme?.scheme_name || 'Unknown Scheme'
    const schemeNumber = scheme?.scheme_number

    // Categorize defects by type
    const planningDefects = defects.filter(
      (d) => d.category === 'planning' || d.category === 'legal' || d.title.toLowerCase().includes('planning')
    )
    const surveyDefects = defects.filter(
      (d) => d.category === 'survey' || d.title.toLowerCase().includes('survey') || d.title.toLowerCase().includes('geometry')
    )
    const deedsDefects = defects.filter(
      (d) => d.category === 'deeds' || d.category === 'documentation' || (!planningDefects.includes(d) && !surveyDefects.includes(d))
    )

    // Get planner email from user_profiles
    let plannerEmail: string | undefined
    let plannerName: string | undefined
    if (options?.notifyPlanner !== false && planningDefects.length > 0 && planningPlan?.planner_id) {
      const { data: plannerProfile } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('user_id', planningPlan.planner_id)
        .single()

      plannerEmail = plannerProfile?.email
      plannerName = plannerProfile?.name
    }

    // Get surveyor email from user_profiles
    let surveyorEmail: string | undefined
    let surveyorName: string | undefined
    if (options?.notifySurveyor !== false && surveyDefects.length > 0 && surveyPlan?.surveyor_id) {
      const { data: surveyorProfile } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('user_id', surveyPlan.surveyor_id)
        .single()

      surveyorEmail = surveyorProfile?.email
      surveyorName = surveyorProfile?.name
    }

    // Send email to planner if there are planning-related defects
    if (options?.notifyPlanner !== false && planningDefects.length > 0 && planningPlan && plannerEmail) {
        try {
          const emailResult = await sendCorrectionEmailToPlanner({
            plannerEmail,
            plannerName,
            schemeName,
            schemeNumber,
            titleNumber: title.title_number,
            correctionType: 'planning',
            defects: planningDefects.map((d) => ({
              title: d.title,
              description: d.description,
              severity: d.severity,
              suggestedCorrection: d.suggestedCorrection,
            })),
            examinerNotes,
            examinerName,
            examinationDate: new Date().toISOString(),
            actionUrl: options?.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/planning/review/${planningPlan.id}`,
          })

          results.plannerEmail = {
            sent: emailResult.success,
            error: emailResult.error,
          }
        } catch (error) {
          logger.error('Failed to send correction email to planner', error as Error, {
            titleId,
            plannerEmail,
          })
          results.plannerEmail = {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      } else {
        logger.warn('Planner email not found', { titleId, planningPlanId: planningPlan.id })
        results.plannerEmail = {
          sent: false,
          error: 'Planner email address not found',
        }
      }
    }

    // Send email to surveyor if there are survey-related defects
    if (options?.notifySurveyor !== false && surveyDefects.length > 0 && surveyPlan && surveyorEmail) {
      try {
        const emailResult = await sendCorrectionEmailToSurveyor({
          surveyorEmail,
          surveyorName,
            schemeName,
            schemeNumber,
            titleNumber: title.title_number,
            correctionType: 'survey',
            defects: surveyDefects.map((d) => ({
              title: d.title,
              description: d.description,
              severity: d.severity,
              suggestedCorrection: d.suggestedCorrection,
            })),
            examinerNotes,
            examinerName,
            examinationDate: new Date().toISOString(),
            actionUrl: options?.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/survey/computations/upload`,
          })

          results.surveyorEmail = {
            sent: emailResult.success,
            error: emailResult.error,
          }
        } catch (error) {
          logger.error('Failed to send correction email to surveyor', error as Error, {
            titleId,
            surveyorEmail,
          })
          results.surveyorEmail = {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      } else {
        logger.warn('Surveyor email not found', { titleId, surveyPlanId: surveyPlan.id })
        results.surveyorEmail = {
          sent: false,
          error: 'Surveyor email address not found',
        }
      }
    }

    // Send email to conveyancer if there are deeds-related defects
    // Note: Conveyancer email would need to be stored in the title metadata or user_profiles
    if (options?.notifyConveyancer !== false && deedsDefects.length > 0) {
      // Try to get conveyancer email from title metadata or user_profiles
      const titleMetadata = (title.metadata as Record<string, unknown>) || {}
      const conveyancerEmail = titleMetadata.conveyancer_email as string | undefined
      const conveyancerName = titleMetadata.conveyancer_name as string | undefined

      if (conveyancerEmail) {
        try {
          const emailResult = await sendCorrectionEmailToConveyancer({
            conveyancerEmail,
            conveyancerName,
            schemeName,
            schemeNumber,
            titleNumber: title.title_number,
            correctionType: 'deeds',
            defects: deedsDefects.map((d) => ({
              title: d.title,
              description: d.description,
              severity: d.severity,
              suggestedCorrection: d.suggestedCorrection,
            })),
            examinerNotes,
            examinerName,
            examinationDate: new Date().toISOString(),
            actionUrl: options?.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/deeds/titles/draft`,
          })

          results.conveyancerEmail = {
            sent: emailResult.success,
            error: emailResult.error,
          }
        } catch (error) {
          logger.error('Failed to send correction email to conveyancer', error as Error, {
            titleId,
            conveyancerEmail,
          })
          results.conveyancerEmail = {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      } else {
        logger.warn('Conveyancer email not found', { titleId })
        results.conveyancerEmail = {
          sent: false,
          error: 'Conveyancer email address not found',
        }
      }
    }

    // Determine overall success
    results.success =
      (results.plannerEmail?.sent !== false && results.surveyorEmail?.sent !== false && results.conveyancerEmail?.sent !== false) ||
      (!results.plannerEmail && !results.surveyorEmail && !results.conveyancerEmail)

    return results
  } catch (error) {
    logger.error('Exception sending correction notifications', error as Error, {
      titleId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

