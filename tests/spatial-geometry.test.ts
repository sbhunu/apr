/**
 * Tests for spatial geometry utilities
 * Tests coordinate parsing, validation, and transformations
 */

import {
  parseDecimalCoordinates,
  parseDMSCoordinates,
  parseUTMCoordinates,
  transformProjection,
  parseCoordinatesFromCSV,
  parseWKTGeometry,
  geometryToWKT,
  validateGeometryBasic,
  createPointFromCoordinates,
  createPolygonFromCoordinates,
  isPoint,
  isPolygon,
} from '@/lib/spatial/geometry'
import { ValidationError } from '@/lib/errors/base'

describe('Spatial Geometry Utilities', () => {
  describe('parseDecimalCoordinates', () => {
    it('should parse valid decimal coordinates', () => {
      const [lat, lon] = parseDecimalCoordinates(-17.8252, 31.0335)
      expect(lat).toBeCloseTo(-17.8252, 6)
      expect(lon).toBeCloseTo(31.0335, 6)
    })

    it('should parse string coordinates', () => {
      const [lat, lon] = parseDecimalCoordinates('-17.8252', '31.0335')
      expect(lat).toBeCloseTo(-17.8252, 6)
      expect(lon).toBeCloseTo(31.0335, 6)
    })

    it('should throw ValidationError for invalid latitude', () => {
      expect(() => parseDecimalCoordinates(91, 31)).toThrow(ValidationError)
      expect(() => parseDecimalCoordinates(-91, 31)).toThrow(ValidationError)
    })

    it('should throw ValidationError for invalid longitude', () => {
      expect(() => parseDecimalCoordinates(-17, 181)).toThrow(ValidationError)
      expect(() => parseDecimalCoordinates(-17, -181)).toThrow(ValidationError)
    })

    it('should apply precision', () => {
      const [lat, lon] = parseDecimalCoordinates(-17.8252123, 31.0335456, {
        precision: 4,
      })
      expect(lat.toString()).toMatch(/^-17\.8252/)
      expect(lon.toString()).toMatch(/^31\.0335/)
    })
  })

  describe('parseUTMCoordinates', () => {
    it('should parse valid UTM coordinates', () => {
      const [easting, northing] = parseUTMCoordinates(300000, 8000000, 35, 'S')
      expect(easting).toBeCloseTo(300000, 4)
      expect(northing).toBeCloseTo(8000000, 4)
    })

    it('should throw ValidationError for invalid easting', () => {
      expect(() => parseUTMCoordinates(100000, 8000000)).toThrow(ValidationError)
      expect(() => parseUTMCoordinates(900000, 8000000)).toThrow(ValidationError)
    })
  })

  describe('transformProjection', () => {
    it('should transform WGS84 to UTM Zone 35S', () => {
      // Harare coordinates: -17.8252°S, 31.0335°E
      const [x, y] = transformProjection(31.0335, -17.8252, 4326, 32735)
      expect(x).toBeGreaterThan(300000)
      expect(x).toBeLessThan(400000)
      expect(y).toBeGreaterThan(8000000)
      expect(y).toBeLessThan(8100000)
    })

    it('should transform UTM to WGS84', () => {
      const [lon, lat] = transformProjection(300000, 8000000, 32735, 4326)
      expect(lat).toBeGreaterThan(-20)
      expect(lat).toBeLessThan(-15)
      expect(lon).toBeGreaterThan(30)
      expect(lon).toBeLessThan(32)
    })

    it('should throw ValidationError for unknown SRID', () => {
      expect(() => transformProjection(31, -17, 9999, 32735)).toThrow(ValidationError)
    })
  })

  describe('parseCoordinatesFromCSV', () => {
    it('should parse CSV with decimal coordinates', () => {
      const csv = '-17.8252,31.0335\n-17.8260,31.0340'
      const coords = parseCoordinatesFromCSV(csv)
      expect(coords).toHaveLength(2)
      expect(coords[0]).toEqual([expect.closeTo(-17.8252, 6), expect.closeTo(31.0335, 6)])
    })

    it('should skip header row', () => {
      const csv = 'latitude,longitude\n-17.8252,31.0335'
      const coords = parseCoordinatesFromCSV(csv)
      expect(coords).toHaveLength(1)
    })

    it('should skip comments', () => {
      const csv = '# Comment\n-17.8252,31.0335\n# Another comment\n-17.8260,31.0340'
      const coords = parseCoordinatesFromCSV(csv)
      expect(coords).toHaveLength(2)
    })
  })

  describe('parseWKTGeometry', () => {
    it('should parse Point WKT', () => {
      const geometry = parseWKTGeometry('POINT(31.0335 -17.8252)')
      expect(geometry.type).toBe('Point')
      expect(geometry.coordinates).toEqual([31.0335, -17.8252])
    })

    it('should parse Polygon WKT', () => {
      const geometry = parseWKTGeometry(
        'POLYGON((30 10, 40 10, 40 20, 30 20, 30 10))'
      )
      expect(geometry.type).toBe('Polygon')
      expect(Array.isArray(geometry.coordinates)).toBe(true)
    })
  })

  describe('validateGeometryBasic', () => {
    it('should validate valid Point', () => {
      const point = {
        type: 'Point' as const,
        coordinates: [31.0335, -17.8252],
      }
      expect(validateGeometryBasic(point)).toBe(true)
    })

    it('should reject invalid Point', () => {
      const point = {
        type: 'Point' as const,
        coordinates: [NaN, -17.8252],
      }
      expect(validateGeometryBasic(point)).toBe(false)
    })

    it('should validate valid Polygon', () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [30, 10],
            [40, 10],
            [40, 20],
            [30, 20],
            [30, 10],
          ],
        ],
      }
      expect(validateGeometryBasic(polygon)).toBe(true)
    })
  })

  describe('createPointFromCoordinates', () => {
    it('should create Point with UTM coordinates', () => {
      const point = createPointFromCoordinates(300000, 8000000, 32735)
      expect(point.type).toBe('Point')
      expect(point.coordinates).toEqual([300000, 8000000])
      expect(point.crs?.properties.name).toBe('EPSG:32735')
    })

    it('should apply precision', () => {
      const point = createPointFromCoordinates(300000.123456, 8000000.987654, 32735)
      expect(point.coordinates[0].toString()).toMatch(/^300000\.1235/)
      expect(point.coordinates[1].toString()).toMatch(/^8000000\.9877/)
    })
  })

  describe('createPolygonFromCoordinates', () => {
    it('should create Polygon from coordinates', () => {
      const coords: Array<[number, number]> = [
        [300000, 8000000],
        [301000, 8000000],
        [301000, 8001000],
        [300000, 8001000],
      ]
      const polygon = createPolygonFromCoordinates(coords, 32735)
      expect(polygon.type).toBe('Polygon')
      expect(polygon.coordinates[0]).toHaveLength(5) // Closed ring
    })

    it('should auto-close polygon', () => {
      const coords: Array<[number, number]> = [
        [300000, 8000000],
        [301000, 8000000],
        [301000, 8001000],
        [300000, 8001000],
        // Not closed
      ]
      const polygon = createPolygonFromCoordinates(coords, 32735)
      const ring = polygon.coordinates[0]
      expect(ring[0]).toEqual(ring[ring.length - 1]) // First and last match
    })

    it('should throw ValidationError for insufficient coordinates', () => {
      const coords: Array<[number, number]> = [
        [300000, 8000000],
        [301000, 8000000],
        [301000, 8001000],
      ]
      expect(() => createPolygonFromCoordinates(coords)).toThrow(ValidationError)
    })
  })

  describe('Type guards', () => {
    it('should identify Point geometry', () => {
      const point = createPointFromCoordinates(300000, 8000000)
      expect(isPoint(point)).toBe(true)
      expect(isPolygon(point)).toBe(false)
    })

    it('should identify Polygon geometry', () => {
      const polygon = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [301000, 8000000],
          [301000, 8001000],
          [300000, 8001000],
        ],
        32735
      )
      expect(isPolygon(polygon)).toBe(true)
      expect(isPoint(polygon)).toBe(false)
    })
  })
})

