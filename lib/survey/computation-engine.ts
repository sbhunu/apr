/**
 * Survey Computation Engine
 * Automated outside figure computation with accuracy analysis
 */

import {
  computeClosure,
  computeArea,
  bearingDistance,
  calculateCoordinates,
  leastSquaresAdjustment,
  assessAccuracy,
  COGOPoint,
  TraverseClosure,
  AreaResult,
} from '@/lib/spatial/cogo'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Survey method types
 */
export type SurveyMethod = 'traverse' | 'gps' | 'total_station' | 'mixed'

/**
 * Computation input data
 */
export interface ComputationInput {
  coordinates: COGOPoint[]
  surveyMethod?: SurveyMethod
  controlPoints?: COGOPoint[]
  measuredDistances?: Array<{
    from: number // index
    to: number // index
    distance: number
    bearing?: number
  }>
}

/**
 * Computation result
 */
export interface ComputationResult {
  success: boolean
  input: ComputationInput
  closure: TraverseClosure
  area: AreaResult
  adjustedCoordinates?: COGOPoint[]
  accuracy: {
    ratio: number
    isAcceptable: boolean
    quality: 'excellent' | 'good' | 'acceptable' | 'poor'
  }
  qualityControl: {
    passed: boolean
    checks: QualityCheck[]
  }
  errors?: string[]
  warnings?: string[]
}

/**
 * Quality control check
 */
