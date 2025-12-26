/**
 * Core Spatial Geometry Utilities
 * Provides coordinate parsing, validation, and transformation functions
 * for the APR system using SRID 32735 (UTM Zone 35S - Zimbabwe)
 */

import { getProj4, initProj4 } from './proj4-init'
import wellknown from 'wellknown'
import type { Point, Polygon, MultiPolygon, Geometry } from '@/types/spatial'
import { DEFAULT_SRID } from '@/types/spatial'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

// Initialize proj4 and coordinate systems
const proj4 = initProj4()

/**
 * Coordinate precision for UTM coordinates (4 decimal places = ~1mm accuracy)
 */
export const UTM_PRECISION = 4

/**
 * Coordinate precision for lat/lon (6 decimal places = ~10cm accuracy)
 */
export const LAT_LON_PRECISION = 6

/**
 * Parse coordinates from various formats
 */
export interface CoordinateParseOptions {
  format?: 'decimal' | 'dms' | 'utm'
  srid?: number
  precision?: number
}

/**
 * Parse decimal degree coordinates (lat, lon)
 */
export function parseDecimalCoordinates(
  lat: number | string,
  lon: number | string,
  options: CoordinateParseOptions = {}
): [number, number] {
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat
  const lonNum = typeof lon === 'string' ? parseFloat(lon) : lon

  if (isNaN(latNum) || isNaN(lonNum)) {
    throw new ValidationError('Invalid coordinate format', 'coordinates', { lat, lon })
  }

  // Validate latitude range (-90 to 90)
  if (latNum < -90 || latNum > 90) {
    throw new ValidationError(
      'Latitude must be between -90 and 90 degrees',
      'latitude',
      latNum
    )
  }

  // Validate longitude range (-180 to 180)
  if (lonNum < -180 || lonNum > 180) {
    throw new ValidationError(
      'Longitude must be between -180 and 180 degrees',
      'longitude',
      lonNum
    )
  }

  const precision = options.precision ?? LAT_LON_PRECISION
  return [
    parseFloat(latNum.toFixed(precision)),
    parseFloat(lonNum.toFixed(precision)),
  ]
}

/**
 * Parse DMS (Degrees Minutes Seconds) coordinates
 * Format: "DD°MM'SS.SS\"N/S DD°MM'SS.SS\"E/W"
 */
