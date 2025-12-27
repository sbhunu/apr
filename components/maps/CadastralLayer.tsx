/**
 * Cadastral Layer Component
 * Displays cadastral parcels from PostGIS as an overlay layer
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import type { FeatureCollection, Feature, GeoJsonProperties, Geometry as GeoJsonGeometry } from 'geojson'

type GeoJSONType = Feature<GeoJsonGeometry, GeoJsonProperties>

interface CadastralLayerProps {
  visible: boolean
  onLoadComplete?: (count: number) => void
  onError?: (error: string) => void
}

/**
 * Cadastral Layer Component
 * Fetches and displays cadastral parcels based on current map bounds
 */
export function CadastralLayer({ visible, onLoadComplete, onError }: CadastralLayerProps) {
  const map = useMap()
  const [parcels, setParcels] = useState<GeoJSONType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch cadastral parcels when map bounds change
  useEffect(() => {
    if (!visible) {
      setParcels([])
      return
    }

    const fetchCadastralData = async () => {
      setLoading(true)
      setError(null)

      try {
        const bounds = map.getBounds()
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`
        
        const response = await fetch(`/api/property/cadastral?bbox=${bbox}`)
        const data = await response.json()

        if (data.error && !data.features) {
          throw new Error(data.error)
        }

        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          setParcels(data.features)
          if (onLoadComplete) {
            onLoadComplete(data.features.length)
          }
          
          // Show message if no data available
          if (data.features.length === 0 && data.message) {
            setError(data.message)
            if (onError) {
              onError(data.message)
            }
          }
        } else {
          throw new Error('Invalid response format')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cadastral data'
        setError(errorMessage)
        if (onError) {
          onError(errorMessage)
        }
        setParcels([])
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchCadastralData()

    // Refetch when map moves or zooms
    const handleMoveEnd = () => {
      fetchCadastralData()
    }

    map.on('moveend', handleMoveEnd)
    map.on('zoomend', handleMoveEnd)

    return () => {
      map.off('moveend', handleMoveEnd)
      map.off('zoomend', handleMoveEnd)
    }
  }, [map, visible, onLoadComplete, onError])

  // Style function for cadastral parcels
  const cadastralStyle = useMemo(() => {
    return (feature: any) => {
      return {
        color: '#2563eb', // Blue color for cadastral boundaries
        weight: 2,
        opacity: 0.8,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        dashArray: '5, 5', // Dashed line to distinguish from other layers
      }
    }
  }, [])

  // Click handler for parcels
  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties) {
      const props = feature.properties
      const popupContent = `
        <div class="p-2">
          <strong>Cadastral Parcel</strong><br/>
          ${props.parcel_number ? `<strong>Parcel Number:</strong> ${props.parcel_number}<br/>` : ''}
          ${props.owner ? `<strong>Owner:</strong> ${props.owner}<br/>` : ''}
          ${props.area ? `<strong>Area:</strong> ${props.area.toFixed(2)} m²<br/>` : ''}
          ${props.land_type ? `<strong>Land Type:</strong> ${props.land_type}<br/>` : ''}
        </div>
      `
      layer.bindPopup(popupContent)
    }
  }

  if (!visible) {
    return null
  }

  if (loading) {
    return null // Loading state handled by parent
  }

  if (error && parcels.length === 0) {
    // Error state - layer will still render but show no features
    return null
  }

  return (
    <>
      {parcels.map((parcel, index) => (
        <GeoJSON
          key={parcel.properties?.id || `cadastral-${index}`}
          data={parcel as any}
          style={cadastralStyle}
          onEachFeature={onEachFeature}
        />
      ))}
    </>
  )
}

