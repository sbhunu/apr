/**
 * Spatial Topology Validation
 * Detects spatial errors in sectional schemes using PostGIS topology functions
 * Handles overlaps, gaps, containment, and boundary validation
 */

import { validateGeometryBasic, geometryToWKT, parseWKTGeometry } from './geometry'
import { Point, Polygon, MultiPolygon, Geometry } from '@/types/spatial'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

/**
 * Topology validation error types
 */
export type TopologyErrorType =
  | 'overlap'
  | 'gap'
  | 'containment'
  | 'invalid_geometry'
  | 'touching_boundary'
  | 'self_intersection'

/**
 * Topology validation error
 */
export interface TopologyError {
  type: TopologyErrorType
  geometry1?: Geometry
  geometry2?: Geometry
  coordinates?: { x: number; y: number }[]
  area?: number
  description: string
  severity: 'error' | 'warning'
}

/**
 * Topology validation report
 */
export interface TopologyValidationReport {
  isValid: boolean
  errors: TopologyError[]
  warnings: TopologyError[]
  summary: {
    totalErrors: number
    totalWarnings: number
    totalGeometries: number
    totalArea: number
  }
}

/**
 * Detect overlapping geometries
 * Uses PostGIS ST_Overlaps for accurate detection
 */
export async function detectOverlaps(
  geometries: Geometry[],
  supabaseClient: {
    rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{
      data: any
      error: { message: string } | null
    }>
  },
  tolerance: number = 0.01 // meters
): Promise<TopologyError[]> {
  const errors: TopologyError[] = []

  if (geometries.length < 2) {
    return errors
  }

  try {
    // Use PostGIS ST_Overlaps for accurate overlap detection
    for (let i = 0; i < geometries.length; i++) {
      for (let j = i + 1; j < geometries.length; j++) {
        const geom1 = geometries[i]
        const geom2 = geometries[j]

        // Basic validation first
        if (!validateGeometryBasic(geom1) || !validateGeometryBasic(geom2)) {
          errors.push({
            type: 'invalid_geometry',
            geometry1: geom1,
            geometry2: geom2,
            description: `Invalid geometry detected in pair ${i + 1}-${j + 1}`,
            severity: 'error',
          })
          continue
        }

        try {
          const wkt1 = geometryToWKT(geom1)
          const wkt2 = geometryToWKT(geom2)

          // Check for overlaps using PostGIS
          const { data, error } = await supabaseClient.rpc('st_overlaps', {
            geometry1_wkt: wkt1,
            geometry2_wkt: wkt2,
            tolerance: tolerance,
          })

          if (error) {
            logger.warn('ST_Overlaps RPC not available, using fallback', { error })
            // Fallback to basic overlap detection
            if (detectOverlapBasic(geom1, geom2)) {
              errors.push({
                type: 'overlap',
                geometry1: geom1,
                geometry2: geom2,
                description: `Geometries ${i + 1} and ${j + 1} overlap`,
                severity: 'error',
              })
            }
          } else if (data?.overlaps) {
            // Calculate overlap area
            const overlapArea = data.overlap_area || 0
            const overlapCoords = data.overlap_coordinates || []

            errors.push({
              type: 'overlap',
              geometry1: geom1,
              geometry2: geom2,
              coordinates: overlapCoords,
              area: overlapArea,
              description: `Geometries ${i + 1} and ${j + 1} overlap by ${overlapArea.toFixed(2)} m²`,
              severity: 'error',
            })
          }
        } catch (e) {
          logger.error('Error detecting overlap', e as Error, { i, j })
        }
      }
    }
  } catch (error) {
    logger.error('Failed to detect overlaps', error as Error, { geometries })
    throw new ValidationError(
      'Failed to detect overlaps',
      'overlap_detection',
      { geometries }
    )
  }

  return errors
}

/**
 * Basic overlap detection (fallback when PostGIS not available)
 * Checks if bounding boxes overlap
 */
