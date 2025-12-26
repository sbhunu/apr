/**
 * Survey Workflow State Machine
 * Manages state transitions for survey computations
 */

import { WorkflowEngine, WorkflowConfig, WorkflowContext } from './base'
import {
  SurveyState,
  SURVEY_TRANSITIONS,
  StateTransition,
  WorkflowActionResult,
} from '@/types/workflows'
import { logger } from '@/lib/logger'

/**
 * Survey workflow configuration
 */
const SURVEY_WORKFLOW_CONFIG: WorkflowConfig<SurveyState> = {
  transitions: {
    draft: ['computed', 'withdrawn'],
    computed: ['under_review', 'withdrawn'],
    under_review: ['revision_requested', 'sealed', 'rejected'],
    revision_requested: ['computed', 'withdrawn'],
    sealed: [],
    rejected: [],
    withdrawn: [],
  },
  rolePermissions: {
    surveyor: ['computed', 'withdrawn'], // Can compute and withdraw
    surveyor_general: [
      'under_review',
      'revision_requested',
      'sealed',
      'rejected',
    ], // Can review and seal
    admin: [
      'computed',
      'under_review',
      'revision_requested',
      'sealed',
      'rejected',
      'withdrawn',
    ], // Full access
  },
  initialState: 'draft',
  finalStates: ['sealed', 'rejected', 'withdrawn'],
}

/**
 * Survey workflow engine instance
 */
export const surveyWorkflow = new WorkflowEngine<SurveyState>(SURVEY_WORKFLOW_CONFIG)

/**
 * Execute survey workflow transition
 */
export async function transitionSurveyState(
  currentState: SurveyState,
  newState: SurveyState,
  context: WorkflowContext,
  reason?: string
): Promise<WorkflowActionResult<SurveyState>> {
  return await surveyWorkflow.transition(currentState, newState, context, reason)
}

/**
 * Get valid next states for survey workflow
 */
export function getSurveyNextStates(
  currentState: SurveyState,
  userRole: string
): SurveyState[] {
  return surveyWorkflow.getValidNextStates(currentState, userRole)
}

/**
 * Check if survey state is final
 */
export function isSurveyFinalState(state: SurveyState): boolean {
  return surveyWorkflow.isFinalState(state)
}

/**
 * Validate survey state transition
 */
export async function validateSurveyTransition(
  from: SurveyState,
  to: SurveyState,
  context: WorkflowContext
): Promise<{ valid: boolean; reason?: string }> {
  return await surveyWorkflow.validateTransition(from, to, context)
}

