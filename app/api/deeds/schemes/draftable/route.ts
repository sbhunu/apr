/**
 * Get registered schemes available for drafting
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getDraftableSchemes } from '@/lib/deeds/scheme-selection'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (_request: NextRequest) => {
  return withErrorHandler(async () => {
    const result = await getDraftableSchemes()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      schemes: result.schemes || [],
    })
  })
})

