/**
 * Property Map Viewer Component
 * Comprehensive map viewer with multiple base layers and cadastral data
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MapContainer, TileLayer, LayersControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Layers } from 'lucide-react'
import type { Feature, GeoJsonProperties, Geometry as GeoJsonGeometry } from 'geojson'

// Dynamically import ParcelLayer to avoid SSR issues
const ParcelLayer = dynamic(() => import('./ParcelLayer').then(mod => ({ default: mod.ParcelLayer })), {
  ssr: false,
})

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

type GeoJSONType = Feature<GeoJsonGeometry, GeoJsonProperties>

interface PropertyMapViewerProps {
  initialCenter?: [number, number]
  initialZoom?: number
  onPropertySelect?: (property: GeoJSONType) => void
}

/**
 * Base map layer controller
 */
function BaseLayerController() {
  const map = useMap()
  return null
}

/**
 * Property Map Viewer Component
 */
export function PropertyMapViewer({
  initialCenter = [-17.8292, 31.0522], // Harare, Zimbabwe default center
  initialZoom = 13,
  onPropertySelect,
}: PropertyMapViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeoJSONType[]>([])
  const [selectedProperty, setSelectedProperty] = useState<GeoJSONType | null>(null)
  const [loading, setLoading] = useState(false)
  const [cadastralLayerVisible, setCadastralLayerVisible] = useState(true)

  // Search for properties
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch(`/api/property/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.properties || [])
        
        // If single result, select it
        if (data.properties?.length === 1) {
          setSelectedProperty(data.properties[0])
        }
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle property selection
  const handlePropertyClick = (property: GeoJSONType) => {
    setSelectedProperty(property)
    if (onPropertySelect) {
      onPropertySelect(property)
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* Search Bar */}
      <Card className="absolute top-4 left-4 z-[1000] p-4 w-full max-w-md">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by property ID, title number, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
            {searchResults.map((property, index) => (
              <Card
                key={property.properties?.id || index}
                className="p-3 cursor-pointer hover:bg-accent"
                onClick={() => handlePropertyClick(property)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {property.properties?.title_number || property.properties?.id || 'Property'}
                    </p>
                    {property.properties?.address && (
                      <p className="text-xs text-muted-foreground">{property.properties.address}</p>
                    )}
                    {property.properties?.scheme_number && (
                      <p className="text-xs text-muted-foreground">
                        Scheme: {property.properties.scheme_number}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Layer Toggle */}
      <Card className="absolute top-4 right-4 z-[1000] p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCadastralLayerVisible(!cadastralLayerVisible)}
        >
          <Layers className="h-4 w-4 mr-2" />
          {cadastralLayerVisible ? 'Hide' : 'Show'} Cadastral
        </Button>
      </Card>

      {/* Map */}
      <div className="w-full h-full">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        >
          <LayersControl position="topright">
            {/* OpenStreetMap Base Layer */}
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            {/* OpenStreetMap Topographic (via OpenTopoMap) */}
            <LayersControl.BaseLayer name="Topographic Map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                maxZoom={17}
              />
            </LayersControl.BaseLayer>

            {/* Satellite Imagery (via Esri) */}
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>

            {/* Google Maps style (via CartoDB) */}
            <LayersControl.BaseLayer name="Google Maps Style">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                subdomains="abcd"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Cadastral Layer */}
          {cadastralLayerVisible && selectedProperty && (
            <ParcelLayer
              parcels={[selectedProperty]}
              onParcelClick={handlePropertyClick}
              highlightParcelId={selectedProperty.properties?.id}
            />
          )}

          {/* Multiple search results */}
          {cadastralLayerVisible && searchResults.length > 1 && (
            <ParcelLayer
              parcels={searchResults}
              onParcelClick={handlePropertyClick}
              highlightParcelId={selectedProperty?.properties?.id}
            />
          )}

          <BaseLayerController />
        </MapContainer>
      </div>

      {/* Property Details Panel */}
      {selectedProperty && (
        <Card className="absolute bottom-4 left-4 z-[1000] p-4 w-full max-w-md">
          <h3 className="font-semibold mb-2">Property Details</h3>
          <div className="space-y-1 text-sm">
            {selectedProperty.properties?.title_number && (
              <p>
                <strong>Title Number:</strong> {selectedProperty.properties.title_number}
              </p>
            )}
            {selectedProperty.properties?.scheme_number && (
              <p>
                <strong>Scheme Number:</strong> {selectedProperty.properties.scheme_number}
              </p>
            )}
            {selectedProperty.properties?.section_number && (
              <p>
                <strong>Section Number:</strong> {selectedProperty.properties.section_number}
              </p>
            )}
            {selectedProperty.properties?.address && (
              <p>
                <strong>Address:</strong> {selectedProperty.properties.address}
              </p>
            )}
            {selectedProperty.properties?.area && (
              <p>
                <strong>Area:</strong> {selectedProperty.properties.area.toFixed(2)} m²
              </p>
            )}
            {selectedProperty.properties?.holder_name && (
              <p>
                <strong>Holder:</strong> {selectedProperty.properties.holder_name}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

