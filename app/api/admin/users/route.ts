/**
 * Admin Users API Route
 * Provides user management endpoints for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getUsers, updateUser, getSystemStatistics } from '@/lib/admin/user-management'
import { logActivity } from '@/lib/admin/rbac'

/**
 * GET /api/admin/users - List users
 */
export const GET = createRBACMiddleware({
  requiredRole: 'admin',
})(async (request: NextRequest, userId: string) => {
  const searchParams = request.nextUrl.searchParams
  const filters = {
    role: searchParams.get('role') || undefined,
    status: searchParams.get('status') || undefined,
    organization: searchParams.get('organization') || undefined,
    search: searchParams.get('search') || undefined,
  }

  const result = await getUsers(filters)

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 500 }
    )
  }

  await logActivity(userId, 'read', 'user', {
    metadata: { filters },
  })

  return NextResponse.json({
    success: true,
    users: result.users,
  })
})

/**
 * PATCH /api/admin/users - Update user
 */
export const PATCH = createRBACMiddleware({
  requiredRole: 'admin',
})(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { userId: targetUserId, ...updateData } = body

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        { status: 400 }
      )
    }

    const result = await updateUser({
      userId: targetUserId,
      ...updateData,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    await logActivity(userId, 'update', 'user', {
      resourceId: targetUserId,
      metadata: { updates: updateData },
    })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    )
  }
})