export interface QualityCheck {
  name: string
  passed: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Compute outside figure with full analysis
 */
export function computeOutsideFigure(
  input: ComputationInput
): ComputationResult {
  return monitor('compute_outside_figure', () => {
    const errors: string[] = []
    const warnings: string[] = []
    const qualityChecks: QualityCheck[] = []

    try {
      // Validate input
      if (!input.coordinates || input.coordinates.length < 3) {
        return {
          success: false,
          input,
          closure: {
            closureError: 0,
            closureErrorRatio: 0,
            closureDistance: 0,
            closureBearing: 0,
            isWithinTolerance: false,
            tolerance: 0.0001,
          },
          area: {
            area: 0,
            unit: 'square_meters',
            perimeter: 0,
          },
          accuracy: {
            ratio: 0,
            isAcceptable: false,
            quality: 'poor',
          },
          qualityControl: {
            passed: false,
            checks: [],
          },
          errors: ['At least 3 coordinates required'],
        }
      }

      // Compute closure
      const closure = computeClosure(input.coordinates)

      // Quality check: Closure tolerance
      const closureCheck: QualityCheck = {
        name: 'Closure Tolerance',
        passed: closure.isWithinTolerance,
        message: closure.isWithinTolerance
          ? `Closure error within tolerance (1:${Math.round(closure.closureErrorRatio)})`
          : `Closure error exceeds tolerance (1:${Math.round(closure.closureErrorRatio)}). Required: 1:10,000`,
        severity: closure.isWithinTolerance ? 'info' : 'error',
      }
      qualityChecks.push(closureCheck)

      if (!closure.isWithinTolerance) {
        errors.push(closureCheck.message)
      }

      // Compute area
      const area = computeArea(input.coordinates)

      // Quality check: Minimum area
      const minAreaCheck: QualityCheck = {
        name: 'Minimum Area',
        passed: area.area > 0,
        message: area.area > 0 ? `Area computed: ${area.area.toFixed(2)} m²` : 'Invalid area computed',
        severity: area.area > 0 ? 'info' : 'error',
      }
      qualityChecks.push(minAreaCheck)

      if (area.area <= 0) {
        errors.push('Invalid area computed')
      }

      // Apply least squares adjustment if closure error exists
      let adjustedCoordinates: COGOPoint[] | undefined
      if (closure.closureError > 0.001 && input.measuredDistances && input.measuredDistances.length > 0) {
        try {
          // Calculate bearings for measured distances
          const observations = input.measuredDistances.map((m) => {
            const fromPoint = input.coordinates[m.from]
            const toPoint = input.coordinates[m.to]
            const bd = bearingDistance(fromPoint, toPoint)
            return {
              from: fromPoint,
              to: toPoint,
              distance: m.distance || bd.distance,
              bearing: m.bearing || bd.bearing,
            }
          })
          
          adjustedCoordinates = leastSquaresAdjustment(observations)

          // Quality check: Adjustment improvement
          const adjustedClosure = computeClosure(adjustedCoordinates)
          const improvement = closure.closureError - adjustedClosure.closureError

          const adjustmentCheck: QualityCheck = {
            name: 'Least Squares Adjustment',
            passed: improvement > 0,
            message: improvement > 0
              ? `Adjustment improved closure by ${improvement.toFixed(6)} m`
              : 'Adjustment did not improve closure',
            severity: improvement > 0 ? 'info' : 'warning',
          }
          qualityChecks.push(adjustmentCheck)

          if (improvement <= 0) {
            warnings.push('Least squares adjustment did not improve closure')
          }
        } catch (adjustmentError) {
          warnings.push(
            `Least squares adjustment failed: ${adjustmentError instanceof Error ? adjustmentError.message : 'Unknown error'}`
          )
        }
      }

      // Assess accuracy
      const accuracyAssessment = assessAccuracy(closure)
      const accuracy = {
        ratio: closure.closureErrorRatio,
        isAcceptable: accuracyAssessment.meetsStandard,
        quality: accuracyAssessment.meetsStandard
          ? closure.closureErrorRatio <= 0.00005
            ? 'excellent'
            : closure.closureErrorRatio <= 0.0001
              ? 'good'
              : 'acceptable'
          : 'poor',
      }

      // Quality check: Accuracy assessment
      const accuracyCheck: QualityCheck = {
        name: 'Accuracy Assessment',
        passed: accuracy.isAcceptable,
        message: `Accuracy ratio: 1:${Math.round(closure.closureErrorRatio)} (${accuracy.quality})`,
        severity: accuracy.isAcceptable ? 'info' : 'warning',
      }
      qualityChecks.push(accuracyCheck)

      if (!accuracy.isAcceptable) {
        warnings.push(`Accuracy below acceptable standard: ${accuracy.quality}`)
      }

      // Additional quality checks
      // Check for duplicate coordinates
      const duplicateCheck = checkDuplicateCoordinates(input.coordinates)
      qualityChecks.push(duplicateCheck)
      if (!duplicateCheck.passed) {
        warnings.push(duplicateCheck.message)
      }

      // Check for collinear points
      const collinearCheck = checkCollinearPoints(input.coordinates)
      qualityChecks.push(collinearCheck)
      if (!collinearCheck.passed) {
        warnings.push(collinearCheck.message)
      }

      // Check coordinate consistency
      const consistencyCheck = checkCoordinateConsistency(input.coordinates)
      qualityChecks.push(consistencyCheck)
      if (!consistencyCheck.passed) {
        warnings.push(consistencyCheck.message)
      }

      // Determine overall quality control status
      const qualityControlPassed =
        qualityChecks.filter((c) => c.severity === 'error').every((c) => c.passed) &&
        closure.isWithinTolerance &&
        area.area > 0

      return {
        success: errors.length === 0,
        input,
        closure,
        area,
        adjustedCoordinates,
        accuracy,
        qualityControl: {
          passed: qualityControlPassed,
          checks: qualityChecks,
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      }
    } catch (error) {
      logger.error('Computation failed', error as Error, { input })
      return {
        success: false,
        input,
        closure: {
          closureError: 0,
          closureErrorRatio: 0,
          closureDistance: 0,
          closureBearing: 0,
          isWithinTolerance: false,
          tolerance: 0.0001,
        },
        area: {
          area: 0,
          unit: 'square_meters',
          perimeter: 0,
        },
        accuracy: {
          ratio: 0,
          isAcceptable: false,
          quality: 'poor',
        },
        qualityControl: {
          passed: false,
          checks: [],
        },
        errors: [error instanceof Error ? error.message : 'Unknown computation error'],
      }
    }
  })
}

/**
 * Check for duplicate coordinates
 */
function checkDuplicateCoordinates(coordinates: COGOPoint[]): QualityCheck {
  const tolerance = 0.01 // 1cm tolerance
  const duplicates: number[] = []

  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const dist = Math.sqrt(
        Math.pow(coordinates[i].x - coordinates[j].x, 2) +
          Math.pow(coordinates[i].y - coordinates[j].y, 2)
      )
      if (dist < tolerance) {
        duplicates.push(i, j)
      }
    }
  }

  return {
    name: 'Duplicate Coordinates',
    passed: duplicates.length === 0,
    message:
      duplicates.length === 0
        ? 'No duplicate coordinates found'
        : `Found ${duplicates.length / 2} duplicate coordinate pairs`,
    severity: duplicates.length === 0 ? 'info' : 'warning',
  }
}

/**
 * Check for collinear points (three or more points in a straight line)
 */
