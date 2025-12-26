/**
 * Coordinate File Parser
 * Parses coordinate files (CSV, shapefile) and converts to standard format
 */

import {
  parseDecimalCoordinates,
  parseUTMCoordinates,
  parseDMSCoordinates,
  transformProjection,
  parseWKTGeometry,
} from '@/lib/spatial/geometry'
import { computeClosure, COGOPoint } from '@/lib/spatial/cogo'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { DEFAULT_SRID } from '@/types/spatial'

/**
 * Supported coordinate file formats
 */
export type CoordinateFileFormat = 'csv' | 'shapefile' | 'kml' | 'geojson'

/**
 * Parsed coordinate point
 */
export interface ParsedCoordinate {
  id?: string
  pointNumber?: string
  x: number
  y: number
  z?: number
  description?: string
  originalFormat?: string
}

/**
 * Coordinate file parsing result
 */
export interface CoordinateParseResult {
  success: boolean
  coordinates: ParsedCoordinate[]
  format: CoordinateFileFormat
  datum?: string
  projection?: string
  errors?: string[]
  warnings?: string[]
  closureResult?: {
    closureError: number
    closureErrorRatio: number
    isWithinTolerance: boolean
  }
}

/**
 * CSV parsing options
 */
export interface CSVParsingOptions {
  hasHeader?: boolean
  xColumn?: number | string
  yColumn?: number | string
  zColumn?: number | string
  idColumn?: number | string
  descriptionColumn?: number | string
  coordinateFormat?: 'decimal' | 'utm' | 'dms'
  delimiter?: string
  skipRows?: number
}

/**
 * Parse CSV coordinate file
 */