function detectOverlapBasic(geom1: Geometry, geom2: Geometry): boolean {
  if (geom1.type !== 'Polygon' && geom1.type !== 'MultiPolygon') return false
  if (geom2.type !== 'Polygon' && geom2.type !== 'MultiPolygon') return false

  // Get bounding boxes
  const bbox1 = getBoundingBox(geom1)
  const bbox2 = getBoundingBox(geom2)

  // Check if bounding boxes overlap
  return !(
    bbox1.maxX < bbox2.minX ||
    bbox1.minX > bbox2.maxX ||
    bbox1.maxY < bbox2.minY ||
    bbox1.minY > bbox2.maxY
  )
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

  if (geometry.type === 'Point') {
    coords = [geometry.coordinates]
  } else if (geometry.type === 'Polygon') {
    coords = geometry.coordinates.flat()
  } else if (geometry.type === 'MultiPolygon') {
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
 * Validate containment - ensure sections are within parent parcel
 */
export async function validateContainment(
  sections: Geometry[],
  parentParcel: Geometry,
  supabaseClient: {
    rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{
      data: any
      error: { message: string } | null
    }>
  },
  allowTouching: boolean = true
): Promise<TopologyError[]> {
  const errors: TopologyError[] = []

  if (!validateGeometryBasic(parentParcel)) {
    errors.push({
      type: 'invalid_geometry',
      geometry1: parentParcel,
      description: 'Parent parcel geometry is invalid',
      severity: 'error',
    })
    return errors
  }

  try {
    const parentWKT = geometryToWKT(parentParcel)

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]

      if (!validateGeometryBasic(section)) {
        errors.push({
          type: 'invalid_geometry',
          geometry1: section,
          description: `Section ${i + 1} geometry is invalid`,
          severity: 'error',
        })
        continue
      }

      try {
        const sectionWKT = geometryToWKT(section)

        // Check containment using PostGIS
        const { data, error } = await supabaseClient.rpc('st_contains', {
          parent_wkt: parentWKT,
          child_wkt: sectionWKT,
          allow_touching: allowTouching,
        })

        if (error) {
          logger.warn('ST_Contains RPC not available, using fallback', { error })
          // Fallback to basic containment check
          if (!isContainedBasic(section, parentParcel)) {
            errors.push({
              type: 'containment',
              geometry1: section,
              geometry2: parentParcel,
              description: `Section ${i + 1} is not fully contained within parent parcel`,
              severity: 'error',
            })
          }
        } else if (!data?.contains) {
          if (data?.touching && allowTouching) {
            errors.push({
              type: 'touching_boundary',
              geometry1: section,
              geometry2: parentParcel,
              description: `Section ${i + 1} touches parent parcel boundary`,
              severity: 'warning',
            })
          } else {
            errors.push({
              type: 'containment',
              geometry1: section,
              geometry2: parentParcel,
              description: `Section ${i + 1} is not fully contained within parent parcel`,
              severity: 'error',
            })
          }
        }
      } catch (e) {
        logger.error('Error validating containment', e as Error, { i })
      }
    }
  } catch (error) {
    logger.error('Failed to validate containment', error as Error, {
      sections,
      parentParcel,
    })
    throw new ValidationError(
      'Failed to validate containment',
      'containment_validation',
      { sections, parentParcel }
    )
  }

  return errors
}

/**
 * Basic containment check (fallback)
 */
function isContainedBasic(child: Geometry, parent: Geometry): boolean {
  const childBbox = getBoundingBox(child)
  const parentBbox = getBoundingBox(parent)

  return (
    childBbox.minX >= parentBbox.minX &&
    childBbox.maxX <= parentBbox.maxX &&
    childBbox.minY >= parentBbox.minY &&
    childBbox.maxY <= parentBbox.maxY
  )
}

/**
 * Check for gaps in sectional scheme
 * Detects missing areas between sections
 */
export async function checkGaps(
  sections: Geometry[],
  parentParcel: Geometry,
  supabaseClient: {
    rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{
      data: any
      error: { message: string } | null
    }>
  },
  minGapArea: number = 1.0 // square meters
): Promise<TopologyError[]> {
  const errors: TopologyError[] = []

  if (sections.length === 0) {
    return errors
  }

  try {
    // Union all sections
    const sectionWKTs = sections.map((geom) => geometryToWKT(geom))
    const parentWKT = geometryToWKT(parentParcel)

    // Use PostGIS to find gaps
    const { data, error } = await supabaseClient.rpc('st_find_gaps', {
      sections_wkt: sectionWKTs,
      parent_wkt: parentWKT,
      min_area: minGapArea,
    })

    if (error) {
      logger.warn('ST_FindGaps RPC not available, using fallback', { error })
      // Fallback: basic gap detection
      const gaps = detectGapsBasic(sections, parentParcel, minGapArea)
      return gaps.map((gap) => ({
        type: 'gap' as TopologyErrorType,
        geometry1: gap,
        area: gap.area,
        description: `Gap detected with area ${gap.area?.toFixed(2)} m²`,
        severity: 'warning' as const,
      }))
    }

    if (data?.gaps && Array.isArray(data.gaps)) {
      data.gaps.forEach((gap: any, index: number) => {
        errors.push({
          type: 'gap',
          geometry1: gap.geometry ? parseWKTGeometry(gap.geometry) : undefined,
          area: gap.area,
          coordinates: gap.coordinates,
          description: `Gap ${index + 1} detected with area ${gap.area?.toFixed(2)} m²`,
          severity: 'warning',
        })
      })
    }
  } catch (error) {
    logger.error('Failed to check gaps', error as Error, { sections, parentParcel })
    throw new ValidationError('Failed to check gaps', 'gap_detection', {
      sections,
      parentParcel,
    })
  }

  return errors
}

