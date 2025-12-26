/**
 * Deeds Workflow State Machine
 * Manages state transitions for deed packets
 */

import { WorkflowEngine, WorkflowConfig, WorkflowContext } from './base'
import {
  DeedState,
  DEED_TRANSITIONS,
  StateTransition,
  WorkflowActionResult,
} from '@/types/workflows'
import { logger } from '@/lib/logger'

/**
 * Deeds workflow configuration
 */
const DEEDS_WORKFLOW_CONFIG: WorkflowConfig<DeedState> = {
  transitions: {
    draft: ['submitted', 'withdrawn'],
    submitted: ['under_examination', 'withdrawn'],
    under_examination: ['revision_requested', 'approved', 'rejected'],
    revision_requested: ['submitted', 'withdrawn'],
    approved: ['registered'],
    rejected: [],
    registered: [],
    withdrawn: [],
  },
  rolePermissions: {
    conveyancer: ['submitted', 'withdrawn'], // Can submit and withdraw
    deeds_examiner: [
      'under_examination',
      'revision_requested',
      'approved',
      'rejected',
    ], // Can examine and approve
    registrar: ['registered'], // Can register
    admin: [
      'submitted',
      'under_examination',
      'revision_requested',
      'approved',
      'rejected',
      'registered',
      'withdrawn',
    ], // Full access
  },
  initialState: 'draft',
  finalStates: ['registered', 'rejected', 'withdrawn'],
}

/**
 * Deeds workflow engine instance
 */
export const deedsWorkflow = new WorkflowEngine<DeedState>(DEEDS_WORKFLOW_CONFIG)

/**
 * Execute deeds workflow transition
 */
export async function transitionDeedsState(
  currentState: DeedState,
  newState: DeedState,
  context: WorkflowContext,
  reason?: string
): Promise<WorkflowActionResult<DeedState>> {
  return await deedsWorkflow.transition(currentState, newState, context, reason)
}

/**
 * Get valid next states for deeds workflow
 */
export function getDeedsNextStates(
  currentState: DeedState,
  userRole: string
): DeedState[] {
  return deedsWorkflow.getValidNextStates(currentState, userRole)
}

/**
 * Check if deeds state is final
 */
export function isDeedsFinalState(state: DeedState): boolean {
  return deedsWorkflow.isFinalState(state)
}

/**
 * Validate deeds state transition
 */
export async function validateDeedsTransition(
  from: DeedState,
  to: DeedState,
  context: WorkflowContext
): Promise<{ valid: boolean; reason?: string }> {
  return await deedsWorkflow.validateTransition(from, to, context)
}

