/**
 * Coordinate Geometry (COGO) Computations
 * Surveying computation library for traverse calculations, closure analysis, and area computation
 * Implements surveying standards with 1:10,000 tolerance requirements
 */

import { getProj4 } from './proj4-init'
import { Point, Polygon } from '@/types/spatial'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

/**
 * Angular units
 */
export type AngularUnit = 'degrees' | 'gradians' | 'radians'

/**
 * Distance units
 */
export type DistanceUnit = 'meters' | 'feet'

/**
 * Coordinate point for COGO calculations
 */
export interface COGOPoint {
  x: number
  y: number
  id?: string
}

/**
 * Traverse leg (distance and bearing)
 */
export interface TraverseLeg {
  distance: number
  bearing: number // in degrees
  unit?: DistanceUnit
}

/**
 * Traverse closure result
 */
export interface TraverseClosure {
  closureError: number
  closureErrorRatio: number
  closureDistance: number
  closureBearing: number
  isWithinTolerance: boolean
  tolerance: number // 1:10,000 = 0.0001
}

/**
 * Area computation result
 */
export interface AreaResult {
  area: number
  unit: 'square_meters' | 'square_feet' | 'hectares' | 'acres'
  perimeter: number
}

/**
 * Bearing and distance result
 */
export interface BearingDistance {
  bearing: number // degrees
  distance: number
  unit: DistanceUnit
}

/**
 * Convert angular units to degrees
 */
export function toDegrees(
  angle: number,
  fromUnit: AngularUnit = 'degrees'
): number {
  switch (fromUnit) {
    case 'degrees':
      return angle
    case 'gradians':
      return (angle * 360) / 400
    case 'radians':
      return (angle * 180) / Math.PI
    default:
      throw new ValidationError(`Unknown angular unit: ${fromUnit}`, 'unit', fromUnit)
  }
}

/**
 * Convert degrees to other angular units
 */
export function fromDegrees(
  degrees: number,
  toUnit: AngularUnit = 'degrees'
): number {
  switch (toUnit) {
    case 'degrees':
      return degrees
    case 'gradians':
      return (degrees * 400) / 360
    case 'radians':
      return (degrees * Math.PI) / 180
    default:
      throw new ValidationError(`Unknown angular unit: ${toUnit}`, 'unit', toUnit)
  }
}

/**
 * Convert distance units
 */
export function convertDistance(
  distance: number,
  fromUnit: DistanceUnit,
  toUnit: DistanceUnit
): number {
  if (fromUnit === toUnit) {
    return distance
  }

  // Convert to meters first
  let meters: number
  if (fromUnit === 'feet') {
    meters = distance * 0.3048
  } else {
    meters = distance
  }

  // Convert to target unit
  if (toUnit === 'feet') {
    return meters / 0.3048
  } else {
    return meters
  }
}

/**
 * Normalize bearing to 0-360 degrees
 */
export function normalizeBearing(bearing: number): number {
  let normalized = bearing % 360
  if (normalized < 0) {
    normalized += 360
  }
  return normalized
}

/**
 * Calculate bearing and distance between two points
 */
export function bearingDistance(
  from: COGOPoint,
  to: COGOPoint,
  unit: DistanceUnit = 'meters'
): BearingDistance {
  const dx = to.x - from.x
  const dy = to.y - from.y

  const distance = Math.sqrt(dx * dx + dy * dy)
  let bearing = Math.atan2(dx, dy) * (180 / Math.PI)

  // Convert from math angle (0° = +Y) to survey bearing (0° = +Y/North)
  // Survey bearings: 0° = North, 90° = East, 180° = South, 270° = West
  bearing = normalizeBearing(bearing)

  return {
    bearing,
    distance: convertDistance(distance, 'meters', unit),
    unit,
  }
}

/**
 * Calculate coordinates from bearing and distance
 */
export function calculateCoordinates(
  from: COGOPoint,
  bearing: number,
  distance: number,
  unit: DistanceUnit = 'meters'
): COGOPoint {
  // Convert bearing to radians
  const bearingRad = toDegrees(bearing, 'degrees') * (Math.PI / 180)

  // Convert distance to meters
  const distanceMeters = convertDistance(distance, unit, 'meters')

  // Calculate coordinates
  // Survey convention: 0° = North (+Y), 90° = East (+X)
  const x = from.x + distanceMeters * Math.sin(bearingRad)
  const y = from.y + distanceMeters * Math.cos(bearingRad)

  return { x, y }
}

/**
 * Compute traverse closure error
 * Calculates closure error for a closed traverse polygon
 */
