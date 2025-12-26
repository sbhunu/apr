/**
 * Generate Report API Route
 * Generates exportable reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { generateReport } from '@/lib/analytics/reports'
import { withErrorHandler } from '@/lib/api-error-handler'
import { ReportType, ReportFormat } from '@/lib/analytics/reports'

/**
 * GET /api/analytics/reports/generate - Generate report
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['analytics:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const reportType = (searchParams.get('reportType') || 'summary') as ReportType
    const format = (searchParams.get('format') || 'pdf') as ReportFormat
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const province = searchParams.get('province') || undefined

    const result = await generateReport({
      reportType,
      format,
      filters: {
        startDate,
        endDate,
        province,
      },
      includeCharts: format === 'pdf',
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

    const body: BodyInit =
      typeof result.reportData === 'string'
        ? result.reportData
        : result.reportData instanceof Uint8Array
          ? (() => {
              const bytes = result.reportData
              const copy = new Uint8Array(bytes.byteLength)
              copy.set(bytes)
              return new Blob([copy.buffer])
            })()
          : ''

    return new NextResponse(body, {
      headers: {
        'Content-Type': result.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  })
})

