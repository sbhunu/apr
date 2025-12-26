/**
 * Workflow Trigger Service
 * Handles cross-module workflow triggers as per Integrated Plan BPMN
 * Implements the workflow philosophy: each module completion triggers the next module
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Workflow trigger types as per Integrated Plan BPMN
 */
export type WorkflowTriggerType =
  | 'planning_approved'
  | 'survey_sealed'
  | 'scheme_registered'
  | 'title_registered'

/**
 * Workflow trigger interface
 */
export interface WorkflowTrigger {
  fromModule: string
  toModule: string
  entityId: string
  entityType: string
  triggerType: WorkflowTriggerType
  triggeredBy: string
  metadata?: Record<string, unknown>
}

/**
 * Workflow event log entry
 */
export interface WorkflowEvent {
  id: string
  fromModule: string
  toModule: string
  entityId: string
  entityType: string
  triggerType: WorkflowTriggerType
  triggeredAt: string
  triggeredBy: string
  metadata?: Record<string, unknown>
  status: 'pending' | 'processed' | 'failed'
  processedAt?: string
  error?: string
}

/**
 * Trigger result
 */
export interface TriggerResult {
  success: boolean
  eventId?: string
  error?: string
}

/**
 * Trigger next module workflow
 * Creates workflow event log entry and makes entity available to next module
 */
