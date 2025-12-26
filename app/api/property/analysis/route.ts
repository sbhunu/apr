/**
 * Property Analysis API Route
 * Returns comprehensive property records analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { getPropertyAnalysisByScheme, getPropertyAnalysisByTitle } from '@/lib/deeds/property-analysis'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const schemeNumber = searchParams.get('schemeNumber')
    const titleNumber = searchParams.get('titleNumber')

    if (!schemeNumber && !titleNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either schemeNumber or titleNumber is required',
        },
        { status: 400 }
      )
    }

    if (schemeNumber) {
      const result = await getPropertyAnalysisByScheme(schemeNumber)
      return NextResponse.json(result)
    }

    if (titleNumber) {
      const result = await getPropertyAnalysisByTitle(titleNumber)
      return NextResponse.json(result)
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
      },
      { status: 400 }
    )
  })
})

