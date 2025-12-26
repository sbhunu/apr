/**
 * Plan Locking Middleware
 * Middleware to enforce plan locking in API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { validatePlanEditable } from './plan-locking'
import { AuthorizationError } from '@/lib/errors/base'

/**
 * Create middleware to check if plan can be edited
 */
export function createPlanLockingMiddleware(
  getPlanId: (request: NextRequest) => Promise<string | null>
) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, userId: string, planId: string) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // Get authenticated user
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication required',
          },
          { status: 401 }
        )
      }

      // Get plan ID from request
      const planId = await getPlanId(request)
      if (!planId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Plan ID is required',
          },
          { status: 400 }
        )
      }

      // Validate plan can be edited
      const validation = await validatePlanEditable(planId, user.id)
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

      // Call handler
      return await handler(request, user.id, planId)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan locking check failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

