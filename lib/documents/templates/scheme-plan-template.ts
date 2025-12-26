/**
 * Scheme Plan Template
 * Generates sectional title scheme plans with title blocks, legends, and scale indicators
 */

import { BaseTemplate } from '../base-template'
import { PDFGenerator } from '../pdf-generator'
import {
  DocumentGenerationOptions,
  DocumentGenerationResult,
  Placeholder,
  SchemePlanData,
  TemplateMetadata,
} from '../types'
import { logger } from '@/lib/logger'

/**
 * Scheme plan template class
 */
export class SchemePlanTemplate extends BaseTemplate {
  constructor() {
    const metadata: TemplateMetadata = {
      id: 'scheme-plan',
      name: 'Sectional Title Scheme Plan',
      type: 'scheme_plan',
      version: '1.0.0',
      description: 'Multi-page scheme plan with title blocks, section diagrams, and area schedules',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const placeholders: Placeholder[] = [
      { key: 'schemeNumber', description: 'Scheme number', required: true, type: 'text' },
      { key: 'schemeName', description: 'Scheme name', required: true, type: 'text' },
      { key: 'location', description: 'Location', required: true, type: 'text' },
      { key: 'registrationDate', description: 'Registration date', required: true, type: 'date' },
      { key: 'surveyNumber', description: 'Survey number', required: true, type: 'text' },
      { key: 'sections', description: 'Sections array', required: true, type: 'text' },
      { key: 'totalArea', description: 'Total area', required: true, type: 'number' },
      { key: 'commonArea', description: 'Common area', required: true, type: 'number' },
    ]

    super(metadata, placeholders)
  }

  /**
   * Render scheme plan PDF
   */
  async render(data: Record<string, unknown>): Promise<Uint8Array> {
    // Validate data
    const validation = this.validateData(data)
    if (!validation.valid) {
      throw new Error(`Invalid scheme plan data: ${validation.errors.join(', ')}`)
    }

    const planData = data as unknown as SchemePlanData
    const pdf = new PDFGenerator('landscape', 'mm', 'a4') // Landscape for plans
    pdf.setMargins(15)

    const pageWidth = pdf.getAvailableWidth()
    const startY = 25

    // Title block
    this.renderTitleBlock(pdf, planData, startY)

    // Area schedule
    const scheduleY = startY + 60
    this.renderAreaSchedule(pdf, planData, scheduleY)

    // Legend and notes
    const legendY = scheduleY + 80
    this.renderLegend(pdf, planData, legendY)

    // Scale indicator
    this.renderScaleIndicator(pdf, planData)

    return pdf.generate()
  }

  /**
   * Render title block
   */
  private renderTitleBlock(
    pdf: PDFGenerator,
    data: SchemePlanData,
    startY: number
  ): void {
    const pageWidth = pdf.getAvailableWidth()

    // Title block background
    pdf.addRectangle(15, startY, pageWidth, 50, {
      fill: true,
      fillColor: [34, 139, 34], // Government Green
      stroke: true,
      strokeColor: [0, 0, 0],
      lineWidth: 1,
    })

    // Title text
    pdf.addText('SECTIONAL TITLE SCHEME PLAN', 15 + pageWidth / 2, startY + 15, {
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    // Scheme information
    let currentY = startY + 25
    const leftCol = 20
    const rightCol = 15 + pageWidth / 2 + 10

    pdf.addText('Scheme Number:', leftCol, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [255, 255, 255],
    })
    pdf.addText(data.schemeNumber, leftCol + 50, currentY, {
      fontSize: 10,
      color: [255, 255, 255],
    })

    pdf.addText('Scheme Name:', rightCol, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [255, 255, 255],
    })
    pdf.addText(data.schemeName, rightCol + 40, currentY, {
      fontSize: 10,
      color: [255, 255, 255],
    })

    currentY += 8

    pdf.addText('Location:', leftCol, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [255, 255, 255],
    })
    pdf.addText(data.location, leftCol + 50, currentY, {
      fontSize: 10,
      color: [255, 255, 255],
    })

    pdf.addText('Survey Number:', rightCol, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [255, 255, 255],
    })
    pdf.addText(data.surveyNumber, rightCol + 40, currentY, {
      fontSize: 10,
      color: [255, 255, 255],
    })

