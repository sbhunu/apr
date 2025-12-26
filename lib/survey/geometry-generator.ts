/**
 * Sectional Geometry Generator
 * Generates 3D unit geometries from approved planning specifications
 */

import { COGOPoint, computeArea } from '@/lib/spatial/cogo'
import { validateContainment, detectOverlaps } from '@/lib/spatial/validation'
import { Geometry } from '@/types/spatial'
import { parseWKTGeometry, createPolygonFromCoordinates, geometryToWKT } from '@/lib/spatial/geometry'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

function cogoPointsToWktPolygon(points: COGOPoint[]): string {
  // Convert COGOPoint -> [x,y] and ensure a closed ring
  const coords: Array<[number, number]> = points.map((p) => [p.x, p.y])
  if (coords.length >= 3) {
    const [fx, fy] = coords[0]
    const [lx, ly] = coords[coords.length - 1]
    if (fx !== lx || fy !== ly) {
      coords.push([fx, fy])
    }
  }

  const polygon = createPolygonFromCoordinates(coords)
  return geometryToWKT(polygon)
}

/**
 * Unit specification from planning plan
 */
export interface UnitSpecification {
  sectionNumber: string
  sectionType: 'residential' | 'commercial' | 'parking' | 'storage' | 'common' | 'other'
  floorLevel: number // 0 = ground, negative = basement, positive = upper floors
  coordinates: COGOPoint[] // Unit boundary coordinates
  declaredArea?: number // Declared area from plan (m²)
  exclusiveUseAreas?: Array<{
    type: string // e.g., 'balcony', 'patio', 'parking_space'
    coordinates: COGOPoint[]
  }>
  dimensions?: {
    length?: number
    width?: number
    height?: number
  }
}

/**
 * Generated unit geometry
 */
export interface GeneratedUnitGeometry {
  sectionNumber: string
  sectionType: string
  floorLevel: number
  geometry: string // WKT POLYGON
  computedArea: number // m²
  declaredArea?: number
  areaDifference?: number
  dimensions: {
    length?: number
    width?: number
    height?: number
  }
  exclusiveUseAreas?: string // WKT MULTIPOLYGON
  exclusiveUseAreaTotal: number // m²
  containmentValidated: boolean
  overlapValidated: boolean
  validationErrors?: string[]
  validationWarnings?: string[]
}

/**
 * Geometry generation result
 */
export interface GeometryGenerationResult {
  success: boolean
  units: GeneratedUnitGeometry[]
  commonProperty: {
    geometry?: string // WKT POLYGON
    area: number // m²
  }
  validation: {
    allContained: boolean
    noOverlaps: boolean
    errors: string[]
    warnings: string[]
  }
}

/**
 * Generate sectional geometries from plan specifications
 */
export function generateSectionalGeometries(
  parentParcelGeometry: string, // WKT POLYGON
  unitSpecifications: UnitSpecification[]
): GeometryGenerationResult {
  return monitor('generate_sectional_geometries', () => {
    const errors: string[] = []
    const warnings: string[] = []
    const generatedUnits: GeneratedUnitGeometry[] = []

    try {
      // Parse parent parcel geometry
      const parentGeom = parseWKTGeometry(parentParcelGeometry)
      if (parentGeom.type !== 'Polygon') {
        throw new ValidationError(
          'Parent parcel must be a POLYGON geometry',
          'geometry',
          parentGeom.type
        )
      }

      // Generate unit geometries
      for (const spec of unitSpecifications) {
        try {
          const unit = generateUnitGeometry(spec, parentGeom)
          generatedUnits.push(unit)
        } catch (unitError) {
          errors.push(
            `Unit ${spec.sectionNumber}: ${unitError instanceof Error ? unitError.message : 'Unknown error'}`
          )
        }
      }

      // Validate containment (basic check - full validation will be done via PostGIS)
      const allContained = validateContainmentBasic(
        generatedUnits.map((u) => parseWKTGeometry(u.geometry)),
        parentGeom
      )

      if (!allContained) {
        const failedUnits = generatedUnits
          .filter((u) => {
            const unitGeom = parseWKTGeometry(u.geometry)
            return !isContainedBasic(unitGeom, parentGeom)
          })
          .map((u) => u.sectionNumber)
        errors.push(`Units not contained in parent parcel: ${failedUnits.join(', ')}`)
      }

      // Validate overlaps (basic check - full validation will be done via PostGIS)
      const hasOverlaps = detectOverlapsBasic(
        generatedUnits.map((u) => parseWKTGeometry(u.geometry))
      )

      if (hasOverlaps.length > 0) {
        const overlappingUnits = hasOverlaps.map((pair) => 
          `${generatedUnits[pair[0]].sectionNumber} & ${generatedUnits[pair[1]].sectionNumber}`
        )
        errors.push(`Overlapping units detected: ${overlappingUnits.join(', ')}`)
      }

      // Update validation flags
      generatedUnits.forEach((unit) => {
        const unitGeom = parseWKTGeometry(unit.geometry)
        unit.containmentValidated = isContainedBasic(unitGeom, parentGeom)
        unit.overlapValidated = !hasOverlaps.some((pair) => 
          generatedUnits.findIndex((u) => u.sectionNumber === unit.sectionNumber) === pair[0] ||
          generatedUnits.findIndex((u) => u.sectionNumber === unit.sectionNumber) === pair[1]
        )
      })

      // Compute common property (parent parcel minus all units)
      const commonProperty = computeCommonProperty(
        parentParcelGeometry,
        generatedUnits.map((u) => u.geometry)
      )

      return {
        success: errors.length === 0,
        units: generatedUnits,
        commonProperty,
        validation: {
          allContained,
          noOverlaps: !hasOverlaps,
          errors,
          warnings,
        },
      }
    } catch (error) {
      logger.error('Geometry generation failed', error as Error, {
        unitCount: unitSpecifications.length,
      })
      return {
        success: false,
        units: generatedUnits,
        commonProperty: { area: 0 },
        validation: {
          allContained: false,
          noOverlaps: false,
          errors: [error instanceof Error ? error.message : 'Unknown error', ...errors],
          warnings,
        },
      }
    }
  })
}

