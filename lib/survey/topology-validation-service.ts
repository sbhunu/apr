/**
 * Topology Validation Service for Schemes
 * Comprehensive spatial error detection system for sectional schemes
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import {
  validateTopology,
  TopologyValidationReport,
  TopologyError,
} from '@/lib/spatial/validation'
import { parseWKTGeometry, geometryToWKT } from '@/lib/spatial/geometry'
import { Geometry } from '@/types/spatial'

/**
 * Scheme validation options
 */
export interface SchemeValidationOptions {
  checkOverlaps?: boolean
  checkContainment?: boolean
  checkGaps?: boolean
  checkGeometry?: boolean
  tolerance?: number
  minGapArea?: number
  allowTouching?: boolean
  allowSharedWalls?: boolean // Allow units to share boundaries
  checkEasements?: boolean // Check for easements/servitudes
}

/**
 * Error location for visualization
 */
export interface ErrorLocation {
  type: 'point' | 'polygon' | 'line'
  coordinates: Array<{ x: number; y: number }>
  description: string
}

/**
 * Correction suggestion
 */
export interface CorrectionSuggestion {
  errorType: string
  affectedUnits: string[]
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  action?: string
}

/**
 * Enhanced validation report with visualization data
 */
export interface SchemeValidationReport extends TopologyValidationReport {
  surveyPlanId: string
  errorLocations: ErrorLocation[]
  correctionSuggestions: CorrectionSuggestion[]
  validationMetadata: {
    validatedAt: string
    validatedBy?: string
    validationDuration: number
  }
}

/**
 * Validate scheme topology
 */