export function parseCSVCoordinates(
  csvContent: string,
  options: CSVParsingOptions = {}
): CoordinateParseResult {
  const {
    hasHeader = true,
    xColumn = 0,
    yColumn = 1,
    zColumn,
    idColumn,
    descriptionColumn,
    coordinateFormat = 'decimal',
    delimiter = ',',
    skipRows = 0,
  } = options

  const errors: string[] = []
  const warnings: string[] = []
  const coordinates: ParsedCoordinate[] = []

  try {
    const lines = csvContent.split('\n').filter((line) => line.trim())
    let startIndex = skipRows

    // Skip header if present
    if (hasHeader && startIndex === 0) {
      startIndex = 1
    }

    // Process each line
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(delimiter).map((p) => p.trim())

      // Get column indices
      const xIdx =
        typeof xColumn === 'string'
          ? parts.findIndex((p) => p.toLowerCase() === xColumn.toLowerCase())
          : xColumn
      const yIdx =
        typeof yColumn === 'string'
          ? parts.findIndex((p) => p.toLowerCase() === yColumn.toLowerCase())
          : yColumn

      if (xIdx < 0 || yIdx < 0 || xIdx >= parts.length || yIdx >= parts.length) {
        errors.push(`Line ${i + 1}: Missing X or Y coordinate`)
        continue
      }

      try {
        let x: number, y: number

        // Parse coordinates based on format
        if (coordinateFormat === 'decimal') {
          ;[y, x] = parseDecimalCoordinates(parts[yIdx], parts[xIdx])
        } else if (coordinateFormat === 'utm') {
          const utmMatch = parts[xIdx].match(/^(\d+)([A-Z])\s+(\d+\.?\d*)$/i)
          if (!utmMatch) {
            throw new ValidationError('Invalid UTM format', 'coordinates', parts[xIdx])
          }
          ;[x, y] = parseUTMCoordinates(
            parseInt(utmMatch[1]),
            utmMatch[2],
            parseFloat(utmMatch[3]),
            parts[yIdx]
          )
        } else if (coordinateFormat === 'dms') {
          ;[y, x] = parseDMSCoordinates(`${parts[yIdx]} ${parts[xIdx]}`)
        } else {
          throw new ValidationError('Unsupported coordinate format', 'format', coordinateFormat)
        }

        const coord: ParsedCoordinate = {
          x,
          y,
          pointNumber: idColumn !== undefined ? parts[idColumn] : String(i - startIndex + 1),
        }

        // Add Z coordinate if present
        if (zColumn !== undefined && parts[zColumn]) {
          coord.z = parseFloat(parts[zColumn])
        }

        // Add description if present
        if (descriptionColumn !== undefined && parts[descriptionColumn]) {
          coord.description = parts[descriptionColumn]
        }

        coord.originalFormat = coordinateFormat
        coordinates.push(coord)
      } catch (error) {
        errors.push(
          `Line ${i + 1}: ${error instanceof Error ? error.message : 'Invalid coordinate format'}`
        )
      }
    }

    // Validate closure if we have enough points (minimum 3 for a polygon)
    let closureResult: CoordinateParseResult['closureResult'] | undefined
    if (coordinates.length >= 3) {
      try {
        // Convert to COGO points
        const cogoPoints: COGOPoint[] = coordinates.map((c) => ({
          x: c.x,
          y: c.y,
          id: c.pointNumber,
        }))

        // Check if polygon is closed (first and last points match)
        const firstPoint = cogoPoints[0]
        const lastPoint = cogoPoints[cogoPoints.length - 1]
        const isClosed =
          Math.abs(firstPoint.x - lastPoint.x) < 0.001 &&
          Math.abs(firstPoint.y - lastPoint.y) < 0.001

        if (!isClosed) {
          warnings.push('Polygon is not closed. First and last points do not match.')
        }

        // Compute closure error
        const closure = computeClosure(cogoPoints)
        closureResult = {
          closureError: closure.closureError,
          closureErrorRatio: closure.closureErrorRatio,
          isWithinTolerance: closure.isWithinTolerance,
        }

        if (!closure.isWithinTolerance) {
          warnings.push(
            `Closure error exceeds tolerance (1:10,000). Error ratio: 1:${Math.round(closure.closureErrorRatio)}`
          )
        }
      } catch (error) {
        warnings.push(
          `Closure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return {
      success: errors.length === 0,
      coordinates,
      format: 'csv',
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      closureResult,
    }
  } catch (error) {
    logger.error('CSV parsing failed', error as Error)
    return {
      success: false,
      coordinates: [],
      format: 'csv',
      errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
    }
  }
}

/**
 * Transform coordinates to UTM Zone 35S (SRID 32735)
 */
export async function transformCoordinatesToUTM(
  coordinates: ParsedCoordinate[],
  sourceSRID: number = 4326 // Default to WGS84
): Promise<ParsedCoordinate[]> {
  if (sourceSRID === DEFAULT_SRID) {
    // Already in UTM Zone 35S
    return coordinates
  }

  try {
    const transformed = await Promise.all(
      coordinates.map(async (coord) => {
        const [x, y] = await transformProjection(
          coord.x,
          coord.y,
          sourceSRID,
          DEFAULT_SRID
        )

        return {
          ...coord,
          x,
          y,
        }
      })
    )

    return transformed
  } catch (error) {
    logger.error('Coordinate transformation failed', error as Error)
    throw new ValidationError(
      'Failed to transform coordinates to UTM Zone 35S',
      'transformation',
      { sourceSRID, targetSRID: DEFAULT_SRID }
    )
  }
}

/**
 * Convert parsed coordinates to WKT Polygon
 */
export function coordinatesToWKTPolygon(coordinates: ParsedCoordinate[]): string {
  if (coordinates.length < 3) {
    throw new ValidationError(
      'At least 3 coordinates required for a polygon',
      'coordinates',
      { count: coordinates.length }
    )
  }

  // Ensure polygon is closed
  const coords = [...coordinates]
  const first = coords[0]
  const last = coords[coords.length - 1]

  if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
    // Close the polygon
    coords.push({ ...first })
  }

  // Format as WKT POLYGON
  const coordString = coords.map((c) => `${c.x} ${c.y}`).join(', ')
  return `POLYGON((${coordString}))`
}

/**
 * Validate coordinate file format
 */
export function validateCoordinateFile(
  file: File
): { valid: boolean; format?: CoordinateFileFormat; error?: string } {
  const fileName = file.name.toLowerCase()
  const fileExtension = fileName.split('.').pop()

  if (!fileExtension) {
    return { valid: false, error: 'File has no extension' }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)` }
  }

  // Check format
  switch (fileExtension) {
    case 'csv':
      return { valid: true, format: 'csv' }
    case 'shp':
    case 'zip': // Shapefile is often zipped
      return { valid: true, format: 'shapefile' }
    case 'kml':
      return { valid: true, format: 'kml' }
    case 'geojson':
    case 'json':
      return { valid: true, format: 'geojson' }
    default:
      return {
        valid: false,
        error: `Unsupported file format: .${fileExtension}. Supported formats: CSV, Shapefile, KML, GeoJSON`,
      }
  }
}