/**
 * Generate geometry for a single unit
 */
function generateUnitGeometry(
  spec: UnitSpecification,
  parentGeom: any
): GeneratedUnitGeometry {
  // Validate coordinates
  if (!spec.coordinates || spec.coordinates.length < 3) {
    throw new ValidationError(
      `Unit ${spec.sectionNumber}: At least 3 coordinates required`,
      'coordinates',
      spec.coordinates?.length || 0
    )
  }

  // Convert coordinates to WKT polygon
  const geometry = cogoPointsToWktPolygon(spec.coordinates)

  // Compute area
  const areaResult = computeArea(spec.coordinates)
  const computedArea = areaResult.area

  // Calculate area difference if declared area provided
  let areaDifference: number | undefined
  if (spec.declaredArea !== undefined) {
    areaDifference = Math.abs(computedArea - spec.declaredArea)
    if (areaDifference > 0.1) {
      // Warn if difference > 0.1 m²
      logger.warn('Area difference detected', {
        sectionNumber: spec.sectionNumber,
        computedArea,
        declaredArea: spec.declaredArea,
        difference: areaDifference,
      })
    }
  }

  // Calculate dimensions
  const dimensions = calculateDimensions(spec.coordinates, spec.dimensions)

  // Process exclusive use areas
  let exclusiveUseAreas: string | undefined
  let exclusiveUseAreaTotal = 0

  if (spec.exclusiveUseAreas && spec.exclusiveUseAreas.length > 0) {
    const exclusivePolygons = spec.exclusiveUseAreas.map((area) =>
      cogoPointsToWktPolygon(area.coordinates)
    )
    exclusiveUseAreas = `MULTIPOLYGON(${exclusivePolygons.map((p) => p.replace('POLYGON(', '').replace(')', '')).join(', ')})`

    // Calculate total exclusive use area
    exclusiveUseAreaTotal = spec.exclusiveUseAreas.reduce((sum, area) => {
      const areaResult = computeArea(area.coordinates)
      return sum + areaResult.area
    }, 0)
  }

  return {
    sectionNumber: spec.sectionNumber,
    sectionType: spec.sectionType,
    floorLevel: spec.floorLevel,
    geometry,
    computedArea,
    declaredArea: spec.declaredArea,
    areaDifference,
    dimensions,
    exclusiveUseAreas,
    exclusiveUseAreaTotal,
    containmentValidated: false, // Will be validated later
    overlapValidated: false, // Will be validated later
  }
}

/**
 * Calculate unit dimensions
 */
function calculateDimensions(
  coordinates: COGOPoint[],
  providedDimensions?: {
    length?: number
    width?: number
    height?: number
  }
): {
  length?: number
  width?: number
  height?: number
} {
  const dimensions: {
    length?: number
    width?: number
    height?: number
  } = {}

  if (providedDimensions) {
    return providedDimensions
  }

  // Calculate bounding box dimensions
  if (coordinates.length >= 2) {
    const xs = coordinates.map((c) => c.x)
    const ys = coordinates.map((c) => c.y)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    dimensions.length = Math.abs(maxX - minX)
    dimensions.width = Math.abs(maxY - minY)
  }

  return dimensions
}

