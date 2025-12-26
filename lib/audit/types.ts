/**
 * Audit Trail Types
 * Types for comprehensive audit logging system
 */

/**
 * Audit event type
 */
export type AuditEventType =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'seal'
  | 'register'
  | 'transfer'
  | 'amend'
  | 'view'
  | 'export'
  | 'sign'
  | 'verify'
  | 'login'
  | 'logout'
  | 'system'

/**
 * Resource type
 */
export type ResourceType =
  | 'planning_plan'
  | 'survey_plan'
  | 'sectional_scheme'
  | 'sectional_title'
  | 'body_corporate'
  | 'ownership_transfer'
  | 'mortgage'
  | 'lease'
  | 'scheme_amendment'
  | 'user'
  | 'role'
  | 'permission'
  | 'document'
  | 'signature'
  | 'certificate'
  | 'system'

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string
  eventType: AuditEventType
  resourceType: ResourceType
  resourceId: string
  userId: string
  userName: string
  userRole: string
  action: string
  description: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: string
  previousHash?: string
  currentHash: string
  chainHash?: string
  archived: boolean
  archiveDate?: string
  createdAt: string
}

/**
 * Audit query filters
 */
export interface AuditQueryFilters {
  eventType?: AuditEventType | AuditEventType[]
  resourceType?: ResourceType | ResourceType[]
  resourceId?: string
  userId?: string
  userRole?: string
  startDate?: string
  endDate?: string
  action?: string
  archived?: boolean
  limit?: number
  offset?: number
}

/**
 * Audit trail result
 */
export interface AuditTrailResult {
  success: boolean
  entries?: AuditLogEntry[]
  total?: number
  error?: string
}

/**
 * Compliance report filters
 */
export interface ComplianceReportFilters {
  entityType: ResourceType
  entityId: string
  startDate?: string
  endDate?: string
  includeArchived?: boolean
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  entityType: ResourceType
  entityId: string
  totalEvents: number
  events: AuditLogEntry[]
  timeline: Array<{
    timestamp: string
    event: string
    actor: string
    role: string
    description: string
  }>
  integrity: {
    hashChainValid: boolean
    tamperDetected: boolean
    missingEntries: number
  }
  generatedAt: string
}

/**
 * Archive configuration
 */
export interface ArchiveConfig {
  retentionDays: number
  archiveAfterDays: number
  compressionEnabled: boolean
  storageLocation?: string
}

