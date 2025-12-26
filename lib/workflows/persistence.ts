/**
 * Workflow Persistence Layer
 * Handles workflow state persistence, audit trail, and optimistic locking
 */

import { StateTransition, WorkflowMetadata } from '@/types/workflows'
import { WorkflowContext } from './base'
import { ValidationError, ConflictError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

/**
 * Workflow history record
 */
export interface WorkflowHistoryRecord {
  id: string
  entity_id: string
  workflow_type: 'planning' | 'survey' | 'deed' | 'title'
  from_state: string
  to_state: string
  transitioned_by: string
  transitioned_at: string
  reason?: string
  metadata?: Record<string, unknown>
  version: number // For optimistic locking
}

/**
 * Workflow persistence interface
 */
export interface WorkflowPersistence {
  saveTransition(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title',
    transition: StateTransition<string>,
    currentVersion: number
  ): Promise<{ success: boolean; newVersion: number; error?: string }>

  getHistory(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<StateTransition<string>[]>

  getCurrentState(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<{ state: string; version: number } | null>
}

/**
 * Database-backed workflow persistence
 */
export class DatabaseWorkflowPersistence implements WorkflowPersistence {
  constructor(
    private supabaseClient: {
      from: (table: string) => any
      rpc: (name: string, params: Record<string, unknown>) => Promise<{
        data: any
        error: { message: string } | null
      }>
    }
  ) {}

  /**
   * Save workflow transition with optimistic locking
   */
  async saveTransition(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title',
    transition: StateTransition<string>,
    currentVersion: number
  ): Promise<{ success: boolean; newVersion: number; error?: string }> {
    try {
      // Use RPC function with optimistic locking
      const { data, error } = await this.supabaseClient.rpc('save_workflow_transition', {
        p_entity_id: entityId,
        p_workflow_type: workflowType,
        p_from_state: transition.from,
        p_to_state: transition.to,
        p_transitioned_by: transition.userId,
        p_reason: transition.reason,
        p_metadata: transition.metadata || {},
        p_current_version: currentVersion,
      })

      if (error) {
        // Check for version conflict
        if (error.message?.includes('version') || error.message?.includes('concurrent')) {
          throw new ConflictError(
            'Workflow state was modified by another user. Please refresh and try again.',
            'workflow',
            { entityId, workflowType, currentVersion }
          )
        }
        throw new ValidationError(
          `Failed to save workflow transition: ${error.message}`,
          'workflow_persistence',
          { entityId, workflowType, error: error.message }
        )
      }

      return {
        success: true,
        newVersion: data?.new_version || currentVersion + 1,
      }
    } catch (error) {
      logger.error('Failed to save workflow transition', error as Error, {
        entityId,
        workflowType,
        transition,
      })
      throw error
    }
  }

  /**
   * Get workflow history
   */
  async getHistory(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<StateTransition<string>[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('workflow_history')
        .select('*')
        .eq('entity_id', entityId)
        .eq('workflow_type', workflowType)
        .order('transitioned_at', { ascending: true })

      if (error) {
        throw new ValidationError(
          `Failed to get workflow history: ${error.message}`,
          'workflow_history',
          { entityId, workflowType }
        )
      }

      return (
        data?.map((record: WorkflowHistoryRecord) => ({
          from: record.from_state,
          to: record.to_state,
          timestamp: record.transitioned_at,
          userId: record.transitioned_by,
          reason: record.reason,
          metadata: record.metadata,
        })) || []
      )
    } catch (error) {
      logger.error('Failed to get workflow history', error as Error, {
        entityId,
        workflowType,
      })
      throw error
    }
  }

  /**
   * Get current workflow state
   */
  async getCurrentState(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<{ state: string; version: number } | null> {
    try {
      // Get from workflow_history table (latest transition)
      const { data, error } = await this.supabaseClient
        .from('workflow_history')
        .select('to_state, version')
        .eq('entity_id', entityId)
        .eq('workflow_type', workflowType)
        .order('transitioned_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // If no history exists, return null (entity not in workflow)
        if (error.code === 'PGRST116') {
          return null
        }
        throw new ValidationError(
          `Failed to get current workflow state: ${error.message}`,
          'workflow_state',
          { entityId, workflowType }
        )
      }

      return {
        state: data.to_state,
        version: data.version,
      }
    } catch (error) {
      logger.error('Failed to get current workflow state', error as Error, {
        entityId,
        workflowType,
      })
      throw error
    }
  }
}

/**
 * In-memory workflow persistence (for testing)
 */
export class MemoryWorkflowPersistence implements WorkflowPersistence {
  private history: Map<string, WorkflowHistoryRecord[]> = new Map()
  private states: Map<string, { state: string; version: number }> = new Map()

  private getKey(entityId: string, workflowType: string): string {
    return `${workflowType}:${entityId}`
  }

  async saveTransition(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title',
    transition: StateTransition<string>,
    currentVersion: number
  ): Promise<{ success: boolean; newVersion: number; error?: string }> {
    const key = this.getKey(entityId, workflowType)
    const current = this.states.get(key)

    // Optimistic locking check
    if (current && current.version !== currentVersion) {
      return {
        success: false,
        newVersion: current.version,
        error: 'Version conflict: state was modified by another operation',
      }
    }

    const newVersion = (current?.version || 0) + 1
    const record: WorkflowHistoryRecord = {
      id: `${key}:${newVersion}`,
      entity_id: entityId,
      workflow_type: workflowType,
      from_state: transition.from,
      to_state: transition.to,
      transitioned_by: transition.userId,
      transitioned_at: transition.timestamp,
      reason: transition.reason,
      metadata: transition.metadata,
      version: newVersion,
    }

    // Save history
    const history = this.history.get(key) || []
    history.push(record)
    this.history.set(key, history)

    // Update current state
    this.states.set(key, {
      state: transition.to,
      version: newVersion,
    })

    return {
      success: true,
      newVersion,
    }
  }

  async getHistory(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<StateTransition<string>[]> {
    const key = this.getKey(entityId, workflowType)
    const history = this.history.get(key) || []

    return history.map((record) => ({
      from: record.from_state,
      to: record.to_state,
      timestamp: record.transitioned_at,
      userId: record.transitioned_by,
      reason: record.reason,
      metadata: record.metadata,
    }))
  }

  async getCurrentState(
    entityId: string,
    workflowType: 'planning' | 'survey' | 'deed' | 'title'
  ): Promise<{ state: string; version: number } | null> {
    const key = this.getKey(entityId, workflowType)
    return this.states.get(key) || null
  }
}

