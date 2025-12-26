/**
 * Backup Status API Route
 * Provides backup status and history
 */

import { NextRequest, NextResponse } from 'next/server'
import { getBackupHistory, getLatestBackup, isBackupStale } from '@/lib/backup/backup-service'
import { checkRole } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/backup/status - Get backup status
 */
export const GET = withErrorHandler(async (_request: NextRequest) => {
    // Require admin role
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleCheck = await checkRole(user.id, 'admin')
    if (!roleCheck.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get latest backups for each type
    const [databaseBackup, storageBackup, configBackup, fullBackup] = await Promise.all([
      getLatestBackup('database'),
      getLatestBackup('storage'),
      getLatestBackup('config'),
      getLatestBackup('full'),
    ])

    // Check if backups are stale
    const databaseStale = databaseBackup ? isBackupStale(databaseBackup, 24) : true
    const storageStale = storageBackup ? isBackupStale(storageBackup, 24) : true
    const configStale = configBackup ? isBackupStale(configBackup, 168) : true // 7 days for config

    return NextResponse.json({
      database: {
        latest: databaseBackup,
        stale: databaseStale,
        status: databaseStale ? 'warning' : 'ok',
      },
      storage: {
        latest: storageBackup,
        stale: storageStale,
        status: storageStale ? 'warning' : 'ok',
      },
      config: {
        latest: configBackup,
        stale: configStale,
        status: configStale ? 'warning' : 'ok',
      },
      full: {
        latest: fullBackup,
        stale: fullBackup ? isBackupStale(fullBackup, 24) : true,
        status: fullBackup && !isBackupStale(fullBackup, 24) ? 'ok' : 'warning',
      },
      timestamp: new Date().toISOString(),
    })
})

