/**
 * Deeds Map Component for Module 4
 * GIS viewer for displaying property location, section boundaries, and scheme layout
 */

'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Feature, Geometry } from 'geojson'

// Dynamically import Leaflet components to avoid SSR issues
const LeafletMap = dynamic(() => import('@/components/maps/LeafletMap').then((mod) => ({ default: mod.LeafletMap })), {
  ssr: false,
})

const SchemeOverlay = dynamic(() => import('@/components/maps/SchemeOverlay').then((mod) => ({ default: mod.SchemeOverlay })), {
  ssr: false,
})

const MeasurementTool = dynamic(() => import('@/components/maps/MeasurementTool').then((mod) => ({ default: mod.MeasurementTool })), {
  ssr: false,
})

// Dynamically import LayerControl to avoid SSR issues
const LayerControl = dynamic(() => import('@/components/maps/LayerControl').then((mod) => ({ default: mod.LayerControl })), {
  ssr: false,
})

interface DeedsMapProps {
  schemeId: string
  highlightSectionId?: string
  onSectionClick?: (sectionId: string, sectionNumber: string) => void
  className?: string
  style?: React.CSSProperties
  showMeasurement?: boolean
}

/**
 * Deeds Map Component
 * Displays scheme geometry with sections for Module 4 workflows
 */
export function DeedsMap({
  schemeId,
  highlightSectionId,
  onSectionClick,
  className = '',
  style,
  showMeasurement = false,
}: DeedsMapProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [parentParcel, setParentParcel] = useState<Feature<Geometry> | undefined>()
  const [sections, setSections] = useState<Feature<Geometry>[]>([])
  const [center, setCenter] = useState<[number, number]>([-17.8292, 31.0522]) // Harare default
  const [schemeInfo, setSchemeInfo] = useState<{ number: string; name: string } | null>(null)
  const [cadastralVisible, setCadastralVisible] = useState(false)
  const [schemeVisible, setSchemeVisible] = useState(true)
  const [measurementEnabled, setMeasurementEnabled] = useState(false)
  const [measurementMode, setMeasurementMode] = useState<'distance' | 'area' | 'none'>('none')

  useEffect(() => {
    loadSchemeGeometry()
  }, [schemeId])

  async function loadSchemeGeometry() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/deeds/schemes/${schemeId}/geometry`)
      const data = await response.json()

      if (data.success && data.data) {
        const geoData = data.data
        setParentParcel(geoData.parentParcel)
        setSections(
          geoData.sections
            .map((s: any) => s.geometry)
            .filter((g: Feature<Geometry> | undefined): g is Feature<Geometry> => g !== undefined)
        )
        if (geoData.center) {
          setCenter(geoData.center)
        }
        setSchemeInfo({
          number: geoData.schemeNumber,
          name: geoData.schemeName,
        })
      } else {
        setError(data.error || 'Failed to load scheme geometry')
      }
    } catch (err) {
      setError('Failed to load scheme geometry')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSectionClick = (feature: Feature<Geometry>) => {
    if (onSectionClick && feature.properties) {
      const sectionId = feature.properties.id as string
      const sectionNumber = (feature.properties.sectionNumber || feature.properties.section_number) as string
      onSectionClick(sectionId, sectionNumber)
    }
  }

  const handleMeasurementComplete = (result: { type: 'distance' | 'area'; value: number; unit: string }) => {
    console.log('Measurement:', result)
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={style}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={style}>
        <div className="text-center text-destructive">
          <p className="font-medium">Error loading map</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const layers = [
    {
      id: 'scheme',
      name: 'Scheme Layout',
      visible: schemeVisible,
      onToggle: setSchemeVisible,
    },
  ]

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <LeafletMap center={center} zoom={15} className={className} style={style}>
        {/* Scheme overlay with parent parcel and sections */}
        {schemeVisible && (
          <SchemeOverlay
            parentLand={parentParcel}
            proposedSections={sections}
            onSectionClick={handleSectionClick}
            highlightSectionId={highlightSectionId}
            parentLandStyle={{
              color: '#0066cc',
              weight: 3,
              opacity: 0.8,
              fillColor: '#0066cc',
              fillOpacity: 0.15,
              dashArray: '10, 5',
            }}
            sectionStyle={{
              color: '#ff6600',
              weight: 2,
              opacity: 0.9,
              fillColor: '#ff6600',
              fillOpacity: 0.25,
            }}
          />
        )}

        {/* Measurement tool */}
        {showMeasurement && (
          <MeasurementTool
            enabled={measurementEnabled}
            mode={measurementMode}
            onMeasurementComplete={handleMeasurementComplete}
          />
        )}
      </LeafletMap>

      {/* Layer control */}
      <LayerControl layers={layers} />

      {/* Scheme info overlay */}
      {schemeInfo && (
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <h3 className="font-semibold text-sm">{schemeInfo.name}</h3>
          <p className="text-xs text-muted-foreground">Scheme: {schemeInfo.number}</p>
          <p className="text-xs text-muted-foreground mt-1">{sections.length} sections</p>
        </div>
      )}

      {/* Measurement controls */}
      {showMeasurement && (
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
      )}
    </div>
  )
}

