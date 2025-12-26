/**
 * Get geometry data for a scheme
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getSchemeGeometry } from '@/lib/deeds/geometry-service'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (_request: NextRequest, _userId: string, _context: { params: Promise<{ schemeId: string }> }) => {
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

    const result = await getSchemeGeometry(schemeId)

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
      data: result.data,
    })
  })
})

