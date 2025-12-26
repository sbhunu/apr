/**
 * Scheme Service
 * Handles scheme creation, updates, and draft management
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError, SystemError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { SchemeFormData } from './scheme-form-schema'

/**
 * Create scheme draft
 */
export async function createSchemeDraft(
  data: Partial<SchemeFormData>,
  userId: string
): Promise<{
  success: boolean
  planId?: string
  planNumber?: string
  error?: string
}> {
  return monitor('create_scheme_draft', async () => {
    const supabase = await createClient()

    // Generate plan number (format: PLAN-YYYY-NNN)
    const year = new Date().getFullYear()
    const { data: maxPlan, error: queryError } = await supabase
      .from('sectional_scheme_plans')
      .select('plan_number')
      .like('plan_number', `PLAN-${year}-%`)
      .order('plan_number', { ascending: false })
      .limit(1)
      .single()

    let sequenceNumber = 1
    if (!queryError && maxPlan) {
      const parts = maxPlan.plan_number.split('-')
      if (parts.length === 3) {
        sequenceNumber = parseInt(parts[2], 10) + 1
      }
    }

    const planNumber = `PLAN-${year}-${String(sequenceNumber).padStart(3, '0')}`

    // Get user profile for planner name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, organization')
      .eq('id', userId)
      .single()

    // Insert draft plan
    const { data: plan, error: insertError } = await supabase
      .from('sectional_scheme_plans')
      .insert({
        plan_number: planNumber,
        title: data.title || 'Untitled Scheme',
        description: data.description,
        location_name: data.locationName,
        planner_id: userId,
        planner_name: profile?.name || data.plannerName,
        planner_registration_number: data.plannerRegistrationNumber,
        status: 'draft',
        workflow_state: 'draft',
        metadata: {
          numberOfSections: data.numberOfSections,
          organization: data.organization || profile?.organization,
        },
      })
      .select('id, plan_number')
      .single()

    if (insertError) {
      logger.error('Failed to create scheme draft', insertError, {
        userId,
        planNumber,
      })
      return {
        success: false,
        error: insertError.message,
      }
    }

    logger.info('Scheme draft created', {
      planId: plan.id,
      planNumber: plan.plan_number,
      userId,
    })

    return {
      success: true,
      planId: plan.id,
      planNumber: plan.plan_number,
    }
  })
}

/**
 * Update scheme draft
 */
export async function updateSchemeDraft(
  planId: string,
  data: Partial<SchemeFormData>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return monitor('update_scheme_draft', async () => {
    const supabase = await createClient()

    // Verify plan exists and user owns it
    const { data: plan, error: planError } = await supabase
      .from('sectional_scheme_plans')
      .select('id, planner_id, status')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return {
        success: false,
        error: 'Plan not found',
      }
    }

    if (plan.planner_id !== userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update your own plans',
      }
    }

    if (plan.status !== 'draft') {
      return {
        success: false,
        error: `Cannot update plan in ${plan.status} status`,
      }
    }

    // Update plan
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.locationName !== undefined) updateData.location_name = data.locationName
    if (data.plannerName !== undefined) updateData.planner_name = data.plannerName
    if (data.plannerRegistrationNumber !== undefined)
      updateData.planner_registration_number = data.plannerRegistrationNumber

    if (data.numberOfSections !== undefined || data.organization !== undefined) {
      const { data: currentPlan } = await supabase
        .from('sectional_scheme_plans')
        .select('metadata')
        .eq('id', planId)
        .single()

      const metadata = (currentPlan?.metadata as Record<string, unknown>) || {}
      if (data.numberOfSections !== undefined) {
        metadata.numberOfSections = data.numberOfSections
      }
      if (data.organization !== undefined) {
        metadata.organization = data.organization
      }
      updateData.metadata = metadata
    }

    const { error: updateError } = await supabase
      .from('sectional_scheme_plans')
      .update(updateData)
      .eq('id', planId)

    if (updateError) {
      logger.error('Failed to update scheme draft', updateError, {
        planId,
        userId,
      })
      return {
        success: false,
        error: updateError.message,
      }
    }

    logger.info('Scheme draft updated', {
      planId,
      userId,
    })

    return {
      success: true,
    }
  })
}

/**
 * Submit scheme for review
 */
export async function submitScheme(
  planId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return monitor('submit_scheme', async () => {
    const supabase = await createClient()

    // Verify plan exists and user owns it
    const { data: plan, error: planError } = await supabase
      .from('sectional_scheme_plans')
      .select('id, planner_id, status')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return {
        success: false,
        error: 'Plan not found',
      }
    }

    if (plan.planner_id !== userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only submit your own plans',
      }
    }

    if (plan.status !== 'draft') {
      return {
        success: false,
        error: `Cannot submit plan in ${plan.status} status`,
      }
    }

    // Update plan status
    const { error: updateError } = await supabase
      .from('sectional_scheme_plans')
      .update({
        status: 'submitted',
        workflow_state: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)

    if (updateError) {
      logger.error('Failed to submit scheme', updateError, {
        planId,
        userId,
      })
      return {
        success: false,
        error: updateError.message,
      }
    }

    logger.info('Scheme submitted for review', {
      planId,
      userId,
    })

    return {
      success: true,
    }
  })
}

/**
 * Get scheme draft
 */
export async function getSchemeDraft(
  planId: string,
  userId: string
): Promise<{
  success: boolean
  plan?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: plan, error } = await supabase
      .from('sectional_scheme_plans')
      .select('*')
      .eq('id', planId)
      .eq('planner_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Plan not found',
        }
      }
      throw error
    }

    return {
      success: true,
      plan,
    }
  } catch (error) {
    logger.error('Failed to get scheme draft', error as Error, {
      planId,
      userId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