export function computeClosure(
  points: COGOPoint[],
  tolerance: number = 0.0001 // 1:10,000 tolerance
): TraverseClosure {
  if (points.length < 3) {
    throw new ValidationError(
      'Traverse requires at least 3 points',
      'points',
      points.length
    )
  }

  // Check if traverse is closed (first and last points should match)
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const isClosed =
    Math.abs(firstPoint.x - lastPoint.x) < 0.001 &&
    Math.abs(firstPoint.y - lastPoint.y) < 0.001

  if (!isClosed) {
    // Calculate closure distance
    const closureDist = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) +
        Math.pow(lastPoint.y - firstPoint.y, 2)
    )

    // Calculate closure bearing
    const closureBearing = bearingDistance(firstPoint, lastPoint).bearing

    // Calculate total traverse distance
    let totalDistance = 0
    for (let i = 0; i < points.length - 1; i++) {
      const leg = bearingDistance(points[i], points[i + 1])
      totalDistance += leg.distance
    }

    // Calculate closure error ratio
    const closureErrorRatio = totalDistance > 0 ? closureDist / totalDistance : 0

    return {
      closureError: closureDist,
      closureErrorRatio,
      closureDistance: closureDist,
      closureBearing,
      isWithinTolerance: closureErrorRatio <= tolerance,
      tolerance,
    }
  }

  // For closed traverse, calculate sum of angles and distances
  let sumX = 0
  let sumY = 0
  let totalDistance = 0

  for (let i = 0; i < points.length - 1; i++) {
    const leg = bearingDistance(points[i], points[i + 1])
    totalDistance += leg.distance

    // Calculate delta X and delta Y
    const dx = leg.distance * Math.sin(toDegrees(leg.bearing, 'degrees') * (Math.PI / 180))
    const dy = leg.distance * Math.cos(toDegrees(leg.bearing, 'degrees') * (Math.PI / 180))

    sumX += dx
    sumY += dy
  }

  // Closure error is the distance from origin
  const closureDist = Math.sqrt(sumX * sumX + sumY * sumY)
  const closureBearing = Math.atan2(sumX, sumY) * (180 / Math.PI)
  const closureErrorRatio = totalDistance > 0 ? closureDist / totalDistance : 0

  return {
    closureError: closureDist,
    closureErrorRatio,
    closureDistance: closureDist,
    closureBearing: normalizeBearing(closureBearing),
    isWithinTolerance: closureErrorRatio <= tolerance,
    tolerance,
  }
}

/**
 * Compute area using shoelace formula
 * Also known as the surveyor's formula
 */
export function computeArea(
  points: COGOPoint[],
  unit: 'square_meters' | 'square_feet' | 'hectares' | 'acres' = 'square_meters'
): AreaResult {
  if (points.length < 3) {
    throw new ValidationError(
      'Area calculation requires at least 3 points',
      'points',
      points.length
    )
  }

  // Ensure polygon is closed
  const closedPoints = [...points]
  if (
    closedPoints[0].x !== closedPoints[closedPoints.length - 1].x ||
    closedPoints[0].y !== closedPoints[closedPoints.length - 1].y
  ) {
    closedPoints.push({ ...closedPoints[0] })
  }

  // Shoelace formula
  let area = 0
  let perimeter = 0

  for (let i = 0; i < closedPoints.length - 1; i++) {
    const current = closedPoints[i]
    const next = closedPoints[i + 1]

    // Shoelace: sum of (x[i] * y[i+1] - x[i+1] * y[i])
    area += current.x * next.y - next.x * current.y

    // Calculate perimeter
    const leg = bearingDistance(current, next)
    perimeter += leg.distance
  }

  // Area is half the absolute value
  area = Math.abs(area) / 2

  // Convert to desired unit
  let areaInUnit = area
  switch (unit) {
    case 'square_feet':
      areaInUnit = area * 10.7639 // square meters to square feet
      break
    case 'hectares':
      areaInUnit = area / 10000 // square meters to hectares
      break
    case 'acres':
      areaInUnit = area / 4046.86 // square meters to acres
      break
    case 'square_meters':
    default:
      areaInUnit = area
  }

  return {
    area: areaInUnit,
    unit,
    perimeter,
  }
}

/**
 * Least squares adjustment for coordinate refinement
 * Simple implementation for small datasets
 */
