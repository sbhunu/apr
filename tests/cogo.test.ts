/**
 * Tests for COGO (Coordinate Geometry) computations
 * Tests surveying calculations, traverse closure, and area computation
 */

import {
  computeClosure,
  computeArea,
  bearingDistance,
  calculateCoordinates,
  assessAccuracy,
  transformToUTM,
  calculateInteriorAngles,
  validateTraverseAngles,
  toDegrees,
  fromDegrees,
  convertDistance,
  normalizeBearing,
  type COGOPoint,
} from '@/lib/spatial/cogo'
import { ValidationError } from '@/lib/errors/base'

describe('COGO Computations', () => {
  describe('Angular Unit Conversions', () => {
    it('should convert degrees to radians', () => {
      expect(toDegrees(Math.PI, 'radians')).toBeCloseTo(180, 5)
      expect(toDegrees(Math.PI / 2, 'radians')).toBeCloseTo(90, 5)
    })

    it('should convert gradians to degrees', () => {
      expect(toDegrees(100, 'gradians')).toBeCloseTo(90, 5)
      expect(toDegrees(200, 'gradians')).toBeCloseTo(180, 5)
    })

    it('should convert from degrees to other units', () => {
      expect(fromDegrees(90, 'radians')).toBeCloseTo(Math.PI / 2, 5)
      expect(fromDegrees(90, 'gradians')).toBeCloseTo(100, 5)
    })
  })

  describe('Distance Unit Conversions', () => {
    it('should convert feet to meters', () => {
      const meters = convertDistance(100, 'feet', 'meters')
      expect(meters).toBeCloseTo(30.48, 2)
    })

    it('should convert meters to feet', () => {
      const feet = convertDistance(30.48, 'meters', 'feet')
      expect(feet).toBeCloseTo(100, 2)
    })

    it('should return same value for same unit', () => {
      expect(convertDistance(100, 'meters', 'meters')).toBe(100)
      expect(convertDistance(100, 'feet', 'feet')).toBe(100)
    })
  })

  describe('Bearing Normalization', () => {
    it('should normalize bearing to 0-360', () => {
      expect(normalizeBearing(0)).toBe(0)
      expect(normalizeBearing(360)).toBe(0)
      expect(normalizeBearing(450)).toBe(90)
      expect(normalizeBearing(-90)).toBe(270)
    })
  })

  describe('Bearing and Distance', () => {
    it('should calculate bearing and distance between points', () => {
      const from: COGOPoint = { x: 0, y: 0 }
      const to: COGOPoint = { x: 100, y: 100 }

      const result = bearingDistance(from, to)
      expect(result.distance).toBeCloseTo(141.42, 1)
      expect(result.bearing).toBeGreaterThan(0)
      expect(result.bearing).toBeLessThan(360)
    })

    it('should calculate northward bearing correctly', () => {
      const from: COGOPoint = { x: 0, y: 0 }
      const to: COGOPoint = { x: 0, y: 100 }

      const result = bearingDistance(from, to)
      expect(result.bearing).toBeCloseTo(0, 1) // North
    })

    it('should calculate eastward bearing correctly', () => {
      const from: COGOPoint = { x: 0, y: 0 }
      const to: COGOPoint = { x: 100, y: 0 }

      const result = bearingDistance(from, to)
      expect(result.bearing).toBeCloseTo(90, 1) // East
    })
  })

  describe('Coordinate Calculation', () => {
    it('should calculate coordinates from bearing and distance', () => {
      const from: COGOPoint = { x: 0, y: 0 }
      const bearing = 0 // North
      const distance = 100

      const result = calculateCoordinates(from, bearing, distance)
      expect(result.x).toBeCloseTo(0, 2)
      expect(result.y).toBeCloseTo(100, 2)
    })

    it('should calculate coordinates for 45-degree bearing', () => {
      const from: COGOPoint = { x: 0, y: 0 }
      const bearing = 45
      const distance = 100

      const result = calculateCoordinates(from, bearing, distance)
      expect(result.x).toBeCloseTo(70.71, 1)
      expect(result.y).toBeCloseTo(70.71, 1)
    })
  })

  describe('Traverse Closure', () => {
    it('should calculate closure for closed traverse', () => {
      const traverse: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 0 }, // Closed
      ]

      const closure = computeClosure(traverse)
      expect(closure.closureError).toBeCloseTo(0, 2)
      expect(closure.isWithinTolerance).toBe(true)
    })

    it('should detect closure error in open traverse', () => {
      const traverse: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        // Not closed
      ]

      const closure = computeClosure(traverse)
      expect(closure.closureError).toBeGreaterThan(0)
    })

    it('should throw error for insufficient points', () => {
      const traverse: COGOPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
      expect(() => computeClosure(traverse)).toThrow(ValidationError)
    })
  })

  describe('Area Computation', () => {
    it('should calculate area of square', () => {
      const square: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const area = computeArea(square, 'square_meters')
      expect(area.area).toBeCloseTo(10000, 1) // 100m x 100m = 10,000 m²
    })

    it('should calculate area in hectares', () => {
      const square: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const area = computeArea(square, 'hectares')
      expect(area.area).toBeCloseTo(1, 2) // 10,000 m² = 1 hectare
    })

    it('should calculate perimeter', () => {
      const square: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const area = computeArea(square)
      expect(area.perimeter).toBeCloseTo(400, 1) // 4 sides x 100m
    })

    it('should throw error for insufficient points', () => {
      const points: COGOPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
      expect(() => computeArea(points)).toThrow(ValidationError)
    })
  })

  describe('Accuracy Assessment', () => {
    it('should assess accuracy correctly', () => {
      const closure = {
        closureError: 0.1,
        closureErrorRatio: 0.00005, // 1:20,000
        closureDistance: 0.1,
        closureBearing: 0,
        isWithinTolerance: true,
        tolerance: 0.0001, // 1:10,000
      }

      const assessment = assessAccuracy(closure)
      expect(assessment.meetsStandard).toBe(true)
      expect(assessment.actualRatio).toBeLessThan(assessment.requiredRatio)
    })

    it('should detect when accuracy standard is not met', () => {
      const closure = {
        closureError: 1.0,
        closureErrorRatio: 0.001, // 1:1,000
        closureDistance: 1.0,
        closureBearing: 0,
        isWithinTolerance: false,
        tolerance: 0.0001, // 1:10,000
      }

      const assessment = assessAccuracy(closure)
      expect(assessment.meetsStandard).toBe(false)
    })
  })

  describe('Interior Angles', () => {
    it('should calculate interior angles of square', () => {
      const square: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const angles = calculateInteriorAngles(square)
      expect(angles).toHaveLength(4)
      angles.forEach((angle) => {
        expect(angle).toBeCloseTo(90, 1) // Square has 90° angles
      })
    })

    it('should validate traverse angles', () => {
      const square: COGOPoint[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ]

      const validation = validateTraverseAngles(square)
      expect(validation.expectedSum).toBe(360) // (4-2) * 180
      expect(validation.isValid).toBe(true)
    })
  })
})

