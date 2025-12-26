/**
 * Get sections for a specific scheme
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSchemeSections } from '@/lib/deeds/scheme-selection'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, _userId: string, _context: { params: Promise<{ schemeId: string }> }) => {
  return withErrorHandler(async () => {
    const params = await _context.params
    const schemeId = params.schemeId

    if (!schemeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scheme ID is required',
        },
        { status: 400 }
      )
    }

    const result = await getSchemeSections(schemeId)

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
      sections: result.sections || [],
    })
  })
})