export function leastSquaresAdjustment(
  observations: Array<{
    from: COGOPoint
    to: COGOPoint
    distance: number
    bearing: number
    weight?: number
  }>,
  iterations: number = 5
): COGOPoint[] {
  if (observations.length === 0) {
    throw new ValidationError('No observations provided', 'observations', 0)
  }

  // Extract unique points
  const pointMap = new Map<string, COGOPoint>()
  observations.forEach((obs) => {
    if (obs.from.id) pointMap.set(obs.from.id, { ...obs.from })
    if (obs.to.id) pointMap.set(obs.to.id, { ...obs.to })
  })

  // If no IDs, create points from observations
  if (pointMap.size === 0) {
    observations.forEach((obs, idx) => {
      pointMap.set(`p${idx}`, { ...obs.from })
      pointMap.set(`p${idx + 1}`, { ...obs.to })
    })
  }

  const points = Array.from(pointMap.values())

  // Simple iterative adjustment
  for (let iter = 0; iter < iterations; iter++) {
    const adjustments = points.map(() => ({ dx: 0, dy: 0, count: 0 }))

    observations.forEach((obs) => {
      const fromIdx = points.findIndex(
        (p) =>
          Math.abs(p.x - obs.from.x) < 0.001 &&
          Math.abs(p.y - obs.from.y) < 0.001
      )
      const toIdx = points.findIndex(
        (p) =>
          Math.abs(p.x - obs.to.x) < 0.001 &&
          Math.abs(p.y - obs.to.y) < 0.001
      )

      if (fromIdx >= 0 && toIdx >= 0) {
        const calculated = calculateCoordinates(
          points[fromIdx],
          obs.bearing,
          obs.distance
        )

        const weight = obs.weight || 1.0
        const dx = (calculated.x - points[toIdx].x) * weight
        const dy = (calculated.y - points[toIdx].y) * weight

        adjustments[fromIdx].dx -= dx * 0.1 // Damping factor
        adjustments[fromIdx].dy -= dy * 0.1
        adjustments[fromIdx].count += weight

        adjustments[toIdx].dx += dx * 0.1
        adjustments[toIdx].dy += dy * 0.1
        adjustments[toIdx].count += weight
      }
    })

    // Apply adjustments
    points.forEach((point, idx) => {
      if (adjustments[idx].count > 0) {
        point.x += adjustments[idx].dx / adjustments[idx].count
        point.y += adjustments[idx].dy / adjustments[idx].count
      }
    })
  }

  return points
}

/**
 * Assess accuracy of traverse
 * Checks if traverse meets 1:10,000 tolerance requirement
 */
export function assessAccuracy(
  closure: TraverseClosure,
  requiredRatio: number = 0.0001
): {
  meetsStandard: boolean
  actualRatio: number
  requiredRatio: number
  message: string
} {
  const meetsStandard = closure.closureErrorRatio <= requiredRatio

  return {
    meetsStandard,
    actualRatio: closure.closureErrorRatio,
    requiredRatio,
    message: meetsStandard
      ? `Traverse meets accuracy standard (1:${Math.round(1 / requiredRatio)})`
      : `Traverse does not meet accuracy standard. Actual: 1:${Math.round(1 / closure.closureErrorRatio)}, Required: 1:${Math.round(1 / requiredRatio)}`,
  }
}

/**
 * Transform coordinates between local and UTM systems
 * Uses proj4 for coordinate transformation
 */
export function transformToUTM(
  point: COGOPoint,
  fromSrid: number = 4326,
  toSrid: number = 32735
): COGOPoint {
  try {
    const proj4 = getProj4()
    const [x, y] = proj4(
      `EPSG:${fromSrid}`,
      `EPSG:${toSrid}`,
      [point.x, point.y]
    )

    return {
      x: parseFloat(x.toFixed(4)), // UTM precision
      y: parseFloat(y.toFixed(4)),
      id: point.id,
    }
  } catch (error) {
    logger.error('UTM transformation failed', error as Error, { point, fromSrid, toSrid })
    throw new ValidationError(
      `Failed to transform coordinates from SRID ${fromSrid} to SRID ${toSrid}`,
      'transformation',
      { point, fromSrid, toSrid }
    )
  }
}

/**
 * Transform coordinates from UTM to local system
 */
export function transformFromUTM(
  point: COGOPoint,
  fromSrid: number = 32735,
  toSrid: number = 4326
): COGOPoint {
  return transformToUTM(point, fromSrid, toSrid)
}

/**
 * Calculate interior angles of a polygon
 */
export function calculateInteriorAngles(points: COGOPoint[]): number[] {
  if (points.length < 3) {
    throw new ValidationError(
      'Interior angles require at least 3 points',
      'points',
      points.length
    )
  }

  const angles: number[] = []
  const n = points.length

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const current = points[i]
    const next = points[(i + 1) % n]

    // Calculate bearings
    const bearing1 = bearingDistance(current, prev).bearing
    const bearing2 = bearingDistance(current, next).bearing

    // Calculate interior angle
    let angle = bearing2 - bearing1
    if (angle < 0) {
      angle += 360
    }
    if (angle > 180) {
      angle = 360 - angle
    }

    angles.push(angle)
  }

  return angles
}

/**
 * Calculate sum of interior angles
 * For n-sided polygon: (n-2) * 180°
 */
export function sumInteriorAngles(n: number): number {
  return (n - 2) * 180
}

/**
 * Validate traverse closure against theoretical sum
 */
export function validateTraverseAngles(
  points: COGOPoint[],
  expectedSum?: number
): {
  actualSum: number
  expectedSum: number
  difference: number
  isValid: boolean
} {
  const angles = calculateInteriorAngles(points)
  const actualSum = angles.reduce((sum, angle) => sum + angle, 0)
  const theoreticalSum = expectedSum || sumInteriorAngles(points.length)

  return {
    actualSum,
    expectedSum: theoreticalSum,
    difference: actualSum - theoreticalSum,
    isValid: Math.abs(actualSum - theoreticalSum) < 0.01, // 0.01° tolerance
  }
}

