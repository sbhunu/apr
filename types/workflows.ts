/**
 * Workflow and State Machine Type Definitions
 * 
 * Defines state transitions and workflows for the APR system
 * Ensures type-safe state management across different modules
 */

/**
 * Planning Application Workflow States
 */
export type PlanningState =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'

/**
 * Survey Workflow States
 */
export type SurveyState =
  | 'draft'
  | 'computed'
  | 'under_review'
  | 'revision_requested'
  | 'sealed'
  | 'rejected'
  | 'withdrawn'

/**
 * Deed Workflow States
 */
export type DeedState =
  | 'draft'
  | 'submitted'
  | 'under_examination'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'registered'
  | 'withdrawn'

/**
 * Title Registration Workflow States
 */
export type TitleState =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'registered'
  | 'rejected'
  | 'cancelled'

/**
 * Generic workflow state transition
 */
export interface StateTransition<T extends string> {
  from: T
  to: T
  timestamp: string
  userId: string
  reason?: string
  metadata?: Record<string, unknown>
}

/**
 * Planning application state transitions
 */
export type PlanningTransition = StateTransition<PlanningState>

/**
 * Survey state transitions
 */
export type SurveyTransition = StateTransition<SurveyState>

/**
 * Deed state transitions
 */
export type DeedTransition = StateTransition<DeedState>

/**
 * Title state transitions
 */
export type TitleTransition = StateTransition<TitleState>

/**
 * Valid state transitions for Planning
 */
export const PLANNING_TRANSITIONS: Record<PlanningState, PlanningState[]> = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['under_review', 'withdrawn'],
  under_review: ['revision_requested', 'approved', 'rejected'],
  revision_requested: ['submitted', 'withdrawn'],
  approved: [],
  rejected: [],
  withdrawn: [],
}

/**
 * Valid state transitions for Survey
 */
export const SURVEY_TRANSITIONS: Record<SurveyState, SurveyState[]> = {
  draft: ['computed', 'withdrawn'],
  computed: ['under_review', 'withdrawn'],
  under_review: ['revision_requested', 'sealed', 'rejected'],
  revision_requested: ['computed', 'withdrawn'],
  sealed: [],
  rejected: [],
  withdrawn: [],
}

/**
 * Valid state transitions for Deed
 */
export const DEED_TRANSITIONS: Record<DeedState, DeedState[]> = {
  draft: ['submitted', 'withdrawn'],
  submitted: ['under_examination', 'withdrawn'],
  under_examination: ['revision_requested', 'approved', 'rejected'],
  revision_requested: ['submitted', 'withdrawn'],
  approved: ['registered'],
  rejected: [],
  registered: [],
  withdrawn: [],
}

/**
 * Valid state transitions for Title
 */
export const TITLE_TRANSITIONS: Record<TitleState, TitleState[]> = {
  pending: ['under_review', 'cancelled'],
  under_review: ['approved', 'rejected'],
  approved: ['registered'],
  registered: [],
  rejected: [],
  cancelled: [],
}

/**
 * Check if a state transition is valid
 */
export function isValidTransition<T extends string>(
  from: T,
  to: T,
  transitions: Record<T, T[]>
): boolean {
  const validNextStates = transitions[from]
  return validNextStates?.includes(to) ?? false
}

/**
 * Get valid next states for a given current state
 */
export function getValidNextStates<T extends string>(
  currentState: T,
  transitions: Record<T, T[]>
): T[] {
  return transitions[currentState] ?? []
}

/**
 * Workflow action result
 */
export interface WorkflowActionResult<T extends string> {
  success: boolean
  newState?: T
  error?: string
  transition?: StateTransition<T>
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  workflowType: 'planning' | 'survey' | 'deed' | 'title'
  currentState: string
  history: StateTransition<string>[]
  createdAt: string
  updatedAt: string
  assignedTo?: string
  assignedRole?: string
}

