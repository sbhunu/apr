/**
 * Measurement Tool Component
 * Adds measurement tools to the map (distance, area)
 */

'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

interface MeasurementToolProps {
  enabled: boolean
  mode?: 'distance' | 'area' | 'none'
  onMeasurementComplete?: (result: { type: 'distance' | 'area'; value: number; unit: string }) => void
}

/**
 * Measurement Tool Component
 */
export function MeasurementTool({
  enabled,
  mode = 'distance',
  onMeasurementComplete,
}: MeasurementToolProps) {
  const map = useMap()
  const polylineRef = useRef<L.Polyline | null>(null)
  const polygonRef = useRef<L.Polygon | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    if (!enabled || mode === 'none') {
      // Clean up
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
        polylineRef.current = null
      }
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current)
        polygonRef.current = null
      }
      markersRef.current.forEach((marker) => map.removeLayer(marker))
      markersRef.current = []
      return
    }

    const points: L.LatLng[] = []
    let isDrawing = false

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) {
        isDrawing = true
        points.length = 0
      }

      points.push(e.latlng)

      // Add marker
      const marker = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'measurement-marker',
          html: `<div style="background: #ff0000; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [8, 8],
        }),
      }).addTo(map)
      markersRef.current.push(marker)

      // Update polyline/polygon
      if (mode === 'distance') {
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current)
        }
        polylineRef.current = L.polyline(points, {
          color: '#ff0000',
          weight: 2,
        }).addTo(map)

        // Calculate distance
        if (points.length >= 2) {
          let totalDistance = 0
          for (let i = 1; i < points.length; i++) {
            totalDistance += points[i - 1].distanceTo(points[i])
          }
          const distanceKm = totalDistance / 1000
          const distanceM = totalDistance

          // Update popup
          const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`Distance: ${distanceM.toFixed(2)} m (${distanceKm.toFixed(4)} km)`)
            .openOn(map)
        }
      } else if (mode === 'area') {
        if (polygonRef.current) {
          map.removeLayer(polygonRef.current)
        }
        if (points.length >= 3) {
          polygonRef.current = L.polygon(points, {
            color: '#ff0000',
            weight: 2,
            fillColor: '#ff0000',
            fillOpacity: 0.3,
          }).addTo(map)

          // Calculate area (approximate, using spherical approximation)
          const area = (L as any).GeometryUtil?.geodesicArea
            ? (L as any).GeometryUtil.geodesicArea(points)
            : 0
          const areaM2 = area
          const areaHa = area / 10000

          // Update popup
          const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`Area: ${areaM2.toFixed(2)} m² (${areaHa.toFixed(4)} ha)`)
            .openOn(map)
        }
      }
    }

    const handleMapDoubleClick = () => {
      // Finish measurement
      if (mode === 'distance' && points.length >= 2) {
        let totalDistance = 0
        for (let i = 1; i < points.length; i++) {
          totalDistance += points[i - 1].distanceTo(points[i])
        }
        onMeasurementComplete?.({
          type: 'distance',
          value: totalDistance,
          unit: 'meters',
        })
      } else if (mode === 'area' && points.length >= 3) {
        const area = (L as any).GeometryUtil?.geodesicArea
          ? (L as any).GeometryUtil.geodesicArea(points)
          : 0
        onMeasurementComplete?.({
          type: 'area',
          value: area,
          unit: 'square meters',
        })
      }

      // Reset
      isDrawing = false
      points.length = 0
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
        polylineRef.current = null
      }
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current)
        polygonRef.current = null
      }
      markersRef.current.forEach((marker) => map.removeLayer(marker))
      markersRef.current = []
    }

    map.on('click', handleMapClick)
    map.on('dblclick', handleMapDoubleClick)

    return () => {
      map.off('click', handleMapClick)
      map.off('dblclick', handleMapDoubleClick)
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current)
      }
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current)
      }
      markersRef.current.forEach((marker) => map.removeLayer(marker))
    }
  }, [map, enabled, mode, onMeasurementComplete])

  return null
}

// Add GeometryUtil if not available
if (typeof window !== 'undefined' && !(L as any).GeometryUtil) {
  // Simple geodesic area calculation
  ;(L as any).GeometryUtil = {
    geodesicArea: (latlngs: L.LatLng[]): number => {
      // Spherical approximation using shoelace formula
      let area = 0
      for (let i = 0; i < latlngs.length; i++) {
        const j = (i + 1) % latlngs.length
        area +=
          (latlngs[j].lng - latlngs[i].lng) *
          (2 + Math.sin((latlngs[i].lat * Math.PI) / 180) + Math.sin((latlngs[j].lat * Math.PI) / 180))
      }
      return Math.abs((area * 6378137 * 6378137) / 2)
    },
  }
}

