/**
 * Scheme Plan Generator
 * Generates standardized sectional title scheme plans conforming to SG requirements
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { SchemePlanTemplate } from '@/lib/documents/templates/scheme-plan-template'
import { PDFGenerator } from '@/lib/documents/pdf-generator'
import { parseWKTGeometry, geometryToWKT } from '@/lib/spatial/geometry'
import { Geometry, Polygon, MultiPolygon } from '@/types/spatial'

/**
 * Scheme plan generation options
 */
export interface SchemePlanOptions {
  includeSectionDiagrams?: boolean
  includeAreaSchedule?: boolean
  includeNotes?: boolean
  scale?: number // e.g., 1000 for 1:1000
  pageSize?: 'a4' | 'a3'
  orientation?: 'portrait' | 'landscape'
}

/**
 * Section diagram data
 */
export interface SectionDiagramData {
  sectionNumber: string
  geometry: Geometry
  area: number
  quota: number
  dimensions?: {
    length: number
    width: number
  }
  floorLevel?: number
}

/**
 * Scheme plan generation result
 */
export interface SchemePlanResult {
  success: boolean
  pdfBuffer?: Uint8Array
  pageCount?: number
  error?: string
  metadata?: {
    schemeNumber: string
    generatedAt: string
    scale: number
  }
}

/**
 * Generate scheme plan PDF
 */
