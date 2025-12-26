/**
 * Compliance and Data Protection
 * Implements GDPR compliance and data protection measures
 */

import { logger } from '@/lib/logger'

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  entityType: string
  retentionDays: number
  archiveAfterDays?: number
  deleteAfterDays?: number
}

/**
 * Default retention policies (in days)
 */
export const defaultRetentionPolicies: RetentionPolicy[] = [
  {
    entityType: 'audit_log',
    retentionDays: 2555, // 7 years (legal requirement)
    archiveAfterDays: 1825, // 5 years
  },
  {
    entityType: 'verification_history',
    retentionDays: 365, // 1 year
    archiveAfterDays: 180, // 6 months
  },
  {
    entityType: 'user_session',
    retentionDays: 90, // 3 months
  },
  {
    entityType: 'user_activity_log',
    retentionDays: 2555, // 7 years
    archiveAfterDays: 1825, // 5 years
  },
]

/**
 * Check if data should be archived
 */
export function shouldArchive(
  createdAt: Date,
  policy: RetentionPolicy
): boolean {
  if (!policy.archiveAfterDays) {
    return false
  }

  const archiveDate = new Date(createdAt)
  archiveDate.setDate(archiveDate.getDate() + policy.archiveAfterDays)
  return new Date() >= archiveDate
}

/**
 * Check if data should be deleted
 */
export function shouldDelete(
  createdAt: Date,
  policy: RetentionPolicy
): boolean {
  if (!policy.deleteAfterDays) {
    return false
  }

  const deleteDate = new Date(createdAt)
  deleteDate.setDate(deleteDate.getDate() + policy.deleteAfterDays)
  return new Date() >= deleteDate
}

/**
 * Anonymize personal data for GDPR compliance
 */
export function anonymizePersonalData(data: Record<string, unknown>): Record<string, unknown> {
  const anonymized = { ...data }

  // Fields to anonymize
  const personalFields = [
    'email',
    'phone',
    'id_number',
    'holder_id_number',
    'holder_name',
    'planner_name',
    'surveyor_name',
  ]

  for (const field of personalFields) {
    if (field in anonymized && typeof anonymized[field] === 'string') {
      const value = anonymized[field] as string
      if (value.length > 0) {
        // Replace with anonymized version (first char + ***)
        anonymized[field] = `${value[0]}***`
      }
    }
  }

  return anonymized
}

/**
 * Check if user has right to data access (GDPR)
 */
export function hasDataAccessRight(
  userId: string,
  dataOwnerId: string,
  userRole: string
): boolean {
  // User can access their own data
  if (userId === dataOwnerId) {
    return true
  }

  // Admins and auditors can access all data
  if (['admin', 'auditor'].includes(userRole)) {
    return true
  }

  return false
}

/**
 * Check if user has right to data deletion (GDPR)
 */
export function hasDataDeletionRight(
  userId: string,
  dataOwnerId: string,
  userRole: string
): boolean {
  // Users can request deletion of their own data
  if (userId === dataOwnerId) {
    return true
  }

  // Only admins can delete other users' data
  if (userRole === 'admin') {
    return true
  }

  return false
}

/**
 * Log data access for GDPR compliance
 */
export function logDataAccess(
  userId: string,
  dataType: string,
  dataId: string,
  reason: string
): void {
  logger.info('Data access logged for GDPR compliance', {
    userId,
    dataType,
    dataId,
    reason,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log data deletion for GDPR compliance
 */
export function logDataDeletion(
  userId: string,
  dataType: string,
  dataId: string,
  reason: string
): void {
  logger.info('Data deletion logged for GDPR compliance', {
    userId,
    dataType,
    dataId,
    reason,
    timestamp: new Date().toISOString(),
  })
}

