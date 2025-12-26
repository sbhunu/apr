/**
 * Parcel Layer Component
 * Displays cadastral parcels from PostGIS
 */

'use client'

import { useEffect, useMemo } from 'react'
import { useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, GeoJsonProperties, Geometry as GeoJsonGeometry } from 'geojson'

type GeoJSONType = Feature<GeoJsonGeometry, GeoJsonProperties>

interface ParcelLayerProps {
  parcels: GeoJSONType[]
  onParcelClick?: (parcel: GeoJSONType) => void
  highlightParcelId?: string
  style?: L.PathOptions
}

/**
 * Parcel Layer Component
 */
export function ParcelLayer({
  parcels,
  onParcelClick,
  highlightParcelId,
  style = {
    color: '#3388ff',
    weight: 2,
    opacity: 0.8,
    fillColor: '#3388ff',
    fillOpacity: 0.2,
  },
}: ParcelLayerProps) {
  const map = useMap()

  // Fit map bounds to parcels
  useEffect(() => {
    if (parcels.length === 0) return

    const bounds = L.latLngBounds([])
    parcels.forEach((parcel) => {
      if (parcel.geometry.type === 'Polygon' || parcel.geometry.type === 'MultiPolygon') {
        const geoJsonLayer = L.geoJSON(parcel.geometry as any)
        bounds.extend(geoJsonLayer.getBounds())
      }
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [parcels, map])

  // Style function for parcels
  const parcelStyle = (feature: any) => {
    const isHighlighted = highlightParcelId && feature.properties?.id === highlightParcelId

    return {
      ...style,
      color: isHighlighted ? '#ff0000' : style.color,
      weight: isHighlighted ? 4 : style.weight,
      fillOpacity: isHighlighted ? 0.4 : style.fillOpacity,
    }
  }

  // Click handler
  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (onParcelClick) {
      layer.on({
        click: () => {
          onParcelClick(feature)
        },
      })
    }

    // Add popup with parcel info
    if (feature.properties) {
      const props = feature.properties
      const popupContent = `
        <div>
          <strong>Parcel ID:</strong> ${props.id || 'N/A'}<br/>
          ${props.name ? `<strong>Name:</strong> ${props.name}<br/>` : ''}
          ${props.area ? `<strong>Area:</strong> ${props.area.toFixed(2)} m²<br/>` : ''}
        </div>
      `
      layer.bindPopup(popupContent)
    }
  }

  return (
    <>
      {parcels.map((parcel, index) => (
        <GeoJSON
          key={parcel.properties?.id || index}
          data={parcel as any}
          style={parcelStyle}
          onEachFeature={onEachFeature}
        />
      ))}
    </>
  )
}