/**
 * Compute common property area
 * Common property = Parent parcel - Sum of all unit areas
 */
function computeCommonProperty(
  parentParcelGeometry: string,
  unitGeometries: string[]
): {
  geometry?: string
  area: number
} {
  try {
    // Parse parent geometry
    const parentGeom = parseWKTGeometry(parentParcelGeometry)
    if (parentGeom.type !== 'Polygon' || !parentGeom.coordinates) {
      return { area: 0 }
    }

    // Calculate parent area
    const parentCoords = parentGeom.coordinates[0].map((c: number[]) => ({
      x: c[0],
      y: c[1],
    }))
    const parentArea = computeArea(parentCoords).area

    // Calculate sum of unit areas
    let totalUnitArea = 0
    for (const unitWKT of unitGeometries) {
      try {
        const unitGeom = parseWKTGeometry(unitWKT)
        if (unitGeom.type === 'Polygon' && unitGeom.coordinates) {
          const unitCoords = unitGeom.coordinates[0].map((c: number[]) => ({
            x: c[0],
            y: c[1],
          }))
          totalUnitArea += computeArea(unitCoords).area
        }
      } catch (error) {
        logger.warn('Failed to parse unit geometry for common property calculation', error as Error)
      }
    }

    // Common property area
    const commonArea = Math.max(0, parentArea - totalUnitArea)

    // Note: Computing the actual geometry (parent - units) would require PostGIS ST_Difference
    // For now, we just return the area

    return {
      area: commonArea,
    }
  } catch (error) {
    logger.error('Failed to compute common property', error as Error)
    return { area: 0 }
  }
}

/**
 * Group units by floor level
 */
export function groupUnitsByFloorLevel(
  units: GeneratedUnitGeometry[]
): Record<number, GeneratedUnitGeometry[]> {
  const grouped: Record<number, GeneratedUnitGeometry[]> = {}

  for (const unit of units) {
    if (!grouped[unit.floorLevel]) {
      grouped[unit.floorLevel] = []
    }
    grouped[unit.floorLevel].push(unit)
  }

  return grouped
}

/**
 * Basic containment check (fallback)
 */
function isContainedBasic(child: Geometry, parent: Geometry): boolean {
  if (child.type !== 'Polygon' || parent.type !== 'Polygon') {
    return false
  }

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
 * Basic containment validation
 */
function validateContainmentBasic(
  sections: Geometry[],
  parentParcel: Geometry
): boolean {
  return sections.every((section) => isContainedBasic(section, parentParcel))
}

/**
 * Basic overlap detection
 */
function detectOverlapsBasic(geometries: Geometry[]): Array<[number, number]> {
  const overlaps: Array<[number, number]> = []

  for (let i = 0; i < geometries.length; i++) {
    for (let j = i + 1; j < geometries.length; j++) {
      const geom1 = geometries[i]
      const geom2 = geometries[j]

      if (geom1.type !== 'Polygon' && geom1.type !== 'MultiPolygon') continue
      if (geom2.type !== 'Polygon' && geom2.type !== 'MultiPolygon') continue

      const bbox1 = getBoundingBox(geom1)
      const bbox2 = getBoundingBox(geom2)

      // Check if bounding boxes overlap
      if (
        !(
          bbox1.maxX < bbox2.minX ||
          bbox1.minX > bbox2.maxX ||
          bbox1.maxY < bbox2.minY ||
          bbox1.minY > bbox2.maxY
        )
      ) {
        overlaps.push([i, j])
      }
    }
  }

  return overlaps
}

/**
 * Validate floor level consistency
 */
export function validateFloorLevels(
  units: GeneratedUnitGeometry[]
): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for units at same floor level with overlapping geometries
  const grouped = groupUnitsByFloorLevel(units)

  for (const [floorLevel, floorUnits] of Object.entries(grouped)) {
    if (floorUnits.length > 1) {
      // Check for overlaps at this floor level
      const floorGeometries = floorUnits.map((u) => parseWKTGeometry(u.geometry))
      const overlaps = detectOverlapsBasic(floorGeometries)

      if (overlaps.length > 0) {
        const overlapping = overlaps.map((pair) =>
          `${floorUnits[pair[0]].sectionNumber} & ${floorUnits[pair[1]].sectionNumber}`
        )
        errors.push(
          `Floor ${floorLevel}: Overlapping units detected: ${overlapping.join(', ')}`
        )
      }
    }
  }

  // Check for reasonable floor level range
  const floorLevels = units.map((u) => u.floorLevel)
  const minFloor = Math.min(...floorLevels)
  const maxFloor = Math.max(...floorLevels)

  if (maxFloor - minFloor > 50) {
    warnings.push(`Unusual floor level range: ${minFloor} to ${maxFloor}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

