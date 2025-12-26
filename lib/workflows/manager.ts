/**
 * Workflow Manager
 * High-level API for managing workflows with persistence and notifications
 */

import {
  PlanningState,
  SurveyState,
  DeedState,
  StateTransition,
  WorkflowActionResult,
} from '@/types/workflows'
import { WorkflowContext } from './base'
import {
  transitionPlanningState,
  getPlanningNextStates,
} from './planning-workflow'
import {
  transitionSurveyState,
  getSurveyNextStates,
} from './survey-workflow'
import {
  transitionDeedsState,
  getDeedsNextStates,
} from './deeds-workflow'
import {
  WorkflowPersistence,
  DatabaseWorkflowPersistence,
} from './persistence'
import { ValidationError, ConflictError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Workflow manager configuration
 */
export interface WorkflowManagerConfig {
  persistence: WorkflowPersistence
  enableNotifications?: boolean
  enableAuditLog?: boolean
}

/**
 * Workflow manager - high-level workflow orchestration
 */
export class WorkflowManager {
  private persistence: WorkflowPersistence
  private enableNotifications: boolean
  private enableAuditLog: boolean

  constructor(config: WorkflowManagerConfig) {
    this.persistence = config.persistence
    this.enableNotifications = config.enableNotifications ?? true
    this.enableAuditLog = config.enableAuditLog ?? true
  }

  /**
   * Execute planning workflow transition with persistence
   */
  async transitionPlanning(
    planId: string,
    currentState: PlanningState,
    newState: PlanningState,
    context: WorkflowContext,
    reason?: string
  ): Promise<WorkflowActionResult<PlanningState>> {
    return await monitor.measure('workflow_transition_planning', async () => {
      // Get current version for optimistic locking
      const current = await this.persistence.getCurrentState(planId, 'planning')
      const currentVersion = current?.version || 0

      // Validate and execute transition
      const result = await transitionPlanningState(
        currentState,
        newState,
        context,
        reason
      )

      if (!result.success || !result.transition) {
        return result
      }

      // Save transition with optimistic locking
      try {
        const saveResult = await this.persistence.saveTransition(
          planId,
          'planning',
          result.transition,
          currentVersion
        )

        if (!saveResult.success) {
          // Version conflict - return conflict error
          return {
            success: false,
            error: saveResult.error || 'Concurrent modification detected',
          }
        }

        // Log audit trail
        if (this.enableAuditLog) {
          logger.info('Planning workflow transition persisted', {
            planId,
            from: currentState,
            to: newState,
            userId: context.userId,
            version: saveResult.newVersion,
          })
        }

        // Send notifications (placeholder - would integrate with notification service)
        if (this.enableNotifications) {
          await this.sendNotification('planning', planId, result.transition)
        }

        return {
          ...result,
          newState: newState,
        }
      } catch (error) {
        if (error instanceof ConflictError) {
          return {
            success: false,
            error: error.message,
          }
        }
        logger.error('Failed to persist planning workflow transition', error as Error, {
          planId,
          transition: result.transition,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to persist transition',
        }
      }
    })
  }

  /**
   * Execute survey workflow transition with persistence
   */
  async transitionSurvey(
    surveyId: string,
    currentState: SurveyState,
    newState: SurveyState,
    context: WorkflowContext,
    reason?: string
  ): Promise<WorkflowActionResult<SurveyState>> {
    return await monitor.measure('workflow_transition_survey', async () => {
      const current = await this.persistence.getCurrentState(surveyId, 'survey')
      const currentVersion = current?.version || 0

      const result = await transitionSurveyState(
        currentState,
        newState,
        context,
        reason
      )

      if (!result.success || !result.transition) {
        return result
      }

      try {
        const saveResult = await this.persistence.saveTransition(
          surveyId,
          'survey',
          result.transition,
          currentVersion
        )

        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error || 'Concurrent modification detected',
          }
        }

        if (this.enableAuditLog) {
          logger.info('Survey workflow transition persisted', {
            surveyId,
            from: currentState,
            to: newState,
            userId: context.userId,
            version: saveResult.newVersion,
          })
        }

        if (this.enableNotifications) {
          await this.sendNotification('survey', surveyId, result.transition)
        }

        return {
          ...result,
          newState: newState,
        }
      } catch (error) {
        if (error instanceof ConflictError) {
          return {
            success: false,
            error: error.message,
          }
        }
        logger.error('Failed to persist survey workflow transition', error as Error, {
          surveyId,
          transition: result.transition,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to persist transition',
        }
      }
    })
  }

  /**
   * Execute deeds workflow transition with persistence
   */
  async transitionDeeds(
    deedId: string,
    currentState: DeedState,
    newState: DeedState,
    context: WorkflowContext,
    reason?: string
  ): Promise<WorkflowActionResult<DeedState>> {
    return await monitor.measure('workflow_transition_deeds', async () => {
      const current = await this.persistence.getCurrentState(deedId, 'deed')
      const currentVersion = current?.version || 0

      const result = await transitionDeedsState(
        currentState,
        newState,
        context,
        reason
      )

      if (!result.success || !result.transition) {
        return result
      }

      try {
        const saveResult = await this.persistence.saveTransition(
          deedId,
          'deed',
          result.transition,
          currentVersion
        )

        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error || 'Concurrent modification detected',
          }
        }

        if (this.enableAuditLog) {
          logger.info('Deeds workflow transition persisted', {
            deedId,
            from: currentState,
            to: newState,
            userId: context.userId,
            version: saveResult.newVersion,
          })
        }

        if (this.enableNotifications) {
          await this.sendNotification('deed', deedId, result.transition)
        }

        return {
          ...result,
          newState: newState,
        }
      } catch (error) {
        if (error instanceof ConflictError) {
          return {
            success: false,
            error: error.message,
          }
        }
        logger.error('Failed to persist deeds workflow transition', error as Error, {
          deedId,
          transition: result.transition,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to persist transition',
        }
      }
    })
  }

  /**
   * Get workflow history
   */
  async getHistory(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<StateTransition<string>[]> {
    return await this.persistence.getHistory(entityId, workflowType)
  }

  /**
   * Get current workflow state
   */
  async getCurrentState(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<{ state: string; version: number } | null> {
    return await this.persistence.getCurrentState(entityId, workflowType)
  }

  /**
   * Send notification for workflow transition (placeholder)
   */
  private async sendNotification(
    workflowType: 'planning' | 'survey' | 'deed' | 'title',
    entityId: string,
    transition: StateTransition<string>
  ): Promise<void> {
    // Placeholder for notification service integration
    // Would integrate with email, SMS, or in-app notification service
    logger.debug('Workflow notification sent', {
      workflowType,
      entityId,
      transition: transition.to,
    })
  }
}

/**
 * Create workflow manager instance
 */
export function createWorkflowManager(
  supabaseClient: any
): WorkflowManager {
  const persistence = new DatabaseWorkflowPersistence(supabaseClient)
  return new WorkflowManager({
    persistence,
    enableNotifications: true,
    enableAuditLog: true,
  })
}