function checkCollinearPoints(coordinates: COGOPoint[]): QualityCheck {
  const collinear: number[] = []
  const tolerance = 0.001 // radians

  for (let i = 0; i < coordinates.length - 2; i++) {
    for (let j = i + 1; j < coordinates.length - 1; j++) {
      for (let k = j + 1; k < coordinates.length; k++) {
        const p1 = coordinates[i]
        const p2 = coordinates[j]
        const p3 = coordinates[k]

        // Calculate cross product
        const crossProduct =
          (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x)

        // Check if points are collinear (cross product close to zero)
        if (Math.abs(crossProduct) < tolerance) {
          collinear.push(i, j, k)
        }
      }
    }
  }

  return {
    name: 'Collinear Points',
    passed: collinear.length === 0,
    message:
      collinear.length === 0
        ? 'No collinear points detected'
        : `Found ${collinear.length / 3} sets of collinear points`,
    severity: collinear.length === 0 ? 'info' : 'warning',
  }
}

/**
 * Check coordinate consistency (reasonable values for UTM Zone 35S)
 */
function checkCoordinateConsistency(coordinates: COGOPoint[]): QualityCheck {
  // UTM Zone 35S bounds (approximate for Zimbabwe)
  const MIN_EASTING = 200000
  const MAX_EASTING = 800000
  const MIN_NORTHING = 7500000
  const MAX_NORTHING = 8500000

  const outliers: number[] = []

  coordinates.forEach((coord, index) => {
    if (
      coord.x < MIN_EASTING ||
      coord.x > MAX_EASTING ||
      coord.y < MIN_NORTHING ||
      coord.y > MAX_NORTHING
    ) {
      outliers.push(index)
    }
  })

  return {
    name: 'Coordinate Consistency',
    passed: outliers.length === 0,
    message:
      outliers.length === 0
        ? 'All coordinates within expected UTM Zone 35S bounds'
        : `Found ${outliers.length} coordinates outside expected bounds`,
    severity: outliers.length === 0 ? 'info' : 'warning',
  }
}

/**
 * Generate computation report
 */
export function generateComputationReport(
  result: ComputationResult
): string {
  const lines: string[] = []

  lines.push('='.repeat(60))
  lines.push('OUTSIDE FIGURE COMPUTATION REPORT')
  lines.push('='.repeat(60))
  lines.push('')

  // Closure information
  lines.push('CLOSURE ANALYSIS')
  lines.push('-'.repeat(60))
  lines.push(`Closure Error: ${result.closure.closureError.toFixed(6)} m`)
  lines.push(`Closure Error Ratio: 1:${Math.round(result.closure.closureErrorRatio)}`)
  lines.push(`Closure Distance: ${result.closure.closureDistance.toFixed(4)} m`)
  lines.push(`Closure Bearing: ${result.closure.closureBearing.toFixed(4)}°`)
  lines.push(
    `Within Tolerance: ${result.closure.isWithinTolerance ? 'YES' : 'NO'} (Required: 1:10,000)`
  )
  lines.push('')

  // Area information
  lines.push('AREA COMPUTATION')
  lines.push('-'.repeat(60))
  lines.push(`Area: ${result.area.area.toFixed(2)} m²`)
  lines.push(`Area: ${(result.area.area / 10000).toFixed(4)} hectares`)
  lines.push(`Perimeter: ${result.area.perimeter.toFixed(2)} m`)
  lines.push('')

  // Accuracy assessment
  lines.push('ACCURACY ASSESSMENT')
  lines.push('-'.repeat(60))
  lines.push(`Accuracy Ratio: 1:${Math.round(result.accuracy.ratio)}`)
  lines.push(`Quality: ${result.accuracy.quality.toUpperCase()}`)
  lines.push(`Acceptable: ${result.accuracy.isAcceptable ? 'YES' : 'NO'}`)
  lines.push('')

  // Quality control
  lines.push('QUALITY CONTROL CHECKS')
  lines.push('-'.repeat(60))
  result.qualityControl.checks.forEach((check) => {
    const status = check.passed ? '✓' : '✗'
    lines.push(`${status} ${check.name}: ${check.message}`)
  })
  lines.push('')
  lines.push(`Overall Status: ${result.qualityControl.passed ? 'PASSED' : 'FAILED'}`)
  lines.push('')

  // Warnings and errors
  if (result.errors && result.errors.length > 0) {
    lines.push('ERRORS')
    lines.push('-'.repeat(60))
    result.errors.forEach((error) => lines.push(`✗ ${error}`))
    lines.push('')
  }

  if (result.warnings && result.warnings.length > 0) {
    lines.push('WARNINGS')
    lines.push('-'.repeat(60))
    result.warnings.forEach((warning) => lines.push(`⚠ ${warning}`))
    lines.push('')
  }

  lines.push('='.repeat(60))
  lines.push(`Report Generated: ${new Date().toISOString()}`)
  lines.push('='.repeat(60))

  return lines.join('\n')
}

