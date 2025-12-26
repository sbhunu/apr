/**
 * Spatial Parcels API Route
 * Fetches cadastral parcels from PostGIS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/spatial/parcels - Get cadastral parcels
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const bbox = searchParams.get('bbox') // Format: minLng,minLat,maxLng,maxLat
  const limit = parseInt(searchParams.get('limit') || '100', 10)

  let query = supabase.rpc('apr.get_cadastral_parcels', {
    p_limit: limit,
  })

  // If bbox provided, filter by bounding box
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat)
    query = supabase.rpc('apr.get_cadastral_parcels_bbox', {
      p_min_lng: minLng,
      p_min_lat: minLat,
      p_max_lng: maxLng,
      p_max_lat: maxLat,
      p_limit: limit,
    })
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return NextResponse.json({
    success: true,
    parcels: data || [],
  })
})

