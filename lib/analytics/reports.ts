/**
 * Report Generation Service
 * Generates exportable reports (PDF, Excel, CSV)
 */

import { PDFGenerator } from '@/lib/documents/pdf-generator'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { getRegistrationStatistics, StatisticsFilters } from './statistics'
import { getSpatialAnalysis } from './spatial'

/**
 * Report type
 */
export type ReportType = 'summary' | 'provincial' | 'spatial' | 'performance' | 'custom'

/**
 * Report format
 */
export type ReportFormat = 'pdf' | 'excel' | 'csv'

/**
 * Report generation options
 */
export interface ReportGenerationOptions {
  reportType: ReportType
  format: ReportFormat
  filters?: StatisticsFilters
  title?: string
  includeCharts?: boolean
}

/**
 * Generate PDF report
 */
async function generatePDFReport(
  options: ReportGenerationOptions,
  statistics: any,
  spatialAnalysis?: any
): Promise<Uint8Array> {
  const pdf = new PDFGenerator('portrait', 'mm', 'a4')
  pdf.setMargins(20)

  const pageWidth = pdf.getAvailableWidth()
  let currentY = 30

  // Title
  pdf.addText(options.title || 'APR System Report', 20 + pageWidth / 2, currentY, {
    fontSize: 18,
    fontStyle: 'bold',
    align: 'center',
  })
  currentY += 15

  // Date
  pdf.addText(
    `Generated: ${new Date().toLocaleDateString('en-ZW')}`,
    20 + pageWidth / 2,
    currentY,
    {
      fontSize: 10,
      align: 'center',
    }
  )
  currentY += 20

  // Summary statistics
  if (statistics) {
    pdf.addText('Summary Statistics', 20, currentY, {
      fontSize: 14,
      fontStyle: 'bold',
    })
    currentY += 10

    const stats = [
      ['Total Schemes', statistics.totalSchemes?.toString() || '0'],
      ['Total Titles', statistics.totalTitles?.toString() || '0'],
      ['Total Transfers', statistics.totalTransfers?.toString() || '0'],
      ['Total Amendments', statistics.totalAmendments?.toString() || '0'],
      ['Total Mortgages', statistics.totalMortgages?.toString() || '0'],
      ['Total Leases', statistics.totalLeases?.toString() || '0'],
    ]

    pdf.addTable(stats, 20, currentY, {
      columnWidths: [100, 80],
      headerStyle: {
        fontSize: 10,
        fontStyle: 'bold',
        fillColor: [240, 240, 240],
      },
      cellStyle: {
        fontSize: 10,
        align: 'left',
      },
    })
    currentY += 50
  }

  // Provincial breakdown
  if (statistics?.byProvince && statistics.byProvince.length > 0) {
    pdf.addText('Provincial Breakdown', 20, currentY, {
      fontSize: 14,
      fontStyle: 'bold',
    })
    currentY += 10

    const provinceData = [
      ['Province', 'Schemes', 'Titles', 'Transfers'],
      ...statistics.byProvince.map((p: any) => [
        p.province,
        p.schemes.toString(),
        p.titles.toString(),
        p.transfers.toString(),
      ]),
    ]

    pdf.addTable(provinceData, 20, currentY, {
      columnWidths: [60, 40, 40, 40],
      headerStyle: {
        fontSize: 10,
        fontStyle: 'bold',
        fillColor: [240, 240, 240],
      },
      cellStyle: {
        fontSize: 9,
        align: 'left',
      },
    })
    currentY += 50
  }

  return pdf.generate()
}

/**
 * Generate CSV report
 */
function generateCSVReport(
  options: ReportGenerationOptions,
  statistics: any,
  spatialAnalysis?: any
): string {
  const lines: string[] = []

  // Header
  lines.push('APR System Report')
  lines.push(`Generated: ${new Date().toLocaleDateString('en-ZW')}`)
  lines.push('')

  // Summary statistics
  if (statistics) {
    lines.push('Summary Statistics')
    lines.push('Metric,Value')
    lines.push(`Total Schemes,${statistics.totalSchemes || 0}`)
    lines.push(`Total Titles,${statistics.totalTitles || 0}`)
    lines.push(`Total Transfers,${statistics.totalTransfers || 0}`)
    lines.push(`Total Amendments,${statistics.totalAmendments || 0}`)
    lines.push(`Total Mortgages,${statistics.totalMortgages || 0}`)
    lines.push(`Total Leases,${statistics.totalLeases || 0}`)
    lines.push('')
  }

  // Provincial breakdown
  if (statistics?.byProvince && statistics.byProvince.length > 0) {
    lines.push('Provincial Breakdown')
    lines.push('Province,Schemes,Titles,Transfers')
    statistics.byProvince.forEach((p: any) => {
      lines.push(`${p.province},${p.schemes},${p.titles},${p.transfers}`)
    })
    lines.push('')
  }

  // Monthly trends
  if (statistics?.byMonth && statistics.byMonth.length > 0) {
    lines.push('Monthly Trends')
    lines.push('Month,Schemes,Titles,Transfers')
    statistics.byMonth.forEach((m: any) => {
      lines.push(`${m.month},${m.schemes},${m.titles},${m.transfers}`)
    })
  }

  return lines.join('\n')
}

/**
 * Generate Excel report (simplified - returns CSV format)
 */
function generateExcelReport(
  options: ReportGenerationOptions,
  statistics: any,
  spatialAnalysis?: any
): string {
  // For now, return CSV format (would need Excel library for proper Excel)
  return generateCSVReport(options, statistics, spatialAnalysis)
}

/**
 * Generate report
 */
export async function generateReport(
  options: ReportGenerationOptions
): Promise<{
  success: boolean
  reportData?: Uint8Array | string
  contentType?: string
  filename?: string
  error?: string
}> {
  return monitor('generate_report', async () => {
    try {
      // Get statistics
      const statisticsResult = await getRegistrationStatistics(options.filters)
      if (!statisticsResult.success) {
        return {
          success: false,
          error: statisticsResult.error || 'Failed to get statistics',
        }
      }

      // Get spatial analysis if needed
      let spatialAnalysis
      if (options.reportType === 'spatial') {
        const spatialResult = await getSpatialAnalysis(options.filters)
        if (spatialResult.success) {
          spatialAnalysis = spatialResult.analysis
        }
      }

      // Generate report based on format
      let reportData: Uint8Array | string
      let contentType: string
      let filename: string

      if (options.format === 'pdf') {
        reportData = await generatePDFReport(
          options,
          statisticsResult.statistics,
          spatialAnalysis
        )
        contentType = 'application/pdf'
        filename = `apr-report-${Date.now()}.pdf`
      } else if (options.format === 'csv') {
        reportData = generateCSVReport(
          options,
          statisticsResult.statistics,
          spatialAnalysis
        )
        contentType = 'text/csv'
        filename = `apr-report-${Date.now()}.csv`
      } else {
        // Excel (returns CSV for now)
        reportData = generateExcelReport(
          options,
          statisticsResult.statistics,
          spatialAnalysis
        )
        contentType = 'text/csv'
        filename = `apr-report-${Date.now()}.csv`
      }

      logger.info('Report generated successfully', {
        reportType: options.reportType,
        format: options.format,
      })

      return {
        success: true,
        reportData,
        contentType,
        filename,
      }
    } catch (error) {
      logger.error('Exception generating report', error as Error, { options })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

