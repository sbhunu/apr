/**
 * Geocoding API Route
 * Converts addresses to coordinates using OpenStreetMap Nominatim API
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter required' },
        { status: 400 }
      )
    }

    // Use OpenStreetMap Nominatim for geocoding (free, no API key required)
    // Add "Zimbabwe" to improve results for local addresses and places
    const searchQuery = query.includes('Zimbabwe') ? query : `${query}, Zimbabwe`
    // Increase limit to 10 to allow user selection from multiple results
    // Use 'q' parameter for better fuzzy matching of place names
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&countrycodes=zw&addressdetails=1&extratags=1`

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'APR Property Registration System', // Required by Nominatim
      },
    })

    if (!response.ok) {
      throw new Error('Geocoding service unavailable')
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      return NextResponse.json({
        found: false,
        results: [],
        message: 'Location not found',
      })
    }

    // Transform results to a consistent format
    const results = data.map((result: any) => ({
      coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
      display_name: result.display_name,
      type: result.type || result.class || 'place',
      importance: result.importance || 0,
      address: {
        road: result.address?.road,
        suburb: result.address?.suburb,
        village: result.address?.village,
        city: result.address?.city || result.address?.town,
        district: result.address?.district,
        province: result.address?.state,
        country: result.address?.country,
      },
    }))

    // Sort by importance (higher is better)
    results.sort((a: any, b: any) => b.importance - a.importance)

    return NextResponse.json({
      found: true,
      results,
      // For backward compatibility, include the first result
      coordinates: results[0].coordinates,
      display_name: results[0].display_name,
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address', found: false },
      { status: 500 }
    )
  }
}