export async function validateSchemeTopology(
  surveyPlanId: string,
  options: SchemeValidationOptions = {},
  userId?: string
): Promise<{
  success: boolean
  report?: SchemeValidationReport
  error?: string
}> {
  return monitor('validate_scheme_topology', async () => {
    const startTime = Date.now()
    const supabase = await createClient()

    try {
      // Get survey plan with parent parcel geometry
      const { data: surveyPlan, error: planError } = await supabase
        .from('survey_sectional_plans')
        .select('parent_parcel_geometry, id')
        .eq('id', surveyPlanId)
        .single()

      if (planError || !surveyPlan) {
        return {
          success: false,
          error: 'Survey plan not found',
        }
      }

      if (!surveyPlan.parent_parcel_geometry) {
        return {
          success: false,
          error: 'Parent parcel geometry not found',
        }
      }

      // Get all section geometries
      const { data: geometries, error: geomError } = await supabase
        .from('section_geometries')
        .select('id, section_number, geometry, floor_level')
        .eq('survey_plan_id', surveyPlanId)

      if (geomError) {
        return {
          success: false,
          error: `Failed to fetch geometries: ${geomError.message}`,
        }
      }

      if (!geometries || geometries.length === 0) {
        return {
          success: false,
          error: 'No section geometries found',
        }
      }

      // Parse geometries
      const parentGeom = parseWKTGeometry(surveyPlan.parent_parcel_geometry as string)
      const sectionGeoms = geometries.map((g) => ({
        id: g.id,
        sectionNumber: g.section_number,
        geometry: parseWKTGeometry(g.geometry as string),
        floorLevel: g.floor_level || 0,
      }))

      // Group by floor level for overlap checking
      const geometriesByFloor = new Map<number, typeof sectionGeoms>()
      sectionGeoms.forEach((sg) => {
        if (!geometriesByFloor.has(sg.floorLevel)) {
          geometriesByFloor.set(sg.floorLevel, [])
        }
        geometriesByFloor.get(sg.floorLevel)!.push(sg)
      })

      // Run validation
      const {
        checkOverlaps = true,
        checkContainment = true,
        checkGaps = true,
        checkGeometry = true,
        tolerance = 0.01,
        minGapArea = 1.0,
        allowTouching = true,
        allowSharedWalls = true,
      } = options

      // Validate all sections together
      const allSectionGeoms = sectionGeoms.map((sg) => sg.geometry)
      const validationReport = await validateTopology(
        allSectionGeoms,
        parentGeom,
        supabase,
        {
          checkOverlaps,
          checkContainment,
          checkGaps,
          checkGeometry,
          tolerance,
          minGapArea,
          allowTouching,
        }
      )

      // Generate error locations for visualization
      const errorLocations = generateErrorLocations(
        validationReport.errors,
        validationReport.warnings,
        sectionGeoms
      )

      // Generate correction suggestions
      const correctionSuggestions = generateCorrectionSuggestions(
        validationReport,
        sectionGeoms,
        allowSharedWalls
      )

      // Calculate validation duration
      const validationDuration = Date.now() - startTime

      const enhancedReport: SchemeValidationReport = {
        ...validationReport,
        surveyPlanId,
        errorLocations,
        correctionSuggestions,
        validationMetadata: {
          validatedAt: new Date().toISOString(),
          validatedBy: userId,
          validationDuration,
        },
      }

      // Store validation results in database
      await storeValidationResults(surveyPlanId, enhancedReport, userId)

      logger.info('Scheme topology validation completed', {
        surveyPlanId,
        errors: validationReport.errors.length,
        warnings: validationReport.warnings.length,
        duration: validationDuration,
        userId,
      })

      return {
        success: true,
        report: enhancedReport,
      }
    } catch (error) {
      logger.error('Exception validating scheme topology', error as Error, {
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
 * Generate error locations for map visualization
 */
function generateErrorLocations(
  errors: TopologyError[],
  warnings: TopologyError[],
  sectionGeoms: Array<{
    id: string
    sectionNumber: string
    geometry: Geometry
    floorLevel: number
  }>
): ErrorLocation[] {
  const locations: ErrorLocation[] = []

  // Process errors
  errors.forEach((error) => {
    if (error.coordinates && error.coordinates.length > 0) {
      locations.push({
        type: error.coordinates.length === 1 ? 'point' : 'polygon',
        coordinates: error.coordinates,
        description: error.description,
      })
    } else if (error.geometry1) {
      // Extract coordinates from geometry
      const coords = extractCoordinates(error.geometry1)
      if (coords.length > 0) {
        locations.push({
          type: coords.length === 1 ? 'point' : 'polygon',
          coordinates: coords,
          description: error.description,
        })
      }
    }
  })

  // Process warnings
  warnings.forEach((warning) => {
    if (warning.coordinates && warning.coordinates.length > 0) {
      locations.push({
        type: warning.coordinates.length === 1 ? 'point' : 'polygon',
        coordinates: warning.coordinates,
        description: warning.description,
      })
    }
  })

  return locations
}

/**
 * Extract coordinates from geometry
 */
function extractCoordinates(geometry: Geometry): Array<{ x: number; y: number }> {
  const coords: Array<{ x: number; y: number }> = []

  if (geometry.type === 'Point') {
    coords.push({ x: geometry.coordinates[0], y: geometry.coordinates[1] })
  } else if (geometry.type === 'Polygon' && geometry.coordinates) {
    geometry.coordinates[0].forEach((c: number[]) => {
      coords.push({ x: c[0], y: c[1] })
    })
  } else if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
    geometry.coordinates.forEach((polygon: number[][][]) => {
      polygon[0].forEach((c: number[]) => {
        coords.push({ x: c[0], y: c[1] })
      })
    })
  }

  return coords
}

/**
 * Generate correction suggestions
 */
function generateCorrectionSuggestions(
  report: TopologyValidationReport,
  sectionGeoms: Array<{
    id: string
    sectionNumber: string
    geometry: Geometry
    floorLevel: number
  }>,
  allowSharedWalls: boolean
): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = []

  // Group errors by type
  const overlapErrors = report.errors.filter((e) => e.type === 'overlap')
  const containmentErrors = report.errors.filter((e) => e.type === 'containment')
  const gapErrors = report.warnings.filter((e) => e.type === 'gap')
  const invalidGeomErrors = report.errors.filter((e) => e.type === 'invalid_geometry')

  // Overlap suggestions
  if (overlapErrors.length > 0) {
    overlapErrors.forEach((error) => {
      const affectedUnits = findAffectedUnits(error, sectionGeoms)
      suggestions.push({
        errorType: 'overlap',
        affectedUnits,
        suggestion: `Units ${affectedUnits.join(' and ')} overlap by ${error.area?.toFixed(2) || 'unknown'} m². Adjust boundaries to eliminate overlap.`,
        priority: 'high',
        action: 'Adjust unit boundaries to remove overlap',
      })
    })
  }

  // Containment suggestions
  if (containmentErrors.length > 0) {
    containmentErrors.forEach((error) => {
      const affectedUnits = findAffectedUnits(error, sectionGeoms)
      suggestions.push({
        errorType: 'containment',
        affectedUnits,
        suggestion: `Unit ${affectedUnits[0]} extends beyond parent parcel boundary. Move unit boundary inside parent parcel.`,
        priority: 'high',
        action: 'Move unit boundary inside parent parcel',
      })
    })
  }

  // Gap suggestions
  if (gapErrors.length > 0) {
    const totalGapArea = gapErrors.reduce((sum, e) => sum + (e.area || 0), 0)
    suggestions.push({
      errorType: 'gap',
      affectedUnits: [],
      suggestion: `Gaps detected totaling ${totalGapArea.toFixed(2)} m². Add sections to cover gaps or adjust existing boundaries.`,
      priority: 'medium',
      action: 'Add sections or adjust boundaries to cover gaps',
    })
  }

  // Invalid geometry suggestions
  if (invalidGeomErrors.length > 0) {
    invalidGeomErrors.forEach((error) => {
      const affectedUnits = findAffectedUnits(error, sectionGeoms)
      suggestions.push({
        errorType: 'invalid_geometry',
        affectedUnits,
        suggestion: `Unit ${affectedUnits[0]} has invalid geometry. Check for self-intersections or invalid coordinate sequences.`,
        priority: 'high',
        action: 'Fix geometry by removing self-intersections',
      })
    })
  }

  // Shared walls handling
  if (allowSharedWalls) {
    const touchingErrors = report.warnings.filter((e) => e.type === 'touching_boundary')
    if (touchingErrors.length > 0) {
      suggestions.push({
        errorType: 'touching_boundary',
        affectedUnits: [],
        suggestion: 'Some units share boundaries. This is acceptable for shared walls. Verify boundaries are correctly aligned.',
        priority: 'low',
        action: 'Verify shared wall boundaries are correct',
      })
    }
  }

  return suggestions
}

/**
 * Find affected units from error
 */
function findAffectedUnits(
  error: TopologyError,
  sectionGeoms: Array<{
    id: string
    sectionNumber: string
    geometry: Geometry
    floorLevel: number
  }>
): string[] {
  const affected: string[] = []

  if (error.geometry1) {
    const matching = sectionGeoms.find(
      (sg) => JSON.stringify(sg.geometry) === JSON.stringify(error.geometry1)
    )
    if (matching) {
      affected.push(matching.sectionNumber)
    }
  }

  if (error.geometry2) {
    const matching = sectionGeoms.find(
      (sg) => JSON.stringify(sg.geometry) === JSON.stringify(error.geometry2)
    )
    if (matching) {
      affected.push(matching.sectionNumber)
    }
  }

  return affected
}

/**
 * Store validation results in database
 */
async function storeValidationResults(
  surveyPlanId: string,
  report: SchemeValidationReport,
  userId?: string
): Promise<void> {
  const supabase = await createClient()

  try {
    // Update survey plan with validation status
    await supabase
      .from('apr.survey_sectional_plans')
      .update({
        metadata: {
          topologyValidation: {
            isValid: report.isValid,
            validatedAt: report.validationMetadata.validatedAt,
            validatedBy: userId,
            errorCount: report.summary.totalErrors,
            warningCount: report.summary.totalWarnings,
            errors: report.errors.map((e) => ({
              type: e.type,
              description: e.description,
              severity: e.severity,
              area: e.area,
            })),
            warnings: report.warnings.map((w) => ({
              type: w.type,
              description: w.description,
              severity: w.severity,
            })),
          },
        },
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', surveyPlanId)

    // Update section geometries with validation flags
    if (report.errors.length > 0 || report.warnings.length > 0) {
      // Mark sections with errors
      const errorSections = new Set<string>()
      report.errors.forEach((error) => {
        if (error.geometry1) {
          // Find section by geometry match (simplified - would need better matching)
          errorSections.add('unknown')
        }
      })

      // Update validation flags (simplified - would need proper geometry matching)
      // This would require more sophisticated matching logic
    }
  } catch (error) {
    logger.warn('Failed to store validation results', error as Error, {
      surveyPlanId,
    })
    // Don't fail the operation if storage fails
  }
}

/**
 * Get validation report for a survey plan
 */
export async function getValidationReport(
  surveyPlanId: string
): Promise<{
  success: boolean
  report?: SchemeValidationReport
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: surveyPlan, error } = await supabase
      .from('survey_sectional_plans')
      .select('metadata')
      .eq('id', surveyPlanId)
      .single()

    if (error || !surveyPlan) {
      return {
        success: false,
        error: 'Survey plan not found',
      }
    }

    const metadata = surveyPlan.metadata as {
      topologyValidation?: SchemeValidationReport
    }

    if (!metadata?.topologyValidation) {
      return {
        success: false,
        error: 'Validation report not found. Run validation first.',
      }
    }

    return {
      success: true,
      report: metadata.topologyValidation as SchemeValidationReport,
    }
  } catch (error) {
    logger.error('Failed to get validation report', error as Error, {
      surveyPlanId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

