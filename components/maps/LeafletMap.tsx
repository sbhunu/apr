/**
 * Leaflet Map Component
 * Base interactive map component using react-leaflet
 */

'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface LeafletMapProps {
  center: [number, number] // [latitude, longitude]
  zoom?: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onMapReady?: (map: L.Map) => void
}

/**
 * Map controller component to expose map instance
 */
function MapController({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap()

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  return null
}

/**
 * Leaflet Map Component
 */
export function LeafletMap({
  center,
  zoom = 13,
  children,
  className = '',
  style,
  onMapReady,
}: LeafletMapProps) {
  return (
    <div className={`w-full h-full ${className}`} style={style}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
        {onMapReady && <MapController onMapReady={onMapReady} />}
      </MapContainer>
    </div>
  )
}

