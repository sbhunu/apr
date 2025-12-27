/**
 * Property Map Viewer Component
 * Comprehensive map viewer with multiple base layers and cadastral data
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapContainer, TileLayer, LayersControl, useMap, LayerGroup, Marker, Popup } from 'react-leaflet'
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

// Dynamically import CadastralLayer to avoid SSR issues
const CadastralLayer = dynamic(() => import('./CadastralLayer').then(mod => ({ default: mod.CadastralLayer })), {
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
 * Map Controller Component - handles programmatic map control
 */
function MapController({ 
  center, 
  zoom 
}: { 
  center?: [number, number]
  zoom?: number
}) {
  const map = useMap()
  
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
      })
    }
  }, [map, center, zoom])
  
  return null
}

/**
 * Cadastral Layer Wrapper for LayersControl
 * This component wraps CadastralLayer in a LayerGroup so it can be used in LayersControl.Overlay
 */
function CadastralLayerWrapper({ 
  onLoadComplete, 
  onError 
}: { 
  onLoadComplete?: (count: number) => void
  onError?: (error: string) => void
}) {
  return (
    <LayerGroup>
      <CadastralLayer
        visible={true}
        onLoadComplete={onLoadComplete}
        onError={onError}
      />
    </LayerGroup>
  )
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
  const [cadastralParcelCount, setCadastralParcelCount] = useState(0)
  const [cadastralError, setCadastralError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const [geocodingResults, setGeocodingResults] = useState<any[]>([])
  const [showGeocodingResults, setShowGeocodingResults] = useState(false)
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Search for properties or geocode addresses
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setSearchResults([])
    setSelectedProperty(null)
    setShowAutocomplete(false)
    setAutocompleteSuggestions([])

    try {
      // Determine if this is a property ID search or address/place search
      // Property IDs are typically: UUIDs, codes with numbers, or specific patterns
      // Places/addresses: words, place names, addresses (even single-word place names)
      const trimmedQuery = searchQuery.trim()
      
      // Property ID patterns:
      // - Contains numbers (e.g., "T12345", "SCHEME-001")
      // - UUID format (with hyphens)
      // - Short codes with numbers
      // Place names are typically: all letters, or letters with spaces/commas
      const hasNumbers = /\d/.test(trimmedQuery)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedQuery)
      const isPropertyIdSearch = (hasNumbers || isUUID) && 
                                  trimmedQuery.length < 50 && 
                                  !trimmedQuery.includes(' ') &&
                                  !trimmedQuery.includes(',')

      if (isPropertyIdSearch) {
        // Property ID search - use cadastral layer
        const response = await fetch(`/api/property/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          const properties = data.properties || []
          setSearchResults(properties)
          
          // If single result, select it and zoom to it
          if (properties.length === 1) {
            setSelectedProperty(properties[0])
          } else if (properties.length > 0) {
            // Multiple results - zoom to fit all
            setSelectedProperty(properties[0])
          }
        }
      } else {
        // Address/place search - geocode and zoom to location
        const geocodeResponse = await fetch(`/api/geocoding/search?q=${encodeURIComponent(searchQuery)}`)
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()
          
          if (geocodeData.found && geocodeData.results && geocodeData.results.length > 0) {
            if (geocodeData.results.length === 1) {
              // Single result - zoom directly
              const result = geocodeData.results[0]
              setMapCenter(result.coordinates as [number, number])
              setMapZoom(15)
              
              const locationFeature: GeoJSONType = {
                type: 'Feature',
                properties: {
                  id: 'geocoded-location',
                  address: result.display_name,
                  type: result.type || 'place',
                  geocoded: true,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [result.coordinates[1], result.coordinates[0]], // GeoJSON uses [lng, lat]
                },
              }
              
              setSearchResults([locationFeature])
              setSelectedProperty(locationFeature)
              setGeocodingResults([])
              setShowGeocodingResults(false)
            } else {
              // Multiple results - show selection list
              setGeocodingResults(geocodeData.results)
              setShowGeocodingResults(true)
              setSearchResults([])
              setSelectedProperty(null)
            }
          } else {
            // Location not found
            setSearchResults([])
            setSelectedProperty(null)
            setGeocodingResults([])
            setShowGeocodingResults(false)
            alert('Location not found. Please try a different search term.')
          }
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
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

  // Handle geocoding result selection
  const handleGeocodingResultSelect = (result: any) => {
    setMapCenter(result.coordinates as [number, number])
    setMapZoom(15)
    
    const locationFeature: GeoJSONType = {
      type: 'Feature',
      properties: {
        id: 'geocoded-location',
        address: result.display_name,
        type: result.type || 'place',
        geocoded: true,
      },
      geometry: {
        type: 'Point',
        coordinates: [result.coordinates[1], result.coordinates[0]], // GeoJSON uses [lng, lat]
      },
    }
    
    setSearchResults([locationFeature])
    setSelectedProperty(locationFeature)
    setGeocodingResults([])
    setShowGeocodingResults(false)
    setAutocompleteSuggestions([])
    setShowAutocomplete(false)
  }

  // Handle autocomplete suggestion selection
  const handleAutocompleteSelect = (suggestion: any) => {
    setSearchQuery(suggestion.text)
    setShowAutocomplete(false)
    setAutocompleteSuggestions([])
    
    // Automatically search for the selected suggestion
    setMapCenter(suggestion.coordinates as [number, number])
    setMapZoom(15)
    
    const locationFeature: GeoJSONType = {
      type: 'Feature',
      properties: {
        id: 'geocoded-location',
        address: suggestion.text,
        type: suggestion.type || 'place',
        geocoded: true,
      },
      geometry: {
        type: 'Point',
        coordinates: [suggestion.coordinates[1], suggestion.coordinates[0]],
      },
    }
    
    setSearchResults([locationFeature])
    setSelectedProperty(locationFeature)
  }

  // Fetch autocomplete suggestions
  const fetchAutocomplete = async (query: string) => {
    if (query.length < 2) {
      setAutocompleteSuggestions([])
      setShowAutocomplete(false)
      return
    }

    // Clear previous timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current)
    }

    // Debounce autocomplete requests
    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocoding/autocomplete?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          const suggestions = data.suggestions || []
          setAutocompleteSuggestions(suggestions)
          setShowAutocomplete(suggestions.length > 0)
        } else {
          setAutocompleteSuggestions([])
          setShowAutocomplete(false)
        }
      } catch (error) {
        console.error('Autocomplete error:', error)
        setAutocompleteSuggestions([])
        setShowAutocomplete(false)
      }
    }, 300) // 300ms debounce
  }

  // Handle input change with autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Only show autocomplete for place/address searches, not property IDs
    const trimmedValue = value.trim()
    const hasNumbers = /\d/.test(trimmedValue)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedValue)
    const isPropertyId = (hasNumbers || isUUID) && 
                         trimmedValue.length < 50 && 
                         !trimmedValue.includes(' ') &&
                         !trimmedValue.includes(',')
    
    // Always show autocomplete for place names (2+ characters, no numbers or UUID pattern)
    if (!isPropertyId && trimmedValue.length >= 2) {
      fetchAutocomplete(trimmedValue)
    } else {
      setAutocompleteSuggestions([])
      setShowAutocomplete(false)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* Search Bar */}
      <Card className="absolute top-4 left-4 z-[1000] p-4 w-full max-w-md">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="Search by place name (e.g., 'Chiweshe') or Property ID..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowAutocomplete(false)
                  handleSearch()
                } else if (e.key === 'Escape') {
                  setShowAutocomplete(false)
                }
              }}
              onFocus={() => {
                if (autocompleteSuggestions.length > 0) {
                  setShowAutocomplete(true)
                }
              }}
              onBlur={() => {
                // Delay hiding autocomplete to allow clicks
                setTimeout(() => setShowAutocomplete(false), 200)
              }}
              className="pl-9"
            />
            
            {/* Autocomplete Dropdown */}
            {showAutocomplete && autocompleteSuggestions.length > 0 && (
              <div className="absolute z-[2000] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {autocompleteSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                    onClick={() => handleAutocompleteSelect(suggestion)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {suggestion.place || suggestion.text}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.text}
                        </p>
                        {suggestion.province && (
                          <p className="text-xs text-muted-foreground">
                            {suggestion.province}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Geocoding Results - Multiple locations found */}
        {showGeocodingResults && geocodingResults.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Multiple locations found. Select one:
            </p>
            {geocodingResults.map((result, index) => (
              <Card
                key={index}
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleGeocodingResultSelect(result)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {result.display_name}
                    </p>
                    {result.type && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {result.type}
                        {result.address?.province && ` • ${result.address.province}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Search Results - Property search results */}
        {!showGeocodingResults && searchResults.length > 0 && (
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

      {/* Layer Toggle - Moved to LayersControl overlay */}

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

            {/* Cadastral Layer Overlay */}
            <LayersControl.Overlay checked={false} name="Cadastral Parcels">
              <CadastralLayerWrapper
                onLoadComplete={(count) => {
                  setCadastralParcelCount(count)
                  setCadastralError(null)
                }}
                onError={(error) => {
                  setCadastralError(error)
                  setCadastralParcelCount(0)
                }}
              />
            </LayersControl.Overlay>
          </LayersControl>

          {/* Search Results Parcels (separate from cadastral layer) - only for polygon geometries */}
          {selectedProperty && 
           selectedProperty.geometry.type !== 'Point' && 
           !selectedProperty.properties?.geocoded && (
            <ParcelLayer
              parcels={[selectedProperty]}
              onParcelClick={handlePropertyClick}
              highlightParcelId={selectedProperty.properties?.id}
            />
          )}

          {/* Multiple search results - only polygon geometries */}
          {searchResults.length > 1 && (
            <ParcelLayer
              parcels={searchResults.filter(p => p.geometry.type !== 'Point' && !p.properties?.geocoded)}
              onParcelClick={handlePropertyClick}
              highlightParcelId={selectedProperty?.properties?.id}
            />
          )}

          <BaseLayerController />
          <MapController center={mapCenter} zoom={mapZoom} />
          
          {/* Geocoded address marker */}
          {selectedProperty?.properties?.geocoded && selectedProperty.geometry.type === 'Point' && (
            <Marker
              position={[selectedProperty.geometry.coordinates[1], selectedProperty.geometry.coordinates[0]]}
              icon={L.icon({
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
              })}
            >
              <Popup>
                <div>
                  <strong>Address:</strong><br />
                  {selectedProperty.properties.address}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Cadastral Layer Status - Shows when layer is active */}
      {cadastralParcelCount > 0 || cadastralError ? (
        <Card className="absolute top-32 right-4 z-[1000] p-2 max-w-xs">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-3 w-3" />
              <span className="font-medium">Cadastral Layer</span>
            </div>
            {cadastralError ? (
              <p className="text-muted-foreground text-xs">{cadastralError}</p>
            ) : cadastralParcelCount > 0 ? (
              <p className="text-muted-foreground text-xs">
                {cadastralParcelCount} parcel{cadastralParcelCount !== 1 ? 's' : ''} visible
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

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

