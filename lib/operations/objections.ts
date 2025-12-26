/**
 * Objection Service
 * Handles objection submission, review, and resolution workflows
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Objection submission data
 */
export interface ObjectionSubmissionData {
  planningPlanId: string
  objectorName: string
  objectorIdNumber?: string
  objectorContactEmail?: string
  objectorContactPhone?: string
  objectorAddress?: string
  objectionType: 'boundary' | 'rights' | 'environmental' | 'access' | 'other'
  description: string
  supportingDocuments?: string[] // Array of document IDs
}

/**
 * Objection validation result
 */
export interface ObjectionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  withinObjectionWindow?: boolean
  objectionWindowEnd?: string
}

/**
 * Objection submission result
 */
export interface ObjectionSubmissionResult {
  success: boolean
  objectionId?: string
  error?: string
}

/**
 * Check if plan is within objection window (30 days from submission)
 */
export async function isWithinObjectionWindow(
  planningPlanId: string
): Promise<{
  success: boolean
  withinWindow?: boolean
  windowStart?: string
  windowEnd?: string
  daysRemaining?: number
  error?: string
}> {
  return monitor('check_objection_window', async () => {
    const supabase = await createClient()

    try {
      // Get planning plan submission date
      const { data: plan, error: planError } = await supabase
        .from('sectional_scheme_plans')
        .select('id, created_at, status')
        .eq('id', planningPlanId)
        .single()

      if (planError || !plan) {
        return {
          success: false,
          error: 'Planning plan not found',
        }
      }

      const submissionDate = new Date(plan.created_at)
      const windowStart = submissionDate
      const windowEnd = new Date(submissionDate)
      windowEnd.setDate(windowEnd.getDate() + 30) // 30-day window

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const withinWindow = today >= windowStart && today <= windowEnd
      const daysRemaining = withinWindow
        ? Math.ceil((windowEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 0

      return {
        success: true,
        withinWindow,
        windowStart: windowStart.toISOString().split('T')[0],
        windowEnd: windowEnd.toISOString().split('T')[0],
        daysRemaining,
      }
    } catch (error) {
      logger.error('Exception checking objection window', error as Error, { planningPlanId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Validate objection submission
 */
export async function validateObjectionSubmission(
  data: ObjectionSubmissionData
): Promise<ObjectionValidationResult> {
  return monitor('validate_objection_submission', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check objection window
      const windowCheck = await isWithinObjectionWindow(data.planningPlanId)
      if (!windowCheck.success) {
        return {
          isValid: false,
          errors: [windowCheck.error || 'Failed to check objection window'],
          warnings: [],
        }
      }

      if (!windowCheck.withinWindow) {
        errors.push(
          `Objection window has closed. Window ended on ${windowCheck.windowEnd}. Objections must be submitted within 30 days of plan submission.`
        )
      } else if (windowCheck.daysRemaining !== undefined && windowCheck.daysRemaining <= 7) {
        warnings.push(
          `Objection window closes in ${windowCheck.daysRemaining} day(s). Submit soon to ensure your objection is considered.`
        )
      }

      // Validate objector information
      if (!data.objectorName.trim()) {
        errors.push('Objector name is required')
      }

      if (!data.description.trim()) {
        errors.push('Objection description is required')
      }

      if (data.description.length < 50) {
        warnings.push('Objection description should be at least 50 characters for clarity')
      }

      // Validate planning plan exists
      const { data: plan, error: planError } = await supabase
        .from('sectional_scheme_plans')
        .select('id, status')
        .eq('id', data.planningPlanId)
        .single()

      if (planError || !plan) {
        errors.push('Planning plan not found')
      } else if (plan.status === 'approved') {
        warnings.push('Planning plan is already approved. Objection may not affect approval status.')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        withinObjectionWindow: windowCheck.withinWindow,
        objectionWindowEnd: windowCheck.windowEnd,
      }
    } catch (error) {
      logger.error('Exception validating objection', error as Error, { data })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Submit objection
 */
export async function submitObjection(
  data: ObjectionSubmissionData
): Promise<ObjectionSubmissionResult> {
  return monitor('submit_objection', async () => {
    const supabase = await createClient()

    // Validate objection
    const validation = await validateObjectionSubmission(data)
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join('; ')}`,
      }
    }

    // Create objection record
    const { data: objection, error: createError } = await supabase
      .from('objections')
      .insert({
        planning_plan_id: data.planningPlanId,
        objector_name: data.objectorName,
        objector_id_number: data.objectorIdNumber || null,
        objector_contact_email: data.objectorContactEmail || null,
        objector_contact_phone: data.objectorContactPhone || null,
        objector_address: data.objectorAddress || null,
        objection_type: data.objectionType,
        description: data.description,
        supporting_documents: data.supportingDocuments || [],
        status: 'submitted',
        workflow_state: 'submitted',
      })
      .select('id')
      .single()

    if (createError) {
      logger.error('Failed to submit objection', createError, {
        planningPlanId: data.planningPlanId,
      })
      return {
        success: false,
        error: createError.message,
      }
    }

    logger.info('Objection submitted successfully', {
      objectionId: objection.id,
      planningPlanId: data.planningPlanId,
    })

    return {
      success: true,
      objectionId: objection.id,
    }
  })
}

/**
 * Get objections for a planning plan
 */
export async function getObjectionsForPlan(
  planningPlanId: string
): Promise<{
  success: boolean
  objections?: Array<{
    id: string
    objectorName: string
    objectionType: string
    description: string
    status: string
    submittedAt: string
    hearingDate?: string
    resolvedAt?: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: objections, error } = await supabase
      .from('objections')
      .select('id, objector_name, objection_type, description, status, created_at, hearing_date, resolved_at')
      .eq('planning_plan_id', planningPlanId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      objections:
        objections?.map((o) => ({
          id: o.id,
          objectorName: o.objector_name,
          objectionType: o.objection_type,
          description: o.description,
          status: o.status,
          submittedAt: o.created_at,
          hearingDate: o.hearing_date || undefined,
          resolvedAt: o.resolved_at || undefined,
        })) || [],
    }
  } catch (error) {
    logger.error('Failed to get objections for plan', error as Error, { planningPlanId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Schedule hearing for objection
 */
export async function scheduleHearing(
  objectionId: string,
  hearingDate: string,
  hearingLocation: string,
  hearingOfficerId: string
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('schedule_hearing', async () => {
    const supabase = await createClient()

    try {
      const { error: updateError } = await supabase
        .from('objections')
        .update({
          status: 'scheduled',
          workflow_state: 'scheduled',
          hearing_date: hearingDate,
          hearing_location: hearingLocation,
          hearing_officer: hearingOfficerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', objectionId)

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        }
      }

      logger.info('Hearing scheduled successfully', {
        objectionId,
        hearingDate,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Exception scheduling hearing', error as Error, { objectionId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Resolve objection
 */
export async function resolveObjection(
  objectionId: string,
  resolution: string,
  resolvedById: string,
  resolutionDocumentId?: string
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('resolve_objection', async () => {
    const supabase = await createClient()

    try {
      const { error: updateError } = await supabase
        .from('objections')
        .update({
          status: 'resolved',
          workflow_state: 'resolved',
          resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedById,
          resolution_document_id: resolutionDocumentId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', objectionId)

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        }
      }

      logger.info('Objection resolved successfully', {
        objectionId,
        resolvedById,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Exception resolving objection', error as Error, { objectionId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get objection by ID
 */
export async function getObjection(
  objectionId: string
): Promise<{
  success: boolean
  objection?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: objection, error } = await supabase
      .from('objections')
      .select('*')
      .eq('id', objectionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Objection not found',
        }
      }
      throw error
    }

    return {
      success: true,
      objection,
    }
  } catch (error) {
    logger.error('Failed to get objection', error as Error, { objectionId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending objections for review
 */
export async function getPendingObjections(): Promise<{
  success: boolean
  objections?: Array<{
    id: string
    planningPlanId: string
    objectorName: string
    objectionType: string
    description: string
    submittedAt: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: objections, error } = await supabase
      .from('objections')
      .select('id, planning_plan_id, objector_name, objection_type, description, created_at')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      objections:
        objections?.map((o) => ({
          id: o.id,
          planningPlanId: o.planning_plan_id,
          objectorName: o.objector_name,
          objectionType: o.objection_type,
          description: o.description,
          submittedAt: o.created_at,
        })) || [],
    }
  } catch (error) {
    logger.error('Failed to get pending objections', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

