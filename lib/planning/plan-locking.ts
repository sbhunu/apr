/**
 * Plan Locking Service
 * Handles plan locking, immutability enforcement, and amendments
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError, AuthorizationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Check if plan is locked
 */
export async function isPlanLocked(planId: string): Promise<{
  locked: boolean
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: plan, error } = await supabase
      .from('sectional_scheme_plans')
      .select('locked, status')
      .eq('id', planId)
      .single()

    if (error) {
      return {
        locked: false,
        error: error.message,
      }
    }

    return {
      locked: plan?.locked || false,
    }
  } catch (error) {
    logger.error('Failed to check plan lock status', error as Error, { planId })
    return {
      locked: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Validate plan can be edited
 */
export async function validatePlanEditable(
  planId: string,
  userId: string
): Promise<{
  editable: boolean
  error?: string
  reason?: string
}> {
  return monitor('validate_plan_editable', async () => {
    const supabase = await createClient()

    try {
      // Get plan and user profile
      const [planResult, userResult] = await Promise.all([
        supabase
          .from('sectional_scheme_plans')
          .select('locked, status, planner_id')
          .eq('id', planId)
          .single(),
        supabase
          .from('user_profiles')
          .select('role')
          .eq('id', userId)
          .single(),
      ])

      if (planResult.error || !planResult.data) {
        return {
          editable: false,
          error: 'Plan not found',
        }
      }

      const plan = planResult.data
      const userRole = userResult.data?.role

      // Check if plan is locked
      if (plan.locked) {
        // Only admin and planning_authority can modify locked plans (for amendments)
        if (userRole === 'admin' || userRole === 'planning_authority') {
          return {
            editable: true,
            reason: 'Authorized user can create amendments',
          }
        }
        return {
          editable: false,
          error: 'Plan is locked and cannot be edited',
          reason: 'Plan has been approved and is immutable',
        }
      }

      // Check if user owns the plan (for planners)
      if (userRole === 'planner' && plan.planner_id !== userId) {
        return {
          editable: false,
          error: 'You can only edit your own plans',
        }
      }

      return {
        editable: true,
      }
    } catch (error) {
      logger.error('Failed to validate plan editable', error as Error, {
        planId,
        userId,
      })
      return {
        editable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Create plan amendment
 */
export async function createPlanAmendment(
  parentPlanId: string,
  amendmentReason: string,
  userId: string
): Promise<{
  success: boolean
  amendmentPlanId?: string
  error?: string
}> {
  return monitor('create_plan_amendment', async () => {
    const supabase = await createClient()

    try {
      // Verify parent plan is locked
      const lockCheck = await isPlanLocked(parentPlanId)
      if (!lockCheck.locked) {
        return {
          success: false,
          error: 'Can only create amendments for approved (locked) plans',
        }
      }

      // Create amendment via RPC function
      const { data, error } = await supabase.rpc('apr.create_plan_amendment', {
        p_parent_plan_id: parentPlanId,
        p_amendment_reason: amendmentReason,
      })

      if (error) {
        logger.error('Failed to create plan amendment', error, {
          parentPlanId,
          userId,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      logger.info('Plan amendment created', {
        parentPlanId,
        amendmentPlanId: data,
        userId,
      })

      return {
        success: true,
        amendmentPlanId: data,
      }
    } catch (error) {
      logger.error('Exception creating plan amendment', error as Error, {
        parentPlanId,
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
 * Compare plan versions
 */
export async function comparePlanVersions(
  planId1: string,
  planId2: string
): Promise<{
  success: boolean
  comparison?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('apr.compare_plan_versions', {
      p_plan_id_1: planId1,
      p_plan_id_2: planId2,
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      comparison: data,
    }
  } catch (error) {
    logger.error('Failed to compare plan versions', error as Error, {
      planId1,
      planId2,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get plan version history
 */
export async function getPlanVersionHistory(
  planId: string
): Promise<{
  success: boolean
  history?: Array<Record<string, unknown>>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('apr.get_plan_version_history', {
      p_plan_id: planId,
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      history: data || [],
    }
  } catch (error) {
    logger.error('Failed to get plan version history', error as Error, {
      planId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Unlock plan (admin/planning authority only, for reversals)
 */
export async function unlockPlan(
  planId: string,
  userId: string,
  reason: string
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('unlock_plan', async () => {
    const supabase = await createClient()

    try {
      // Verify user is admin or planning authority
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'planning_authority')) {
        return {
          success: false,
          error: 'Only admin or planning authority can unlock plans',
        }
      }

      // Update plan status to trigger unlock (via trigger)
      const { error: updateError } = await supabase
        .from('sectional_scheme_plans')
        .update({
          status: 'returned_for_amendment',
          workflow_state: 'revision_requested',
          amendment_notes: reason,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', planId)

      if (updateError) {
        throw updateError
      }

      logger.info('Plan unlocked', {
        planId,
        userId,
        reason,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Failed to unlock plan', error as Error, {
        planId,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