export async function triggerNextModule(trigger: WorkflowTrigger): Promise<TriggerResult> {
  return monitor('workflow_trigger', async () => {
    const supabase = await createClient()

    try {
      logger.info('Triggering workflow transition', {
        fromModule: trigger.fromModule,
        toModule: trigger.toModule,
        entityId: trigger.entityId,
        triggerType: trigger.triggerType,
      })

      // 1. Create workflow event log entry
      const { data: event, error: eventError } = await supabase
        .from('workflow_events')
        .insert({
          from_module: trigger.fromModule,
          to_module: trigger.toModule,
          entity_id: trigger.entityId,
          entity_type: trigger.entityType,
          trigger_type: trigger.triggerType,
          triggered_by: trigger.triggeredBy,
          metadata: trigger.metadata || {},
          status: 'pending',
          triggered_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (eventError) {
        logger.error('Failed to create workflow event', eventError, {
          trigger,
        })
        return {
          success: false,
          error: `Failed to create workflow event: ${eventError.message}`,
        }
      }

      // 2. Process the trigger based on type
      let processResult: { success: boolean; error?: string } = { success: true }

      switch (trigger.triggerType) {
        case 'planning_approved':
          processResult = await processPlanningApprovedTrigger(trigger, supabase)
          break
        case 'survey_sealed':
          processResult = await processSurveySealedTrigger(trigger, supabase)
          break
        case 'scheme_registered':
          processResult = await processSchemeRegisteredTrigger(trigger, supabase)
          break
        case 'title_registered':
          processResult = await processTitleRegisteredTrigger(trigger, supabase)
          break
        default:
          processResult = {
            success: false,
            error: `Unknown trigger type: ${trigger.triggerType}`,
          }
      }

      // 3. Update workflow event status
      const updateStatus = processResult.success ? 'processed' : 'failed'
      const { error: updateError } = await supabase
        .from('workflow_events')
        .update({
          status: updateStatus,
          processed_at: processResult.success ? new Date().toISOString() : null,
          error: processResult.error || null,
        })
        .eq('id', event.id)

      if (updateError) {
        logger.error('Failed to update workflow event status', updateError, {
          eventId: event.id,
        })
      }

      if (!processResult.success) {
        return {
          success: false,
          error: processResult.error,
          eventId: event.id,
        }
      }

      logger.info('Workflow trigger processed successfully', {
        eventId: event.id,
        triggerType: trigger.triggerType,
        fromModule: trigger.fromModule,
        toModule: trigger.toModule,
      })

      return {
        success: true,
        eventId: event.id,
      }
    } catch (error) {
      logger.error('Exception triggering workflow', error as Error, {
        trigger,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Process Planning Approved → Survey Module trigger
 * Makes approved planning plan available to Survey module
 */
async function processPlanningApprovedTrigger(
  trigger: WorkflowTrigger,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify plan is approved and locked
    const { data: plan, error: planError } = await supabase
      .from('sectional_scheme_plans')
      .select('id, approval_status, locked, scheme_name')
      .eq('id', trigger.entityId)
      .single()

    if (planError || !plan) {
      return {
        success: false,
        error: 'Planning plan not found',
      }
    }

    if (plan.approval_status !== 'approved' || !plan.locked) {
      return {
        success: false,
        error: `Plan must be approved and locked. Status: ${plan.approval_status}, Locked: ${plan.locked}`,
      }
    }

    // Plan is already available to Survey module via status query
    // The trigger event log entry documents the workflow handoff
    logger.info('Planning plan made available to Survey module', {
      planId: trigger.entityId,
      schemeName: plan.scheme_name,
    })

    return { success: true }
  } catch (error) {
    logger.error('Exception processing planning approved trigger', error as Error, {
      trigger,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process Survey Sealed → Deeds Module trigger
 * Makes sealed survey available to Deeds module (Scheme Registration)
 */
async function processSurveySealedTrigger(
  trigger: WorkflowTrigger,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify survey is sealed
    const { data: survey, error: surveyError } = await supabase
      .from('survey_sectional_plans')
      .select('id, status, seal_hash, planning_plan_id')
      .eq('id', trigger.entityId)
      .single()

    if (surveyError || !survey) {
      return {
        success: false,
        error: 'Survey plan not found',
      }
    }

    if (survey.status !== 'sealed') {
      return {
        success: false,
        error: `Survey must be sealed. Current status: ${survey.status}`,
      }
    }

    // Survey is already available to Deeds module via status query
    // The trigger event log entry documents the workflow handoff
    logger.info('Sealed survey made available to Deeds module', {
      surveyId: trigger.entityId,
      sealHash: survey.seal_hash,
      planningPlanId: survey.planning_plan_id,
    })

    return { success: true }
  } catch (error) {
    logger.error('Exception processing survey sealed trigger', error as Error, {
      trigger,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process Scheme Registered → Title Creation trigger
 * Makes registered scheme available for Title Creation workflow
 */
async function processSchemeRegisteredTrigger(
  trigger: WorkflowTrigger,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify scheme is registered
    const { data: scheme, error: schemeError } = await supabase
      .from('sectional_schemes')
      .select('id, scheme_number, survey_id')
      .eq('id', trigger.entityId)
      .single()

    if (schemeError || !scheme) {
      return {
        success: false,
        error: 'Sectional scheme not found',
      }
    }

    // Scheme is already available to Title Creation via query
    // The trigger event log entry documents the workflow handoff
    logger.info('Registered scheme made available for Title Creation', {
      schemeId: trigger.entityId,
      schemeNumber: scheme.scheme_number,
      surveyId: scheme.survey_id,
    })

    return { success: true }
  } catch (error) {
    logger.error('Exception processing scheme registered trigger', error as Error, {
      trigger,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process Title Registered → Operations Module trigger
 * Makes registered title available for Operations module
 */
async function processTitleRegisteredTrigger(
  trigger: WorkflowTrigger,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify title is registered
    const { data: title, error: titleError } = await supabase
      .from('sectional_titles')
      .select('id, title_number, registration_status, section_id')
      .eq('id', trigger.entityId)
      .single()

    if (titleError || !title) {
      return {
        success: false,
        error: 'Sectional title not found',
      }
    }

    if (title.registration_status !== 'registered') {
      return {
        success: false,
        error: `Title must be registered. Current status: ${title.registration_status}`,
      }
    }

    // Title is already available to Operations module via status query
    // The trigger event log entry documents the workflow handoff
    logger.info('Registered title made available to Operations module', {
      titleId: trigger.entityId,
      titleNumber: title.title_number,
      sectionId: title.section_id,
    })

    return { success: true }
  } catch (error) {
    logger.error('Exception processing title registered trigger', error as Error, {
      trigger,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get workflow events for an entity
 */
export async function getWorkflowEvents(
  entityId: string,
  entityType?: string
): Promise<{
  success: boolean
  events?: WorkflowEvent[]
  error?: string
}> {
  return monitor('get_workflow_events', async () => {
    const supabase = await createClient()

    try {
      let query = supabase
        .from('workflow_events')
        .select('*')
        .eq('entity_id', entityId)
        .order('triggered_at', { ascending: false })

      if (entityType) {
        query = query.eq('entity_type', entityType)
      }

      const { data: events, error } = await query

      if (error) {
        logger.error('Failed to get workflow events', error, {
          entityId,
          entityType,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        events: events || [],
      }
    } catch (error) {
      logger.error('Exception getting workflow events', error as Error, {
        entityId,
        entityType,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get pending workflow events
 */
export async function getPendingWorkflowEvents(): Promise<{
  success: boolean
  events?: WorkflowEvent[]
  error?: string
}> {
  return monitor('get_pending_workflow_events', async () => {
    const supabase = await createClient()

    try {
      const { data: events, error } = await supabase
        .from('workflow_events')
        .select('*')
        .eq('status', 'pending')
        .order('triggered_at', { ascending: true })

      if (error) {
        logger.error('Failed to get pending workflow events', error, {})
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        events: events || [],
      }
    } catch (error) {
      logger.error('Exception getting pending workflow events', error as Error, {})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