export function parseDMSCoordinates(
  dmsString: string
): [number, number] {
  // Simple DMS parser - can be enhanced for more formats
  const dmsRegex =
    /(\d+)°\s*(\d+)['′]\s*(\d+(?:\.\d+)?)["″]?\s*([NS])\s*,?\s*(\d+)°\s*(\d+)['′]\s*(\d+(?:\.\d+)?)["″]?\s*([EW])/i

  const match = dmsString.match(dmsRegex)
  if (!match) {
    throw new ValidationError(
      'Invalid DMS format. Expected: DD°MM\'SS.SS"N/S DD°MM\'SS.SS"E/W',
      'coordinates',
      dmsString
    )
  }

  const [, latDeg, latMin, latSec, latDir, lonDeg, lonMin, lonSec, lonDir] = match

  let lat = parseFloat(latDeg) + parseFloat(latMin) / 60 + parseFloat(latSec) / 3600
  let lon = parseFloat(lonDeg) + parseFloat(lonMin) / 60 + parseFloat(lonSec) / 3600

  if (latDir.toUpperCase() === 'S') lat = -lat
  if (lonDir.toUpperCase() === 'W') lon = -lon

  return parseDecimalCoordinates(lat, lon)
}

/**
 * Parse UTM coordinates (Easting, Northing)
 */
export function parseUTMCoordinates(
  easting: number | string,
  northing: number | string,
  zone: number = 35,
  hemisphere: 'N' | 'S' = 'S',
  options: CoordinateParseOptions = {}
): [number, number] {
  const eastingNum = typeof easting === 'string' ? parseFloat(easting) : easting
  const northingNum = typeof northing === 'string' ? parseFloat(northing) : northing

  if (isNaN(eastingNum) || isNaN(northingNum)) {
    throw new ValidationError('Invalid UTM coordinate format', 'coordinates', {
      easting,
      northing,
    })
  }

  // Validate UTM ranges (approximate for Zone 35S)
  if (eastingNum < 166000 || eastingNum > 834000) {
    throw new ValidationError(
      'UTM Easting out of valid range for Zone 35S',
      'easting',
      eastingNum
    )
  }

  if (hemisphere === 'S' && (northingNum < 0 || northingNum > 10000000)) {
    throw new ValidationError(
      'UTM Northing out of valid range for Zone 35S',
      'northing',
      northingNum
    )
  }

  const precision = options.precision ?? UTM_PRECISION
  return [
    parseFloat(eastingNum.toFixed(precision)),
    parseFloat(northingNum.toFixed(precision)),
  ]
}

/**
 * Transform coordinates between coordinate systems
 * Converts from source SRID to target SRID (default: SRID 32735)
 */
export function transformProjection(
  x: number,
  y: number,
  fromSrid: number = 4326,
  toSrid: number = DEFAULT_SRID
): [number, number] {
  try {
    const fromProj = `EPSG:${fromSrid}`
    const toProj = `EPSG:${toSrid}`

    // Ensure projections are defined
    if (!proj4.defs(fromProj)) {
      throw new ValidationError(`Unknown source SRID: ${fromSrid}`, 'fromSrid', fromSrid)
    }
    if (!proj4.defs(toProj)) {
      throw new ValidationError(`Unknown target SRID: ${toSrid}`, 'toSrid', toSrid)
    }

    // Call proj4 transform function - proj4 itself is the transform function
    const transformFn = (proj4 as any).default || proj4
    if (typeof transformFn !== 'function') {
      throw new ValidationError('proj4 transform function is not available', 'proj4', 'transform')
    }
    
    const [transformedX, transformedY] = transformFn(fromProj, toProj, [x, y])

    // Apply precision based on target SRID
    const precision = toSrid === DEFAULT_SRID ? UTM_PRECISION : LAT_LON_PRECISION

    return [
      parseFloat(transformedX.toFixed(precision)),
      parseFloat(transformedY.toFixed(precision)),
    ]
  } catch (error) {
    logger.error('Coordinate transformation failed', error as Error, {
      x,
      y,
      fromSrid,
      toSrid,
    })
    throw new ValidationError(
      `Failed to transform coordinates from SRID ${fromSrid} to SRID ${toSrid}`,
      'transformation',
      { x, y, fromSrid, toSrid }
    )
  }
}

/**
 * Transform Point geometry between coordinate systems
 */
export function transformPoint(
  point: Point,
  toSrid: number = DEFAULT_SRID
): Point {
  const currentSrid = point.crs?.properties.name
    ? parseInt(point.crs.properties.name.replace('EPSG:', ''))
    : DEFAULT_SRID

  if (currentSrid === toSrid) {
    return point
  }

  const [x, y] = point.coordinates
  const [transformedX, transformedY] = transformProjection(x, y, currentSrid, toSrid)

  return {
    type: 'Point',
    coordinates: [transformedX, transformedY],
    crs: {
      type: 'name',
      properties: {
        name: `EPSG:${toSrid}`,
      },
    },
  }
}

/**
 * Parse coordinates from CSV string
 * Expected format: "lat,lon" or "easting,northing" or header row
 */
export function parseCoordinatesFromCSV(
  csvString: string,
  options: CoordinateParseOptions = {}
): Array<[number, number]> {
  const lines = csvString.trim().split('\n')
  const coordinates: Array<[number, number]> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue // Skip empty lines and comments

    // Skip header row if present
    if (i === 0 && (line.includes('lat') || line.includes('lon') || line.includes('easting'))) {
      continue
    }

    const parts = line.split(',').map((p) => p.trim())
    if (parts.length < 2) {
      throw new ValidationError(
        `Invalid CSV format at line ${i + 1}: expected 2 values`,
        'csv',
        line
      )
    }

    const format = options.format || 'decimal'
    let coord: [number, number]

    if (format === 'utm') {
      coord = parseUTMCoordinates(parts[0], parts[1], 35, 'S', options)
    } else {
      coord = parseDecimalCoordinates(parts[0], parts[1], options)
    }

    coordinates.push(coord)
  }

  return coordinates
}

/**
 * Parse WKT (Well-Known Text) geometry string
 */
export function parseWKTGeometry(wktString: string): Geometry {
  try {
    const geometry = wellknown.parse(wktString)
    if (!geometry) {
      throw new ValidationError('Invalid WKT format', 'wkt', wktString)
    }

    // Convert to our Geometry type
    return geometry as Geometry
  } catch (error) {
    logger.error('WKT parsing failed', error as Error, { wktString })
    throw new ValidationError('Failed to parse WKT geometry', 'wkt', wktString)
  }
}

/**
 * Convert geometry to WKT string
 */
export function geometryToWKT(geometry: Geometry): string {
  try {
    return wellknown.stringify(geometry)
  } catch (error) {
    logger.error('WKT conversion failed', error as Error, { geometry })
    throw new ValidationError('Failed to convert geometry to WKT', 'geometry', geometry)
  }
}

/**
 * Validate geometry using PostGIS ST_IsValid
 * This function should be called server-side with database access
 */
