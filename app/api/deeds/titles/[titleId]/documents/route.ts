/**
 * Get documents for a title
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getTitleDocuments } from '@/lib/deeds/documents-service'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (_request: NextRequest, _userId: string, _context: { params: Promise<{ titleId: string }> }) => {
  return withErrorHandler(async () => {
    const params = await _context.params
    const titleId = params.titleId

    if (!titleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title ID is required',
        },
        { status: 400 }
      )
    }

    const result = await getTitleDocuments(titleId)

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
      documents: result.documents || [],
    })
  })
})

