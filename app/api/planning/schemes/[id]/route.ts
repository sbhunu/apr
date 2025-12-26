/**
 * Planning Scheme API Route (by ID)
 * Handles scheme updates and retrieval
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { updateSchemeDraft, getSchemeDraft } from '@/lib/planning/scheme-service'
import { schemeFormSchema } from '@/lib/planning/scheme-form-schema'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/planning/schemes/[id] - Get scheme
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const result = await getSchemeDraft(id, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 404 }
      )
    }

    await logActivity(userId, 'read', 'planning', {
      resourceId: id,
    })

    return NextResponse.json({
      success: true,
      plan: result.plan,
    })
  })
})

/**
 * PATCH /api/planning/schemes/[id] - Update scheme draft
 */
export const PATCH = createRBACMiddleware({
  requiredPermissions: ['planning:update'],
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    
    // Check if plan is locked
    const { validatePlanEditable } = await import('@/lib/planning/plan-locking')
    const validation = await validatePlanEditable(id, userId)
    
    if (!validation.editable) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Plan cannot be edited',
          reason: validation.reason,
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate form data
    const validated = schemeFormSchema.partial().parse(body)

    // Update draft
    const result = await updateSchemeDraft(id, validated, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'planning', {
      resourceId: id,
      metadata: { updates: Object.keys(validated) },
    })

    return NextResponse.json({
      success: true,
      message: 'Scheme draft updated',
    })
  })
})

