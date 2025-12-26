/**
 * Planning Workflow Transition API Route
 * Handles state transitions for planning applications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWorkflowManager } from '@/lib/workflows/manager'
import { withErrorHandler } from '@/lib/api-error-handler'
import { ValidationError, AuthorizationError } from '@/lib/errors/base'
import { PlanningState } from '@/types/workflows'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new AuthorizationError('Authentication required', 'workflow', 'transition', {
      error: authError?.message,
    })
  }

  // Get user profile for role
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new AuthorizationError('User profile not found', 'workflow', 'transition', {
      error: profileError?.message,
    })
  }

  // Parse request body
  const body = await request.json()
  const { planId, fromState, toState, reason } = body

  // Validate input
  if (!planId || !fromState || !toState) {
    throw new ValidationError(
      'Missing required fields: planId, fromState, toState',
      'workflow_transition',
      { body }
    )
  }

  // Validate state values
  const validStates: PlanningState[] = [
    'draft',
    'submitted',
    'under_review',
    'revision_requested',
    'approved',
    'rejected',
    'withdrawn',
  ]
  if (!validStates.includes(fromState) || !validStates.includes(toState)) {
    throw new ValidationError('Invalid state values', 'workflow_transition', {
      fromState,
      toState,
    })
  }

  // Verify plan exists and user has access
  const { data: plan, error: planError } = await supabase
    .from('sectional_scheme_plans')
    .select('id, status, planner_id')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    throw new ValidationError('Plan not found', 'workflow_transition', {
      planId,
      error: planError?.message,
    })
  }

  // Check access: planner can only transition their own plans, planning_authority can transition any
  if (
    profile.role === 'planner' &&
    plan.planner_id !== user.id &&
    fromState !== 'draft'
  ) {
    throw new AuthorizationError(
      'You can only transition your own plans',
      'workflow_transition',
      'transition',
      { planId, userId: user.id }
    )
  }

  // Create workflow manager
  const workflowManager = createWorkflowManager(supabase)

  // Execute transition
  const result = await workflowManager.transitionPlanning(
    planId,
    fromState as PlanningState,
    toState as PlanningState,
    {
      userId: user.id,
      userRole: profile.role,
      entityId: planId,
      metadata: {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
      },
    },
    reason
  )

  if (!result.success) {
    throw new ValidationError(
      result.error || 'Transition failed',
      'workflow_transition',
      { planId, fromState, toState }
    )
  }

  // Update plan status in database
  const { error: updateError } = await supabase
    .from('sectional_scheme_plans')
    .update({
      status: toState,
      workflow_state: toState,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', planId)

  if (updateError) {
    throw new ValidationError(
      'Failed to update plan status',
      'workflow_transition',
      { planId, error: updateError.message }
    )
  }

  // Get updated plan with workflow history
  const { data: updatedPlan } = await supabase
    .from('sectional_scheme_plans')
    .select('*')
    .eq('id', planId)
    .single()

  const history = await workflowManager.getHistory(planId, 'planning')

  return NextResponse.json(
    {
      success: true,
      plan: updatedPlan,
      transition: result.transition,
      history,
    },
    { status: 200 }
  )
})

