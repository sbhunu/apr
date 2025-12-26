/**
 * Validation Error Map Component
 * Visualizes validation errors on a Leaflet map
 */

'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ErrorLocation } from '@/lib/survey/topology-validation-service'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface ValidationMapProps {
  errorLocations: ErrorLocation[]
}

function MapFitBounds({ errorLocations }: { errorLocations: ErrorLocation[] }) {
  const map = useMap()

  useEffect(() => {
    if (errorLocations.length > 0) {
      const bounds = L.latLngBounds(
        errorLocations.flatMap((loc) =>
          loc.coordinates.map((c) => [c.y, c.x] as [number, number])
        )
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [errorLocations, map])

  return null
}

export function ValidationMap({ errorLocations }: ValidationMapProps) {
  if (errorLocations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">No error locations to display</p>
      </div>
    )
  }

  // Calculate center point
  const allCoords = errorLocations.flatMap((loc) => loc.coordinates)
  const center: [number, number] =
    allCoords.length > 0
      ? [
          allCoords.reduce((sum, c) => sum + c.y, 0) / allCoords.length,
          allCoords.reduce((sum, c) => sum + c.x, 0) / allCoords.length,
        ]
      : [-17.825, 31.033]

  return (
    <div className="rounded-lg border overflow-hidden" style={{ height: '500px' }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFitBounds errorLocations={errorLocations} />

        {/* Render error locations */}
        {errorLocations.map((location, index) => {
          if (location.type === 'point' && location.coordinates.length === 1) {
            const coord = location.coordinates[0]
            return (
              <Marker
                key={index}
                position={[coord.y, coord.x]}
                icon={L.divIcon({
                  className: 'error-marker',
                  html: `<div style="background-color: red; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                  iconSize: [12, 12],
                })}
              />
            )
          } else if (location.type === 'polygon' && location.coordinates.length >= 3) {
            const polygonCoords = location.coordinates.map(
              (c) => [c.y, c.x] as [number, number]
            )
            return (
              <Polygon
                key={index}
                positions={polygonCoords}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.3,
                  weight: 2,
                }}
              />
            )
          }
          return null
        })}
      </MapContainer>
    </div>
  )
}

