/**
 * Geocoding Autocomplete API Route
 * Provides autocomplete suggestions for place names and addresses
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 })
    }

    // Use OpenStreetMap Nominatim for autocomplete
    // Add "Zimbabwe" to improve results for local places
    const searchQuery = query.includes('Zimbabwe') ? query : `${query}, Zimbabwe`
    // Use 'q' parameter for better fuzzy matching and include 'accept-language' for better results
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=8&countrycodes=zw&addressdetails=1&extratags=1&namedetails=1`

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'APR Property Registration System',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 200 })
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      return NextResponse.json({ suggestions: [] }, { status: 200 })
    }

    // Transform to autocomplete suggestions
    const suggestions = data.map((result: any) => ({
      text: result.display_name,
      place: result.address?.village || result.address?.town || result.address?.city || result.address?.suburb || result.name,
      province: result.address?.state || result.address?.province,
      type: result.type || result.class || 'place',
      coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
    }))

    return NextResponse.json({ suggestions }, { status: 200 })
  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}