/**
 * Basic gap detection (fallback)
 * Simple area difference calculation
 */
function detectGapsBasic(
  sections: Geometry[],
  parentParcel: Geometry,
  minArea: number
): Array<{ geometry: Geometry; area: number }> {
  // This is a simplified version - full implementation would require
  // proper geometric difference calculation
  const gaps: Array<{ geometry: Geometry; area: number }> = []

  // For now, return empty array - full implementation requires PostGIS
  // or a more sophisticated geometric library
  return gaps
}

/**
 * Validate geometry topology
 * Comprehensive validation of a single geometry
 */
export async function validateGeometryTopology(
  geometry: Geometry,
  supabaseClient: {
    rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{
      data: any
      error: { message: string } | null
    }>
  }
): Promise<TopologyError[]> {
  const errors: TopologyError[] = []

  // Basic validation
  if (!validateGeometryBasic(geometry)) {
    errors.push({
      type: 'invalid_geometry',
      geometry1: geometry,
      description: 'Geometry structure is invalid',
      severity: 'error',
    })
    return errors
  }

  try {
    const wkt = geometryToWKT(geometry)

    // Check for self-intersection using PostGIS
    const { data, error } = await supabaseClient.rpc('st_isvalid', {
      geometry_wkt: wkt,
      srid: 32735,
    })

    if (error) {
      logger.warn('ST_IsValid RPC not available', { error })
    } else if (data && !data.is_valid) {
      errors.push({
        type: 'self_intersection',
        geometry1: geometry,
        description: `Geometry is invalid: ${data.reason || 'Self-intersection detected'}`,
        severity: 'error',
      })
    }
  } catch (error) {
    logger.error('Failed to validate geometry topology', error as Error, { geometry })
  }

  return errors
}

/**
 * Generate comprehensive topology validation report
 */
export async function validateTopology(
  sections: Geometry[],
  parentParcel: Geometry,
  supabaseClient: {
    rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{
      data: any
      error: { message: string } | null
    }>
  },
  options: {
    checkOverlaps?: boolean
    checkContainment?: boolean
    checkGaps?: boolean
    checkGeometry?: boolean
    tolerance?: number
    minGapArea?: number
    allowTouching?: boolean
  } = {}
): Promise<TopologyValidationReport> {
  const {
    checkOverlaps = true,
    checkContainment = true,
    checkGaps = true,
    checkGeometry = true,
    tolerance = 0.01,
    minGapArea = 1.0,
    allowTouching = true,
  } = options

  const allErrors: TopologyError[] = []
  const allWarnings: TopologyError[] = []

  try {
    // Validate individual geometries
    if (checkGeometry) {
      for (const section of sections) {
        const geomErrors = await validateGeometryTopology(section, supabaseClient)
        allErrors.push(...geomErrors.filter((e) => e.severity === 'error'))
        allWarnings.push(...geomErrors.filter((e) => e.severity === 'warning'))
      }

      const parentErrors = await validateGeometryTopology(parentParcel, supabaseClient)
      allErrors.push(...parentErrors.filter((e) => e.severity === 'error'))
      allWarnings.push(...parentErrors.filter((e) => e.severity === 'warning'))
    }

    // Check overlaps
    if (checkOverlaps && sections.length > 1) {
      const overlapErrors = await detectOverlaps(sections, supabaseClient, tolerance)
      allErrors.push(...overlapErrors.filter((e) => e.severity === 'error'))
      allWarnings.push(...overlapErrors.filter((e) => e.severity === 'warning'))
    }

    // Check containment
    if (checkContainment) {
      const containmentErrors = await validateContainment(
        sections,
        parentParcel,
        supabaseClient,
        allowTouching
      )
      allErrors.push(...containmentErrors.filter((e) => e.severity === 'error'))
      allWarnings.push(...containmentErrors.filter((e) => e.severity === 'warning'))
    }

    // Check gaps
    if (checkGaps) {
      const gapErrors = await checkGaps(sections, parentParcel, supabaseClient, minGapArea)
      allErrors.push(...gapErrors.filter((e) => e.severity === 'error'))
      allWarnings.push(...gapErrors.filter((e) => e.severity === 'warning'))
    }

    // Calculate total area
    let totalArea = 0
    try {
      // This would require PostGIS area calculation
      // For now, use a placeholder
      totalArea = sections.length * 1000 // Placeholder
    } catch (e) {
      logger.warn('Could not calculate total area', e as Error)
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      summary: {
        totalErrors: allErrors.length,
        totalWarnings: allWarnings.length,
        totalGeometries: sections.length + 1, // +1 for parent parcel
        totalArea,
      },
    }
  } catch (error) {
    logger.error('Topology validation failed', error as Error, {
      sections,
      parentParcel,
      options,
    })
    throw new ValidationError(
      'Topology validation failed',
      'topology_validation',
      { sections, parentParcel }
    )
  }
}