    currentY += 8

    pdf.addText('Registration Date:', leftCol, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [255, 255, 255],
    })
    pdf.addText(
      new Date(data.registrationDate).toLocaleDateString('en-ZW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      leftCol + 50,
      currentY,
      { fontSize: 10, color: [255, 255, 255] }
    )
  }

  /**
   * Render area schedule
   */
  private renderAreaSchedule(
    pdf: PDFGenerator,
    data: SchemePlanData,
    startY: number
  ): void {
    pdf.addText('AREA SCHEDULE', 20, startY, {
      fontSize: 12,
      fontStyle: 'bold',
    })

    const tableData: string[][] = [
      ['Section', 'Area (m²)', 'Participation Quota (%)'],
      ...data.sections.map((section) => [
        section.sectionNumber,
        section.area.toLocaleString('en-ZW', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        section.quota.toFixed(4),
      ]),
      [
        'TOTAL',
        data.totalArea.toLocaleString('en-ZW', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        '100.0000',
      ],
      [
        'Common Area',
        data.commonArea.toLocaleString('en-ZW', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        '-',
      ],
    ]

    pdf.addTable(tableData, 20, startY + 10, {
      columnWidths: [60, 60, 60],
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
  }

  /**
   * Render legend
   */
  private renderLegend(
    pdf: PDFGenerator,
    data: SchemePlanData,
    startY: number
  ): void {
    const pageWidth = pdf.getAvailableWidth()
    const legendWidth = pageWidth / 2 - 10

    pdf.addRectangle(15, startY, legendWidth, 40, {
      fill: false,
      stroke: true,
      strokeColor: [0, 0, 0],
      lineWidth: 0.5,
    })

    pdf.addText('LEGEND', 15 + legendWidth / 2, startY + 8, {
      fontSize: 10,
      fontStyle: 'bold',
      align: 'center',
    })

    let currentY = startY + 15
    const items = [
      { symbol: '■', description: 'Section Boundary' },
      { symbol: '▬', description: 'Common Property' },
      { symbol: '○', description: 'Control Point' },
    ]

    items.forEach((item) => {
      pdf.addText(item.symbol, 20, currentY, { fontSize: 10 })
      pdf.addText(item.description, 30, currentY, { fontSize: 9 })
      currentY += 8
    })
  }

  /**
   * Render scale indicator
   */
  private renderScaleIndicator(
    pdf: PDFGenerator,
    data: SchemePlanData
  ): void {
    const pageWidth = pdf.getAvailableWidth()
    const pageHeight = pdf.getDocument().internal.pageSize.getHeight()
    const scaleX = pageWidth - 60
    const scaleY = pageHeight - 30

    // Scale bar (representative)
    pdf.addLine(scaleX, scaleY, scaleX + 30, scaleY)
    pdf.addLine(scaleX, scaleY - 2, scaleX, scaleY + 2)
    pdf.addLine(scaleX + 30, scaleY - 2, scaleX + 30, scaleY + 2)

    pdf.addText('0', scaleX, scaleY + 5, { fontSize: 8, align: 'center' })
    pdf.addText('30m', scaleX + 30, scaleY + 5, { fontSize: 8, align: 'center' })
    pdf.addText('SCALE 1:1000', scaleX + 15, scaleY - 8, {
      fontSize: 8,
      align: 'center',
    })
  }

  /**
   * Get template content (not used for PDF, but required by base class)
   */
  protected getTemplateContent(): string {
    return 'Scheme plan template - rendered as PDF'
  }

  /**
   * Generate scheme plan
   */
  async generateSchemePlan(
    options: DocumentGenerationOptions
  ): Promise<DocumentGenerationResult> {
    try {
      // Render PDF
      const pdfBuffer = await this.render(options.data)

      logger.info('Scheme plan generated', {
        templateId: this.metadata.id,
        schemeNumber: (options.data as SchemePlanData).schemeNumber,
      })

      return {
        success: true,
        metadata: {
          templateVersion: this.version,
          generatedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      logger.error('Failed to generate scheme plan', error as Error, {
        templateId: this.metadata.id,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

