/**
 * Scheme Overlay Component
 * Displays proposed scheme boundaries and sections
 */

'use client'

import { useEffect } from 'react'
import { useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, GeoJsonProperties, Geometry as GeoJsonGeometry } from 'geojson'

type GeoJSONType = Feature<GeoJsonGeometry, GeoJsonProperties>

interface SchemeOverlayProps {
  parentLand?: GeoJSONType
  proposedSections?: GeoJSONType[]
  onSectionClick?: (section: GeoJSONType) => void
  highlightSectionId?: string
  parentLandStyle?: L.PathOptions
  sectionStyle?: L.PathOptions
}

/**
 * Scheme Overlay Component
 */
export function SchemeOverlay({
  parentLand,
  proposedSections = [],
  onSectionClick,
  highlightSectionId,
  parentLandStyle = {
    color: '#00ff00',
    weight: 3,
    opacity: 0.8,
    fillColor: '#00ff00',
    fillOpacity: 0.1,
    dashArray: '10, 5',
  },
  sectionStyle = {
    color: '#ff8800',
    weight: 2,
    opacity: 0.9,
    fillColor: '#ff8800',
    fillOpacity: 0.3,
  },
}: SchemeOverlayProps) {
  const map = useMap()

  // Fit map bounds to scheme
  useEffect(() => {
    const bounds = L.latLngBounds([])

    if (parentLand) {
      if (
        parentLand.geometry.type === 'Polygon' ||
        parentLand.geometry.type === 'MultiPolygon'
      ) {
        const geoJsonLayer = L.geoJSON(parentLand.geometry as any)
        bounds.extend(geoJsonLayer.getBounds())
      }
    }

    proposedSections.forEach((section) => {
      if (section.geometry.type === 'Polygon' || section.geometry.type === 'MultiPolygon') {
        const geoJsonLayer = L.geoJSON(section.geometry as any)
        bounds.extend(geoJsonLayer.getBounds())
      }
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [parentLand, proposedSections, map])

  // Style function for sections
  const sectionStyleFunc = (feature: any) => {
    const isHighlighted = highlightSectionId && feature.properties?.id === highlightSectionId

    return {
      ...sectionStyle,
      color: isHighlighted ? '#ff0000' : sectionStyle.color,
      weight: isHighlighted ? 4 : sectionStyle.weight,
      fillOpacity: isHighlighted ? 0.5 : sectionStyle.fillOpacity,
    }
  }

  // Click handler for sections
  const onEachSection = (feature: any, layer: L.Layer) => {
    if (onSectionClick) {
      layer.on({
        click: () => {
          onSectionClick(feature)
        },
      })
    }

    // Add popup with section info
    if (feature.properties) {
      const props = feature.properties
      const popupContent = `
        <div>
          <strong>Section:</strong> ${props.sectionNumber || props.id || 'N/A'}<br/>
          ${props.area ? `<strong>Area:</strong> ${props.area.toFixed(2)} m²<br/>` : ''}
          ${props.quota ? `<strong>Quota:</strong> ${props.quota.toFixed(4)}%<br/>` : ''}
        </div>
      `
      layer.bindPopup(popupContent)
    }
  }

  return (
    <>
      {/* Parent land boundary */}
      {parentLand && (
        <GeoJSON
          data={parentLand as any}
          style={parentLandStyle}
          onEachFeature={(feature, layer) => {
            if (feature.properties) {
              const props = feature.properties
              const popupContent = `
                <div>
                  <strong>Parent Land</strong><br/>
                  ${props.name ? `<strong>Name:</strong> ${props.name}<br/>` : ''}
                  ${props.area ? `<strong>Area:</strong> ${props.area.toFixed(2)} m²<br/>` : ''}
                </div>
              `
              layer.bindPopup(popupContent)
            }
          }}
        />
      )}

      {/* Proposed sections */}
      {proposedSections.map((section, index) => (
        <GeoJSON
          key={section.properties?.id || section.properties?.sectionNumber || index}
          data={section as any}
          style={sectionStyleFunc}
          onEachFeature={onEachSection}
        />
      ))}
    </>
  )
}

