/**
 * Geometry Map Preview Component
 * Displays parsed coordinates on a Leaflet map
 */

'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ParsedCoordinate } from '@/lib/survey/coordinate-parser'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface GeometryMapPreviewProps {
  coordinates: ParsedCoordinate[]
  center?: [number, number]
  zoom?: number
  height?: string
}

function MapFitBounds({ coordinates }: { coordinates: ParsedCoordinate[] }) {
  const map = useMap()

  useEffect(() => {
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(
        coordinates.map((c) => [c.y, c.x] as [number, number])
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [coordinates, map])

  return null
}

export function GeometryMapPreview({
  coordinates,
  center,
  zoom = 13,
  height = '400px',
}: GeometryMapPreviewProps) {
  const mapRef = useRef<L.Map | null>(null)

  if (coordinates.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No coordinates to display</p>
      </div>
    )
  }

  // Convert coordinates to lat/lon for display (assuming UTM input)
  // For display purposes, we'll use the coordinates as-is if they look like lat/lon
  // Otherwise, we'd need to transform from UTM to lat/lon
  const polygonCoords = coordinates.map((c) => [c.y, c.x] as [number, number])

  // Calculate center if not provided
  const mapCenter: [number, number] = center || [
    coordinates.reduce((sum, c) => sum + c.y, 0) / coordinates.length,
    coordinates.reduce((sum, c) => sum + c.x, 0) / coordinates.length,
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Geometry Preview</h3>
        <span className="text-sm text-muted-foreground">
          {coordinates.length} vertices
        </span>
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ height }}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFitBounds coordinates={coordinates} />
          {coordinates.length >= 3 && (
            <Polygon
              positions={polygonCoords}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}

