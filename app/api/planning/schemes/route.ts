/**
 * Planning Schemes API Route
 * Handles scheme creation and listing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createSchemeDraft } from '@/lib/planning/scheme-service'
import { schemeFormSchema } from '@/lib/planning/scheme-form-schema'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/planning/schemes - Create new scheme draft
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()

    // Validate form data
    const validated = schemeFormSchema.partial().parse(body)

    // Create draft
    const result = await createSchemeDraft(validated, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'create', 'planning', {
      resourceId: result.planId,
      metadata: { planNumber: result.planNumber },
    })

    return NextResponse.json({
      success: true,
      planId: result.planId,
      planNumber: result.planNumber,
    })
  })
})

/**
 * GET /api/planning/schemes - List schemes
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let query = supabase
      .from('sectional_scheme_plans')
      .select('*')
      .eq('planner_id', userId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: schemes, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    await logActivity(userId, 'read', 'planning', {
      metadata: { status, count: schemes?.length || 0 },
    })

    return NextResponse.json({
      success: true,
      schemes: schemes || [],
    })
  })
})

