import type { Feature, Geometry } from 'geojson'

/**
 * Convert a PostGIS geometry value into a GeoJSON Feature that can be consumed by the map.
 */
export function toGeoJsonFeature(geometry: unknown): Feature<Geometry> | null {
  if (!geometry) {
    return null
  }

  if (typeof geometry === 'string') {
    try {
      const parsed = JSON.parse(geometry)
      if (parsed?.type && parsed?.coordinates) {
        return {
          type: 'Feature',
          properties: {},
          geometry: parsed as Geometry,
        }
      }
    } catch {
      return null
    }
  }

  if (typeof geometry === 'object' && geometry !== null && 'type' in geometry && 'coordinates' in geometry) {
    return {
      type: 'Feature',
      properties: {},
      geometry: geometry as Geometry,
    }
  }

  return null
}