export async function generateSchemePlan(
  surveyPlanId: string,
  options: SchemePlanOptions = {},
  userId?: string
): Promise<SchemePlanResult> {
  return monitor('generate_scheme_plan', async () => {
    const supabase = await createClient()

    try {
      // Get survey plan data
      const { data: surveyPlan, error: planError } = await supabase
        .from('apr.survey_sectional_plans')
        .select(`
          id,
          parent_parcel_geometry,
          parent_parcel_area,
          apr.sectional_scheme_plans!inner(
            id,
            scheme_name,
            location,
            apr.sectional_schemes!inner(
              scheme_number,
              registration_date
            )
          )
        `)
        .eq('id', surveyPlanId)
        .single()

      if (planError || !surveyPlan) {
        return {
          success: false,
          error: 'Survey plan not found',
        }
      }

      // Get section geometries with quotas
      const { data: geometries, error: geomError } = await supabase
        .from('apr.section_geometries')
        .select('section_number, geometry, computed_area, participation_quota, floor_level')
        .eq('survey_plan_id', surveyPlanId)
        .neq('section_type', 'common')
        .order('section_number', { ascending: true })

      if (geomError || !geometries || geometries.length === 0) {
        return {
          success: false,
          error: 'No section geometries found',
        }
      }

      // Extract scheme data
      const schemeData = surveyPlan.sectional_scheme_plans as any
      const scheme = schemeData?.sectional_schemes?.[0] as any

      // Prepare section diagrams
      const sectionDiagrams: SectionDiagramData[] = geometries.map((g) => ({
        sectionNumber: g.section_number,
        geometry: parseWKTGeometry(g.geometry as string),
        area: g.computed_area || 0,
        quota: g.participation_quota || 0,
        floorLevel: g.floor_level || 0,
      }))

      // Calculate scale if not provided
      const scale = options.scale || calculateOptimalScale(
        surveyPlan.parent_parcel_geometry as string,
        options.pageSize || 'a4',
        options.orientation || 'landscape'
      )

      // Generate PDF
      const {
        includeSectionDiagrams = true,
        includeAreaSchedule = true,
        includeNotes = true,
        pageSize = 'a4',
        orientation = 'landscape',
      } = options

      const pdf = new PDFGenerator(orientation, 'mm', pageSize)
      pdf.setMargins(15)

      let pageCount = 0

      // Page 1: Title Sheet
      pageCount++
      renderTitleSheet(
        pdf,
        {
          schemeNumber: scheme?.scheme_number || 'N/A',
          schemeName: schemeData?.scheme_name || 'N/A',
          location: schemeData?.location || 'N/A',
          registrationDate: scheme?.registration_date || new Date().toISOString(),
          surveyNumber: surveyPlanId.substring(0, 8).toUpperCase(),
          totalArea: surveyPlan.parent_parcel_area || 0,
          sectionCount: geometries.length,
        },
        scale
      )

      // Page 2+: Area Schedule
      if (includeAreaSchedule) {
        if (pageCount > 0) {
          pdf.getDocument().addPage()
        }
        pageCount++
        renderAreaSchedule(
          pdf,
          sectionDiagrams,
          surveyPlan.parent_parcel_area || 0,
          geometries.reduce((sum, g) => sum + (g.computed_area || 0), 0)
        )
      }

      // Page 3+: Section Diagrams
      if (includeSectionDiagrams) {
        const sectionsPerPage = 2 // 2 sections per page
        for (let i = 0; i < sectionDiagrams.length; i += sectionsPerPage) {
          if (pageCount > 0) {
            pdf.getDocument().addPage()
          }
          pageCount++
          const pageSections = sectionDiagrams.slice(i, i + sectionsPerPage)
          renderSectionDiagrams(pdf, pageSections, scale)
        }
      }

      // Last Page: Notes and Disclaimers
      if (includeNotes) {
        pdf.getDocument().addPage()
        pageCount++
        renderNotesAndDisclaimers(pdf)
      }

      const pdfBuffer = pdf.generate()

      logger.info('Scheme plan generated', {
        surveyPlanId,
        pageCount,
        scale,
        sectionCount: geometries.length,
        userId,
      })

      return {
        success: true,
        pdfBuffer,
        pageCount,
        metadata: {
          schemeNumber: scheme?.scheme_number || 'N/A',
          generatedAt: new Date().toISOString(),
          scale,
        },
      }
    } catch (error) {
      logger.error('Exception generating scheme plan', error as Error, {
        surveyPlanId,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Render title sheet
 */
function renderTitleSheet(
  pdf: PDFGenerator,
  data: {
    schemeNumber: string
    schemeName: string
    location: string
    registrationDate: string
    surveyNumber: string
    totalArea: number
    sectionCount: number
  },
  scale: number
): void {
  const pageWidth = pdf.getAvailableWidth()
  const startY = 25

  // Title block with government branding
  pdf.addRectangle(15, startY, pageWidth, 50, {
    fill: true,
    fillColor: [34, 139, 34], // Government Green
    stroke: true,
    strokeColor: [0, 0, 0],
    lineWidth: 1,
  })

  // Main title
  pdf.addText('SECTIONAL TITLE SCHEME PLAN', 15 + pageWidth / 2, startY + 15, {
    fontSize: 18,
    fontStyle: 'bold',
    align: 'center',
    color: [255, 255, 255],
  })

  // Scheme information
  let currentY = startY + 30
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

  pdf.addText('Total Sections:', rightCol, currentY, {
    fontSize: 10,
    fontStyle: 'bold',
    color: [255, 255, 255],
  })
  pdf.addText(data.sectionCount.toString(), rightCol + 40, currentY, {
    fontSize: 10,
    color: [255, 255, 255],
  })

  // Scale and north arrow
  const scaleY = startY + 80
  renderScaleIndicator(pdf, scale, scaleY)
  renderNorthArrow(pdf, pageWidth - 50, scaleY)
}

/**
 * Render area schedule
 */
function renderAreaSchedule(
  pdf: PDFGenerator,
  sections: SectionDiagramData[],
  totalArea: number,
  unitArea: number
): void {
  const startY = 30

  pdf.addText('AREA SCHEDULE', 20, startY, {
    fontSize: 14,
    fontStyle: 'bold',
  })

  const tableData: string[][] = [
    ['Section', 'Area (m²)', 'Participation Quota (%)'],
    ...sections.map((section) => [
      section.sectionNumber,
      section.area.toLocaleString('en-ZW', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      section.quota.toFixed(4),
    ]),
    [
      'TOTAL UNITS',
      unitArea.toLocaleString('en-ZW', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      '100.0000',
    ],
    [
      'Common Property',
      (totalArea - unitArea).toLocaleString('en-ZW', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      '-',
    ],
    [
      'TOTAL SCHEME',
      totalArea.toLocaleString('en-ZW', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      '-',
    ],
  ]

  pdf.addTable(tableData, 20, startY + 15, {
    columnWidths: [60, 60, 80],
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
 * Render section diagrams
 */
function renderSectionDiagrams(
  pdf: PDFGenerator,
  sections: SectionDiagramData[],
  scale: number
): void {
  const pageWidth = pdf.getAvailableWidth()
  const pageHeight = pdf.getAvailableHeight()
  const startY = 30
  const diagramHeight = (pageHeight - startY - 40) / sections.length

  sections.forEach((section, index) => {
    const diagramY = startY + index * diagramHeight

    // Section header
    pdf.addText(`SECTION ${section.sectionNumber}`, 20, diagramY, {
      fontSize: 12,
      fontStyle: 'bold',
    })

    // Section diagram placeholder (would render actual geometry here)
    const diagramWidth = pageWidth - 40
    const diagramBoxHeight = diagramHeight - 30

    pdf.addRectangle(20, diagramY + 10, diagramWidth, diagramBoxHeight, {
      fill: false,
      stroke: true,
      strokeColor: [0, 0, 0],
      lineWidth: 1,
    })

    // Section information
    pdf.addText(
      `Area: ${section.area.toFixed(2)} m² | Quota: ${section.quota.toFixed(4)}%`,
      20,
      diagramY + diagramBoxHeight + 15,
      {
        fontSize: 9,
      }
    )

    if (section.floorLevel !== undefined && section.floorLevel !== 0) {
      pdf.addText(
        `Floor Level: ${section.floorLevel}`,
        20,
        diagramY + diagramBoxHeight + 22,
        {
          fontSize: 9,
        }
      )
    }

      // Scale indicator for this diagram
      renderScaleIndicator(pdf, scale, diagramY + diagramBoxHeight + 5, 20)
      
      // North arrow for this diagram
      renderNorthArrow(pdf, 20 + diagramWidth - 30, diagramY + 15)
  })
}

/**
 * Render notes and disclaimers
 */
function renderNotesAndDisclaimers(pdf: PDFGenerator): void {
  const startY = 30

  pdf.addText('NOTES AND DISCLAIMERS', 20, startY, {
    fontSize: 14,
    fontStyle: 'bold',
  })

  const notes = [
    '1. This plan is prepared in accordance with the Sectional Titles Act and Surveyor-General regulations.',
    '2. All measurements are in meters and areas in square meters.',
    '3. Participation quotas are calculated using the South African formula.',
    '4. This plan is subject to approval by the Surveyor-General.',
    '5. The accuracy of this plan is verified by certified land surveyor.',
    '6. Common property areas are shown for reference only.',
    '7. This plan is not valid until sealed by the Surveyor-General.',
    '8. Any amendments to this plan must be approved by the Surveyor-General.',
  ]

  let currentY = startY + 20
  notes.forEach((note) => {
    pdf.addText(note, 20, currentY, {
      fontSize: 9,
      maxWidth: pdf.getAvailableWidth() - 20,
    })
    currentY += 10
  })

  // Disclaimer box
  const disclaimerY = currentY + 20
  pdf.addRectangle(20, disclaimerY, pdf.getAvailableWidth() - 20, 40, {
    fill: true,
    fillColor: [255, 255, 200],
    stroke: true,
    strokeColor: [0, 0, 0],
    lineWidth: 1,
  })

  pdf.addText(
    'DISCLAIMER: This plan is for information purposes only and does not constitute legal title. ' +
      'Legal title is established only upon registration of the sectional title.',
    25,
    disclaimerY + 10,
    {
      fontSize: 8,
      fontStyle: 'italic',
      maxWidth: pdf.getAvailableWidth() - 30,
    }
  )
}

/**
 * Render scale indicator
 */
function renderScaleIndicator(
  pdf: PDFGenerator,
  scale: number,
  y: number,
  x?: number
): void {
  const pageWidth = pdf.getAvailableWidth()
  const scaleX = x || pageWidth - 60
  const scaleLength = 30 // mm on page

  // Scale bar
  pdf.getDocument().setLineWidth(1)
  pdf.getDocument().setDrawColor(0, 0, 0)
  pdf.getDocument().line(scaleX, y, scaleX + scaleLength, y)
  pdf.getDocument().line(scaleX, y - 2, scaleX, y + 2)
  pdf.getDocument().line(scaleX + scaleLength, y - 2, scaleX + scaleLength, y + 2)

  // Scale labels
  const realWorldLength = (scaleLength / 1000) * scale // Convert mm to meters, then scale
  pdf.addText('0', scaleX, y + 5, { fontSize: 8, align: 'center' })
  pdf.addText(`${realWorldLength.toFixed(0)}m`, scaleX + scaleLength, y + 5, {
    fontSize: 8,
    align: 'center',
  })
  pdf.addText(`SCALE 1:${scale}`, scaleX + scaleLength / 2, y - 8, {
    fontSize: 8,
    align: 'center',
  })
}

/**
 * Render north arrow
 */
function renderNorthArrow(pdf: PDFGenerator, x: number, y: number): void {
  // Simple north arrow (triangle pointing up)
  const arrowSize = 10

  // Draw arrow triangle using lines
  pdf.addLine(x, y - arrowSize, x - arrowSize / 2, y + arrowSize / 2)
  pdf.addLine(x - arrowSize / 2, y + arrowSize / 2, x + arrowSize / 2, y + arrowSize / 2)
  pdf.addLine(x + arrowSize / 2, y + arrowSize / 2, x, y - arrowSize)
  
  // Fill triangle (simplified - using rectangle approximation)
  pdf.getDocument().setFillColor(0, 0, 0)
  pdf.getDocument().circle(x, y - arrowSize / 2, arrowSize / 4, 'F')

  pdf.addText('N', x, y - arrowSize - 5, {
    fontSize: 10,
    fontStyle: 'bold',
    align: 'center',
  })
}

/**
 * Calculate optimal scale based on geometry extent
 */
function calculateOptimalScale(
  geometryWKT: string,
  pageSize: 'a4' | 'a3',
  orientation: 'portrait' | 'landscape'
): number {
  // Parse geometry to get bounding box
  try {
    const geometry = parseWKTGeometry(geometryWKT)
    const bbox = getBoundingBox(geometry)

    const width = bbox.maxX - bbox.minX
    const height = bbox.maxY - bbox.minY
    const maxDimension = Math.max(width, height)

    // Page dimensions in meters (approximate)
    const pageWidth =
      orientation === 'landscape'
        ? pageSize === 'a4'
          ? 0.297
          : 0.42
        : pageSize === 'a4'
          ? 0.21
          : 0.297
    const pageHeight =
      orientation === 'landscape'
        ? pageSize === 'a4'
          ? 0.21
          : 0.297
        : pageSize === 'a4'
          ? 0.297
          : 0.42

    // Account for margins (15mm each side = 30mm total)
    const usableWidth = pageWidth - 0.03
    const usableHeight = pageHeight - 0.03

    // Calculate scale to fit geometry
    const scaleX = maxDimension / usableWidth
    const scaleY = maxDimension / usableHeight
    const scale = Math.max(scaleX, scaleY)

    // Round to nearest standard scale
    return roundToStandardScale(scale)
  } catch (error) {
    logger.warn('Failed to calculate scale, using default', error as Error)
    return 1000 // Default 1:1000
  }
}

/**
 * Get bounding box of geometry
 */
function getBoundingBox(geometry: Geometry): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let coords: number[][] = []

  if (geometry.type === 'Polygon' && geometry.coordinates) {
    coords = geometry.coordinates[0]
  } else if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
    coords = geometry.coordinates.flat(2)
  }

  if (coords.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  const xs = coords.map((c) => c[0])
  const ys = coords.map((c) => c[1])

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

/**
 * Round to nearest standard scale
 */
function roundToStandardScale(scale: number): number {
  const standardScales = [
    100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000,
  ]

  for (const standard of standardScales) {
    if (scale <= standard) {
      return standard
    }
  }

  return 50000 // Maximum scale
}

