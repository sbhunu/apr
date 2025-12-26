/**
 * Audit Archive Service
 * Handles log retention and archiving
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { ArchiveConfig } from './types'

/**
 * Default archive configuration
 */
const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  retentionDays: 2555, // 7 years
  archiveAfterDays: 365, // Archive after 1 year
  compressionEnabled: true,
}

/**
 * Archive old audit logs
 */
export async function archiveOldLogs(
  config: ArchiveConfig = DEFAULT_ARCHIVE_CONFIG
): Promise<{
  success: boolean
  archived?: number
  error?: string
}> {
  return monitor('archive_old_logs', async () => {
    const supabase = await createClient()

    try {
      const archiveDate = new Date()
      archiveDate.setDate(archiveDate.getDate() - config.archiveAfterDays)

      // Mark logs as archived
      const { data, error } = await supabase
        .from('apr.audit_trail')
        .update({
          archived: true,
          archive_date: new Date().toISOString(),
        })
        .eq('archived', false)
        .lt('timestamp', archiveDate.toISOString())
        .select('id')

      if (error) {
        logger.error('Failed to archive logs', error, { config })
        return {
          success: false,
          error: error.message,
        }
      }

      logger.info('Audit logs archived', {
        archived: data?.length || 0,
        archiveDate: archiveDate.toISOString(),
      })

      return {
        success: true,
        archived: data?.length || 0,
      }
    } catch (error) {
      logger.error('Exception archiving logs', error as Error, { config })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Delete archived logs beyond retention period
 */
export async function deleteExpiredLogs(
  config: ArchiveConfig = DEFAULT_ARCHIVE_CONFIG
): Promise<{
  success: boolean
  deleted?: number
  error?: string
}> {
  return monitor('delete_expired_logs', async () => {
    const supabase = await createClient()

    try {
      const retentionDate = new Date()
      retentionDate.setDate(retentionDate.getDate() - config.retentionDays)

      // Delete archived logs beyond retention period
      const { data, error } = await supabase
        .from('apr.audit_trail')
        .delete()
        .eq('archived', true)
        .lt('archive_date', retentionDate.toISOString())
        .select('id')

      if (error) {
        logger.error('Failed to delete expired logs', error, { config })
        return {
          success: false,
          error: error.message,
        }
      }

      logger.info('Expired audit logs deleted', {
        deleted: data?.length || 0,
        retentionDate: retentionDate.toISOString(),
      })

      return {
        success: true,
        deleted: data?.length || 0,
      }
    } catch (error) {
      logger.error('Exception deleting expired logs', error as Error, { config })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get archive statistics
 */
export async function getArchiveStatistics(): Promise<{
  success: boolean
  statistics?: {
    totalEntries: number
    activeEntries: number
    archivedEntries: number
    oldestEntry?: string
    newestEntry?: string
    archiveSize?: number
  }
  error?: string
}> {
  const supabase = await createClient()

  try {
    const [totalResult, activeResult, archivedResult, oldestResult, newestResult] =
      await Promise.all([
        supabase.from('apr.audit_trail').select('id', { count: 'exact', head: true }),
        supabase
          .from('apr.audit_trail')
          .select('id', { count: 'exact', head: true })
          .eq('archived', false),
        supabase
          .from('apr.audit_trail')
          .select('id', { count: 'exact', head: true })
          .eq('archived', true),
        supabase
          .from('apr.audit_trail')
          .select('timestamp')
          .order('timestamp', { ascending: true })
          .limit(1)
          .single(),
        supabase
          .from('apr.audit_trail')
          .select('timestamp')
          .order('timestamp', { ascending: false })
          .limit(1)
          .single(),
      ])

    return {
      success: true,
      statistics: {
        totalEntries: totalResult.count || 0,
        activeEntries: activeResult.count || 0,
        archivedEntries: archivedResult.count || 0,
        oldestEntry: oldestResult.data?.timestamp,
        newestEntry: newestResult.data?.timestamp,
      },
    }
  } catch (error) {
    logger.error('Exception getting archive statistics', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

