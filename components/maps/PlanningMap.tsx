/**
 * Planning Map Component
 * Complete GIS visualization component for planning module
 */

'use client'

import { useState, useCallback } from 'react'
import { LeafletMap } from './LeafletMap'
import { ParcelLayer } from './ParcelLayer'
import { SchemeOverlay } from './SchemeOverlay'
import { MeasurementTool } from './MeasurementTool'
import { LayerControl } from './LayerControl'
import type { Feature, GeoJsonProperties, Geometry as GeoJsonGeometry } from 'geojson'

type GeoJSONFeature = Feature<GeoJsonGeometry, GeoJsonProperties>

interface PlanningMapProps {
  center?: [number, number] // Default center for Zimbabwe
  zoom?: number
  cadastralParcels?: GeoJSONFeature[]
  parentLand?: GeoJSONFeature
  proposedSections?: GeoJSONFeature[]
  onParcelClick?: (parcel: GeoJSONFeature) => void
  onSectionClick?: (section: GeoJSONFeature) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Planning Map Component
 * Main component for GIS visualization in planning module
 */
export function PlanningMap({
  center = [-17.8292, 31.0522], // Harare, Zimbabwe
  zoom = 13,
  cadastralParcels = [],
  parentLand,
  proposedSections = [],
  onParcelClick,
  onSectionClick,
  className = '',
  style,
}: PlanningMapProps) {
  const [cadastralVisible, setCadastralVisible] = useState(true)
  const [schemeVisible, setSchemeVisible] = useState(true)
  const [measurementEnabled, setMeasurementEnabled] = useState(false)
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area' | 'none'>('none')

  const handleMeasurementComplete = useCallback(
    (result: { type: 'distance' | 'area'; value: number; unit: string }) => {
      console.log('Measurement:', result)
      // Could show a toast or update state
    },
    []
  )

  const layers = [
    {
      id: 'cadastral',
      name: 'Cadastral Parcels',
      visible: cadastralVisible,
      onToggle: setCadastralVisible,
    },
    {
      id: 'scheme',
      name: 'Proposed Scheme',
      visible: schemeVisible,
      onToggle: setSchemeVisible,
    },
  ]

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <LeafletMap center={center} zoom={zoom} className={className} style={style}>
        {/* Cadastral parcels layer */}
        {cadastralVisible && cadastralParcels.length > 0 && (
          <ParcelLayer parcels={cadastralParcels} onParcelClick={onParcelClick} />
        )}

        {/* Scheme overlay */}
        {schemeVisible && (
          <SchemeOverlay
            parentLand={parentLand}
            proposedSections={proposedSections}
            onSectionClick={onSectionClick}
          />
        )}

        {/* Measurement tool */}
        <MeasurementTool
          enabled={measurementEnabled}
          mode={measurementMode}
          onMeasurementComplete={handleMeasurementComplete}
        />
      </LeafletMap>

      {/* Layer control */}
      <LayerControl layers={layers} />

      {/* Measurement controls */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMeasurementEnabled(!measurementEnabled)
              setMeasurementMode(measurementEnabled ? 'none' : 'distance')
            }}
            className={`px-3 py-2 rounded bg-white shadow text-sm ${
              measurementMode === 'distance' ? 'bg-blue-500 text-white' : ''
            }`}
          >
            Measure Distance
          </button>
          <button
            onClick={() => {
              setMeasurementEnabled(!measurementEnabled)
              setMeasurementMode(measurementEnabled ? 'none' : 'area')
            }}
            className={`px-3 py-2 rounded bg-white shadow text-sm ${
              measurementMode === 'area' ? 'bg-blue-500 text-white' : ''
            }`}
          >
            Measure Area
          </button>
        </div>
      </div>
    </div>
  )
}

