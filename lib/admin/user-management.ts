/**
 * User Management Service
 * Provides user management functions for admin dashboard
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * User list filters
 */
export interface UserListFilters {
  role?: string
  status?: string
  organization?: string
  search?: string
}

/**
 * User update data
 */
export interface UserUpdateData {
  userId: string
  name?: string
  role?: string
  status?: 'pending' | 'active' | 'suspended' | 'inactive'
  organization?: string
}

/**
 * Get users with filters
 */
export async function getUsers(
  filters?: UserListFilters
): Promise<{
  success: boolean
  users?: Array<Record<string, unknown>>
  error?: string
}> {
  return monitor('get_users', async () => {
    const supabase = await createClient()

    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.role) {
        query = query.eq('role', filters.role)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.organization) {
        query = query.eq('organization', filters.organization)
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        )
      }

      const { data: users, error } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        users: users || [],
      }
    } catch (error) {
      logger.error('Failed to get users', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Update user
 */
export async function updateUser(
  data: UserUpdateData
): Promise<{ success: boolean; error?: string }> {
  return monitor('update_user', async () => {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (data.name !== undefined) {
      updateData.name = data.name
    }
    if (data.role !== undefined) {
      updateData.role = data.role
    }
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.organization !== undefined) {
      updateData.organization = data.organization
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', data.userId)

    if (error) {
      logger.error('Failed to update user', error, {
        userId: data.userId,
      })
      return {
        success: false,
        error: error.message,
      }
    }

    logger.info('User updated', {
      userId: data.userId,
      updates: updateData,
    })

    return {
      success: true,
    }
  })
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(
  userId: string,
  days: number = 30
): Promise<{
  success: boolean
  summary?: {
    totalActions: number
    actionsByType: Record<string, number>
    lastActivity?: string
  }
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: activities, error } = await supabase
      .from('user_activity_logs')
      .select('action_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const actionsByType: Record<string, number> = {}
    activities?.forEach((activity) => {
      const type = activity.action_type
      actionsByType[type] = (actionsByType[type] || 0) + 1
    })

    return {
      success: true,
      summary: {
        totalActions: activities?.length || 0,
        actionsByType,
        lastActivity: activities?.[0]?.created_at,
      },
    }
  } catch (error) {
    logger.error('Failed to get user activity summary', error as Error, {
      userId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get system statistics for admin dashboard
 */
export async function getSystemStatistics(): Promise<{
  success: boolean
  statistics?: {
    totalUsers: number
    usersByRole: Record<string, number>
    usersByStatus: Record<string, number>
    pendingRegistrations: number
    activeSessions: number
  }
  error?: string
}> {
  const supabase = await createClient()

  try {
    // Get user counts
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('role, status')

    if (usersError) {
      throw usersError
    }

    const usersByRole: Record<string, number> = {}
    const usersByStatus: Record<string, number> = {}

    users?.forEach((user) => {
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1
      usersByStatus[user.status] = (usersByStatus[user.status] || 0) + 1
    })

    // Get pending registrations
    const { count: pendingCount, error: pendingError } = await supabase
      .from('user_registration_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingError) {
      throw pendingError
    }

    // Get active sessions
    const { count: activeSessionsCount, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (sessionsError) {
      throw sessionsError
    }

    return {
      success: true,
      statistics: {
        totalUsers: users?.length || 0,
        usersByRole,
        usersByStatus,
        pendingRegistrations: pendingCount || 0,
        activeSessions: activeSessionsCount || 0,
      },
    }
  } catch (error) {
    logger.error('Failed to get system statistics', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