export async function validateGeometryWithPostGIS(
  geometry: Geometry,
  supabaseClient: any // Supabase client type
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    const wkt = geometryToWKT(geometry)
    const srid = geometry.crs?.properties.name
      ? parseInt(geometry.crs.properties.name.replace('EPSG:', ''))
      : DEFAULT_SRID

    // Use PostGIS ST_IsValid function via RPC or direct SQL
    // Note: This requires a database function or direct SQL execution
    const { data, error } = await supabaseClient.rpc('st_isvalid', {
      geometry_wkt: wkt,
      srid: srid,
    })

    if (error) {
      // Fallback: try direct SQL if RPC doesn't exist
      logger.warn('ST_IsValid RPC not available, using fallback validation')
      return {
        isValid: validateGeometryBasic(geometry),
      }
    }

    return {
      isValid: data?.is_valid ?? false,
      reason: data?.reason,
    }
  } catch (error) {
    logger.error('PostGIS validation failed', error as Error, { geometry })
    // Fallback to basic validation
    return {
      isValid: validateGeometryBasic(geometry),
    }
  }
}

/**
 * Basic geometry validation (client-side, without PostGIS)
 * Checks structure and coordinate validity
 */
export function validateGeometryBasic(geometry: Geometry): boolean {
  if (!geometry.type || !geometry.coordinates) {
    return false
  }

  try {
    switch (geometry.type) {
      case 'Point':
        return (
          Array.isArray(geometry.coordinates) &&
          geometry.coordinates.length === 2 &&
          typeof geometry.coordinates[0] === 'number' &&
          typeof geometry.coordinates[1] === 'number' &&
          !isNaN(geometry.coordinates[0]) &&
          !isNaN(geometry.coordinates[1])
        )

      case 'LineString':
        return (
          Array.isArray(geometry.coordinates) &&
          geometry.coordinates.length >= 2 &&
          geometry.coordinates.every(
            (coord) =>
              Array.isArray(coord) &&
              coord.length >= 2 &&
              typeof coord[0] === 'number' &&
              typeof coord[1] === 'number'
          )
        )

      case 'Polygon':
        return (
          Array.isArray(geometry.coordinates) &&
          geometry.coordinates.length > 0 &&
          geometry.coordinates.every(
            (ring) =>
              Array.isArray(ring) &&
              ring.length >= 4 && // Minimum 4 points for closed ring
              ring.every(
                (coord) =>
                  Array.isArray(coord) &&
                  coord.length >= 2 &&
                  typeof coord[0] === 'number' &&
                  typeof coord[1] === 'number'
              )
          )
        )

      case 'MultiPolygon':
        return (
          Array.isArray(geometry.coordinates) &&
          geometry.coordinates.every(
            (polygon) =>
              Array.isArray(polygon) &&
              polygon.length > 0 &&
              polygon.every(
                (ring) =>
                  Array.isArray(ring) &&
                  ring.length >= 4 &&
                  ring.every(
                    (coord) =>
                      Array.isArray(coord) &&
                      coord.length >= 2 &&
                      typeof coord[0] === 'number' &&
                      typeof coord[1] === 'number'
                  )
              )
          )
        )

      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * Type guard to check if geometry is a Point
 */
export function isPoint(geometry: Geometry): geometry is Point {
  return geometry.type === 'Point'
}

/**
 * Type guard to check if geometry is a Polygon
 */
export function isPolygon(geometry: Geometry): geometry is Polygon {
  return geometry.type === 'Polygon'
}

/**
 * Type guard to check if geometry is a MultiPolygon
 */
export function isMultiPolygon(geometry: Geometry): geometry is MultiPolygon {
  return geometry.type === 'MultiPolygon'
}

/**
 * Create a Point from coordinates
 */
export function createPointFromCoordinates(
  x: number,
  y: number,
  srid: number = DEFAULT_SRID
): Point {
  const precision = srid === DEFAULT_SRID ? UTM_PRECISION : LAT_LON_PRECISION
  return {
    type: 'Point',
    coordinates: [
      parseFloat(x.toFixed(precision)),
      parseFloat(y.toFixed(precision)),
    ],
    crs: {
      type: 'name',
      properties: {
        name: `EPSG:${srid}`,
      },
    },
  }
}

/**
 * Create a Polygon from coordinate array
 */
export function createPolygonFromCoordinates(
  coordinates: Array<[number, number]>,
  srid: number = DEFAULT_SRID
): Polygon {
  if (coordinates.length < 4) {
    throw new ValidationError(
      'Polygon requires at least 4 coordinates (closed ring)',
      'coordinates',
      coordinates.length
    )
  }

  // Ensure polygon is closed (first and last coordinates match)
  const firstCoord = coordinates[0]
  const lastCoord = coordinates[coordinates.length - 1]
  const closedCoordinates = [...coordinates]
  if (
    firstCoord[0] !== lastCoord[0] ||
    firstCoord[1] !== lastCoord[1]
  ) {
    closedCoordinates.push([firstCoord[0], firstCoord[1]])
  }

  const precision = srid === DEFAULT_SRID ? UTM_PRECISION : LAT_LON_PRECISION
  const ring = closedCoordinates.map(([x, y]) => [
    parseFloat(x.toFixed(precision)),
    parseFloat(y.toFixed(precision)),
  ])

  return {
    type: 'Polygon',
    coordinates: [ring],
    crs: {
      type: 'name',
      properties: {
        name: `EPSG:${srid}`,
      },
    },
  }
}

