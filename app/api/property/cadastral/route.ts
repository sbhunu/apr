/**
 * Cadastral Layer API Route
 * Fetches cadastral parcels from PostGIS based on map bounds
 * 
 * TODO: When cadastral data is available in the database, implement:
 * - Query apr.cadastral_parcels table with PostGIS spatial queries
 * - Filter by map bounds (bbox) using ST_Intersects
 * - Return GeoJSON format for Leaflet consumption
 * - Include parcel metadata (parcel_id, owner, area, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    const { searchParams } = new URL(request.url)
    
    // Get bounding box from query params (southwest_lat, southwest_lng, northeast_lat, northeast_lng)
    const bbox = searchParams.get('bbox')
    
    if (!bbox) {
      return NextResponse.json(
        { error: 'Bounding box (bbox) parameter required' },
        { status: 400 }
      )
    }

    const [swLat, swLng, neLat, neLng] = bbox.split(',').map(Number)

    // TODO: When cadastral_parcels table exists, implement PostGIS query:
    /*
    const { data: parcels, error } = await supabase.rpc('get_cadastral_parcels_in_bbox', {
      sw_lat: swLat,
      sw_lng: swLng,
      ne_lat: neLat,
      ne_lng: neLng,
    })

    if (error) {
      console.error('Error fetching cadastral parcels:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cadastral parcels', parcels: [] },
        { status: 500 }
      )
    }

    // Transform to GeoJSON format
    const features = parcels.map((parcel) => ({
      type: 'Feature',
      properties: {
        id: parcel.parcel_id,
        parcel_number: parcel.parcel_number,
        owner: parcel.owner_name,
        area: parcel.area_m2,
        land_type: parcel.land_type,
        registration_date: parcel.registration_date,
      },
      geometry: parcel.geometry, // PostGIS geometry already in GeoJSON format
    }))

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
    })
    */

    // For now, return empty FeatureCollection
    // This allows the layer to be toggled without errors
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      message: 'Cadastral data not yet available in database',
    })
  } catch (error) {
    console.error('Cadastral layer error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch cadastral layer',
        type: 'FeatureCollection',
        features: [],
      },
      { status: 500 }
    )
  }
}

