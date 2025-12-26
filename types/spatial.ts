/**
 * Spatial/GIS Type Definitions for PostGIS
 * 
 * These types correspond to PostGIS geometry and geography types
 * Used for spatial data operations in the APR system
 * 
 * SRID: 32735 (UTM Zone 35S - Zimbabwe)
 */

/**
 * Base geometry type matching PostGIS geometry
 */
export type GeometryType =
  | 'Point'
  | 'LineString'
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon'
  | 'GeometryCollection'

/**
 * Coordinate system reference (SRID)
 * Default: 32735 (UTM Zone 35S - Zimbabwe)
 */
export const DEFAULT_SRID = 32735

/**
 * GeoJSON Point geometry
 */
export interface Point {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude] or [x, y]
  crs?: {
    type: 'name'
    properties: {
      name: `EPSG:${number}`
    }
  }
}

/**
 * GeoJSON Polygon geometry
 */
export interface Polygon {
  type: 'Polygon'
  coordinates: number[][][] // Array of linear rings
  crs?: {
    type: 'name'
    properties: {
      name: `EPSG:${number}`
    }
  }
}

/**
 * GeoJSON MultiPolygon geometry
 */
export interface MultiPolygon {
  type: 'MultiPolygon'
  coordinates: number[][][][] // Array of polygons
  crs?: {
    type: 'name'
    properties: {
      name: `EPSG:${number}`
    }
  }
}

/**
 * GeoJSON LineString geometry
 */
export interface LineString {
  type: 'LineString'
  coordinates: number[][]
  crs?: {
    type: 'name'
    properties: {
      name: `EPSG:${number}`
    }
  }
}

/**
 * Union type for all geometry types
 */
export type Geometry = Point | Polygon | MultiPolygon | LineString

/**
 * Spatial reference system information
 */
export interface SpatialReference {
  srid: number
  name: string
  description?: string
}

/**
 * Bounding box (extent) of a geometry
 */
export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  srid?: number
}

/**
 * Spatial operation result
 */
export interface SpatialOperationResult {
  success: boolean
  result?: number | boolean | Geometry
  error?: string
}

/**
 * Common spatial operations
 */
export interface SpatialOperations {
  /**
   * Calculate distance between two geometries
   */
  distance(geom1: Geometry, geom2: Geometry): number

  /**
   * Check if geometry contains another
   */
  contains(container: Geometry, contained: Geometry): boolean

  /**
   * Check if geometries intersect
   */
  intersects(geom1: Geometry, geom2: Geometry): boolean

  /**
   * Get bounding box of geometry
   */
  boundingBox(geom: Geometry): BoundingBox

  /**
   * Transform geometry to different SRID
   */
  transform(geom: Geometry, targetSrid: number): Geometry
}

/**
 * Helper function to create a Point with SRID
 */
export function createPoint(
  x: number,
  y: number,
  srid: number = DEFAULT_SRID
): Point {
  return {
    type: 'Point',
    coordinates: [x, y],
    crs: {
      type: 'name',
      properties: {
        name: `EPSG:${srid}`,
      },
    },
  }
}

/**
 * Helper function to create a Polygon with SRID
 */
export function createPolygon(
  coordinates: number[][][],
  srid: number = DEFAULT_SRID
): Polygon {
  return {
    type: 'Polygon',
    coordinates,
    crs: {
      type: 'name',
      properties: {
        name: `EPSG:${srid}`,
      },
    },
  }
}

/**
 * Validate geometry structure
 */
export function isValidGeometry(geom: Geometry): boolean {
  if (!geom.type || !geom.coordinates) {
    return false
  }

  switch (geom.type) {
    case 'Point':
      return Array.isArray(geom.coordinates) && geom.coordinates.length === 2
    case 'LineString':
      return (
        Array.isArray(geom.coordinates) &&
        geom.coordinates.length >= 2 &&
        geom.coordinates.every((coord) => Array.isArray(coord) && coord.length >= 2)
      )
    case 'Polygon':
      return (
        Array.isArray(geom.coordinates) &&
        geom.coordinates.length > 0 &&
        geom.coordinates.every((ring) => Array.isArray(ring) && ring.length >= 4)
      )
    case 'MultiPolygon':
      return (
        Array.isArray(geom.coordinates) &&
        geom.coordinates.every((poly) =>
          Array.isArray(poly) &&
          poly.length > 0 &&
          poly.every((ring) => Array.isArray(ring) && ring.length >= 4)
        )
      )
    default:
      return false
  }
}

