/**
 * Comprehensive Audit Service
 * Immutable audit logging with hash chaining for legal compliance
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { createHash } from 'crypto'
import {
  AuditLogEntry,
  AuditEventType,
  ResourceType,
  AuditQueryFilters,
  AuditTrailResult,
  ComplianceReportFilters,
  ComplianceReport,
} from './types'

/**
 * Generate hash for audit entry
 */
function generateAuditHash(entry: Partial<AuditLogEntry>): string {
  const hashInput = JSON.stringify({
    eventType: entry.eventType,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    userId: entry.userId,
    action: entry.action,
    timestamp: entry.timestamp,
    previousHash: entry.previousHash || '',
  })
  return createHash('sha256').update(hashInput).digest('hex')
}

/**
 * Generate chain hash (hash of current entry + previous chain hash)
 */
function generateChainHash(currentHash: string, previousChainHash?: string): string {
  const hashInput = previousChainHash
    ? `${previousChainHash}:${currentHash}`
    : currentHash
  return createHash('sha256').update(hashInput).digest('hex')
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
  action: string,
  description: string,
  options?: {
    changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> }
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }
): Promise<{
  success: boolean
  auditId?: string
  error?: string
}> {
  return monitor('log_audit_event', async () => {
    const supabase = await createClient()

    try {
      // Get user profile for name and role
      const { data: userProfile } = await supabase
        .from('apr.user_profiles')
        .select('name, role')
        .eq('id', userId)
        .single()

      const timestamp = new Date().toISOString()

      // Get previous hash for this resource (for hash chaining)
      const { data: previousEntry } = await supabase
        .from('apr.audit_trail')
        .select('current_hash, chain_hash')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const previousHash = previousEntry?.current_hash
      const previousChainHash = previousEntry?.chain_hash

      // Generate hashes
      const entryData: Partial<AuditLogEntry> = {
        eventType,
        resourceType,
        resourceId,
        userId,
        userName: userProfile?.name || 'Unknown',
        userRole: userProfile?.role || 'unknown',
        action,
        description,
        changes: options?.changes,
        metadata: options?.metadata,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        timestamp,
        previousHash,
      }

      const currentHash = generateAuditHash(entryData)
      const chainHash = generateChainHash(currentHash, previousChainHash)

      // Insert audit entry
      const { data: auditEntry, error: insertError } = await supabase
        .from('apr.audit_trail')
        .insert({
          event_type: eventType,
          resource_type: resourceType,
          resource_id: resourceId,
          user_id: userId,
          user_name: userProfile?.name || 'Unknown',
          user_role: userProfile?.role || 'unknown',
          action,
          description,
          changes: options?.changes || {},
          metadata: options?.metadata || {},
          ip_address: options?.ipAddress,
          user_agent: options?.userAgent,
          timestamp,
          previous_hash: previousHash,
          current_hash: currentHash,
          chain_hash: chainHash,
          archived: false,
        })
        .select('id')
        .single()

      if (insertError) {
        logger.error('Failed to insert audit entry', insertError, {
          eventType,
          resourceType,
          resourceId,
        })
        return {
          success: false,
          error: insertError.message,
        }
      }

      logger.debug('Audit event logged', {
        auditId: auditEntry.id,
        eventType,
        resourceType,
        resourceId,
      })

      return {
        success: true,
        auditId: auditEntry.id,
      }
    } catch (error) {
      logger.error('Exception logging audit event', error as Error, {
        eventType,
        resourceType,
        resourceId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Query audit trail
 */
export async function queryAuditTrail(
  filters: AuditQueryFilters
): Promise<AuditTrailResult> {
  return monitor('query_audit_trail', async () => {
    const supabase = await createClient()

    try {
      let query = supabase.from('apr.audit_trail').select('*', { count: 'exact' })

      // Apply filters
      if (filters.eventType) {
        if (Array.isArray(filters.eventType)) {
          query = query.in('event_type', filters.eventType)
        } else {
          query = query.eq('event_type', filters.eventType)
        }
      }

      if (filters.resourceType) {
        if (Array.isArray(filters.resourceType)) {
          query = query.in('resource_type', filters.resourceType)
        } else {
          query = query.eq('resource_type', filters.resourceType)
        }
      }

      if (filters.resourceId) {
        query = query.eq('resource_id', filters.resourceId)
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.userRole) {
        query = query.eq('user_role', filters.userRole)
      }

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate)
      }

      if (filters.action) {
        query = query.ilike('action', `%${filters.action}%`)
      }

      if (filters.archived !== undefined) {
        query = query.eq('archived', filters.archived)
      }

      // Ordering
      query = query.order('timestamp', { ascending: false })

      // Pagination
      const limit = filters.limit || 100
      const offset = filters.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data: entries, error, count } = await query

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        entries: (entries || []) as AuditLogEntry[],
        total: count || 0,
      }
    } catch (error) {
      logger.error('Exception querying audit trail', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  filters: ComplianceReportFilters
): Promise<{
  success: boolean
  report?: ComplianceReport
  error?: string
}> {
  return monitor('generate_compliance_report', async () => {
    const supabase = await createClient()

    try {
      // Get all audit entries for the entity
      const auditResult = await queryAuditTrail({
        resourceType: filters.entityType,
        resourceId: filters.entityId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        archived: filters.includeArchived ? undefined : false,
        limit: 10000, // Large limit for compliance reports
      })

      if (!auditResult.success || !auditResult.entries) {
        return {
          success: false,
          error: auditResult.error || 'Failed to retrieve audit entries',
        }
      }

      const entries = auditResult.entries.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      // Verify hash chain integrity
      let hashChainValid = true
      let tamperDetected = false
      let missingEntries = 0

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const previousEntry = i > 0 ? entries[i - 1] : null

        // Verify current hash
        const expectedHash = generateAuditHash(entry)
        if (expectedHash !== entry.currentHash) {
          hashChainValid = false
          tamperDetected = true
        }

        // Verify chain hash
        if (previousEntry) {
          const expectedChainHash = generateChainHash(entry.currentHash, previousEntry.chainHash)
          if (expectedChainHash !== entry.chainHash) {
            hashChainValid = false
            tamperDetected = true
          }

          // Check if previous hash matches
          if (entry.previousHash !== previousEntry.currentHash) {
            missingEntries++
          }
        } else {
          // First entry should have no previous hash
          if (entry.previousHash) {
            hashChainValid = false
          }
        }
      }

      // Generate timeline
      const timeline = entries.map((entry) => ({
        timestamp: entry.timestamp,
        event: entry.action,
        actor: entry.userName,
        role: entry.userRole,
        description: entry.description,
      }))

      const report: ComplianceReport = {
        entityType: filters.entityType,
        entityId: filters.entityId,
        totalEvents: entries.length,
        events: entries,
        timeline,
        integrity: {
          hashChainValid,
          tamperDetected,
          missingEntries,
        },
        generatedAt: new Date().toISOString(),
      }

      return {
        success: true,
        report,
      }
    } catch (error) {
      logger.error('Exception generating compliance report', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Verify audit trail integrity
 */
export async function verifyAuditTrailIntegrity(
  resourceType: ResourceType,
  resourceId: string
): Promise<{
  success: boolean
  valid?: boolean
  tamperDetected?: boolean
  errors?: string[]
}> {
  const auditResult = await queryAuditTrail({
    resourceType,
    resourceId,
    limit: 10000,
  })

  if (!auditResult.success || !auditResult.entries) {
    return {
      success: false,
      errors: [auditResult.error || 'Failed to retrieve audit entries'],
    }
  }

  const entries = auditResult.entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const errors: string[] = []
  let tamperDetected = false

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const previousEntry = i > 0 ? entries[i - 1] : null

    // Verify current hash
    const expectedHash = generateAuditHash(entry)
    if (expectedHash !== entry.currentHash) {
      errors.push(`Entry ${entry.id}: Hash mismatch`)
      tamperDetected = true
    }

    // Verify chain hash
    if (previousEntry) {
      const expectedChainHash = generateChainHash(entry.currentHash, previousEntry.chainHash)
      if (expectedChainHash !== entry.chainHash) {
        errors.push(`Entry ${entry.id}: Chain hash mismatch`)
        tamperDetected = true
      }
    }
  }

  return {
    success: true,
    valid: errors.length === 0,
    tamperDetected,
    errors: errors.length > 0 ? errors : undefined,
  }
}

