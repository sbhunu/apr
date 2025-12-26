/**
 * Public Statistics API Route
 * Returns public statistics without sensitive data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRegistrationStatistics } from '@/lib/analytics/statistics'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/public/statistics - Get public statistics
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const province = searchParams.get('province') || undefined

  const result = await getRegistrationStatistics({
    startDate,
    endDate,
    province,
  })

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 400 }
    )
  }

  // Return only public-safe statistics (no sensitive user data)
  const publicStatistics = {
    totalSchemes: result.statistics?.totalSchemes || 0,
    totalTitles: result.statistics?.totalTitles || 0,
    totalTransfers: result.statistics?.totalTransfers || 0,
    totalAmendments: result.statistics?.totalAmendments || 0,
    totalMortgages: result.statistics?.totalMortgages || 0,
    totalLeases: result.statistics?.totalLeases || 0,
    byProvince: result.statistics?.byProvince || [],
    byMonth: result.statistics?.byMonth || [],
    byStatus: result.statistics?.byStatus || {
      planning: { submitted: 0, approved: 0, rejected: 0 },
      survey: { draft: 0, sealed: 0, rejected: 0 },
      deeds: { draft: 0, registered: 0, rejected: 0 },
    },
  }

  return NextResponse.json({
    success: true,
    statistics: publicStatistics,
  })
})

