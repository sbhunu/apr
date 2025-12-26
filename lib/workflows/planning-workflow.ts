/**
 * Planning Workflow State Machine
 * Manages state transitions for sectional scheme plans
 */

import { WorkflowEngine, WorkflowConfig, WorkflowContext } from './base'
import {
  PlanningState,
  PLANNING_TRANSITIONS,
  StateTransition,
  WorkflowActionResult,
} from '@/types/workflows'
import { logger } from '@/lib/logger'

/**
 * Planning workflow configuration
 * Maps to database status values in apr.sectional_scheme_plans
 */
const PLANNING_WORKFLOW_CONFIG: WorkflowConfig<PlanningState> = {
  transitions: {
    draft: ['submitted', 'withdrawn'],
    submitted: ['under_review', 'withdrawn'],
    under_review: ['revision_requested', 'approved', 'rejected'],
    revision_requested: ['submitted', 'withdrawn'],
    approved: [],
    rejected: [],
    withdrawn: [],
  },
  rolePermissions: {
    planner: ['submitted', 'withdrawn'], // Can submit and withdraw
    planning_authority: [
      'under_review',
      'revision_requested',
      'approved',
      'rejected',
    ], // Can review and make decisions
    admin: [
      'submitted',
      'under_review',
      'revision_requested',
      'approved',
      'rejected',
      'withdrawn',
    ], // Full access
  },
  initialState: 'draft',
  finalStates: ['approved', 'rejected', 'withdrawn'],
}

/**
 * Planning workflow engine instance
 */
export const planningWorkflow = new WorkflowEngine<PlanningState>(
  PLANNING_WORKFLOW_CONFIG
)

/**
 * Execute planning workflow transition
 */
export async function transitionPlanningState(
  currentState: PlanningState,
  newState: PlanningState,
  context: WorkflowContext,
  reason?: string
): Promise<WorkflowActionResult<PlanningState>> {
  return await planningWorkflow.transition(currentState, newState, context, reason)
}

/**
 * Get valid next states for planning workflow
 */
export function getPlanningNextStates(
  currentState: PlanningState,
  userRole: string
): PlanningState[] {
  return planningWorkflow.getValidNextStates(currentState, userRole)
}

/**
 * Check if planning state is final
 */
export function isPlanningFinalState(state: PlanningState): boolean {
  return planningWorkflow.isFinalState(state)
}

/**
 * Validate planning state transition
 */
export async function validatePlanningTransition(
  from: PlanningState,
  to: PlanningState,
  context: WorkflowContext
): Promise<{ valid: boolean; reason?: string }> {
  return await planningWorkflow.validateTransition(from, to, context)
}

