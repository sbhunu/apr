/**
 * Base Workflow Engine
 * Custom state machine implementation for workflow orchestration
 * Provides state transition validation, role-based authorization, and audit trail
 */

import {
  StateTransition,
  WorkflowActionResult,
  isValidTransition,
  getValidNextStates,
} from '@/types/workflows'
import { ValidationError, AuthorizationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

/**
 * Workflow configuration
 */
export interface WorkflowConfig<T extends string> {
  transitions: Record<T, T[]>
  rolePermissions: Record<string, T[]> // Roles allowed to transition to these states
  initialState: T
  finalStates: T[]
}

/**
 * Workflow context for state transitions
 */
export interface WorkflowContext {
  userId: string
  userRole: string
  entityId: string
  metadata?: Record<string, unknown>
}

/**
 * Workflow transition validator
 */
export interface TransitionValidator<T extends string> {
  validate(
    from: T,
    to: T,
    context: WorkflowContext,
    config: WorkflowConfig<T>
  ): Promise<{ valid: boolean; reason?: string }>
}

/**
 * Base workflow engine class
 */
export class WorkflowEngine<T extends string> {
  private config: WorkflowConfig<T>
  private validators: TransitionValidator<T>[]

  constructor(config: WorkflowConfig<T>, validators: TransitionValidator<T>[] = []) {
    this.config = config
    this.validators = validators
  }

  /**
   * Validate state transition
   */
  async validateTransition(
    from: T,
    to: T,
    context: WorkflowContext
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if transition is valid according to state machine
    if (!isValidTransition(from, to, this.config.transitions)) {
      return {
        valid: false,
        reason: `Invalid transition from ${from} to ${to}. Valid next states: ${getValidNextStates(from, this.config.transitions).join(', ')}`,
      }
    }

    // Check role permissions
    const allowedStates = this.config.rolePermissions[context.userRole] || []
    if (!allowedStates.includes(to)) {
      return {
        valid: false,
        reason: `Role ${context.userRole} is not authorized to transition to state ${to}`,
      }
    }

    // Run custom validators
    for (const validator of this.validators) {
      const result = await validator.validate(from, to, context, this.config)
      if (!result.valid) {
        return result
      }
    }

    return { valid: true }
  }

  /**
   * Execute state transition
   */
  async transition(
    from: T,
    to: T,
    context: WorkflowContext,
    reason?: string
  ): Promise<WorkflowActionResult<T>> {
    try {
      // Validate transition
      const validation = await this.validateTransition(from, to, context)
      if (!validation.valid) {
        logger.warn('Workflow transition rejected', {
          from,
          to,
          userId: context.userId,
          reason: validation.reason,
        })
        return {
          success: false,
          error: validation.reason || 'Invalid transition',
        }
      }

      // Create transition record
      const transition: StateTransition<T> = {
        from,
        to,
        timestamp: new Date().toISOString(),
        userId: context.userId,
        reason,
        metadata: context.metadata,
      }

      logger.info('Workflow transition executed', {
        from,
        to,
        userId: context.userId,
        entityId: context.entityId,
      })

      return {
        success: true,
        newState: to,
        transition,
      }
    } catch (error) {
      logger.error('Workflow transition failed', error as Error, {
        from,
        to,
        context,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get valid next states for current state and role
   */
  getValidNextStates(currentState: T, userRole: string): T[] {
    const allValidStates = getValidNextStates(currentState, this.config.transitions)
    const roleAllowedStates = this.config.rolePermissions[userRole] || []

    // Return intersection of valid states and role-allowed states
    return allValidStates.filter((state) => roleAllowedStates.includes(state))
  }

  /**
   * Check if state is final
   */
  isFinalState(state: T): boolean {
    return this.config.finalStates.includes(state)
  }

  /**
   * Get workflow configuration
   */
  getConfig(): WorkflowConfig<T> {
    return { ...this.config }
  }
}

/**
 * Default transition validator - checks basic rules
 */
export class DefaultTransitionValidator<T extends string> implements TransitionValidator<T> {
  async validate(
    from: T,
    to: T,
    context: WorkflowContext,
    config: WorkflowConfig<T>
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if trying to transition to final state
    if (config.finalStates.includes(from) && from !== to) {
      return {
        valid: false,
        reason: `Cannot transition from final state ${from}`,
      }
    }

    return { valid: true }
  }
}

