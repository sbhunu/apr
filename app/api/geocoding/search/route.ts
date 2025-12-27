/**
 * Geocoding API Route
 * Converts addresses to coordinates using OpenStreetMap Nominatim API
 * Includes fuzzy matching to handle typos and misspellings
 */

import { NextRequest, NextResponse } from 'next/server'
import { similarityScore, generateSearchVariations } from '@/lib/utils/fuzzyMatch'

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

    // Generate multiple search strategies for better fuzzy matching
    // 1. Original query with Zimbabwe
    // 2. Original query without Zimbabwe (sometimes helps)
    // 3. Partial matches (if query is long enough) - helps with typos
    const searchQueries: string[] = []
    
    // Always try with Zimbabwe
    searchQueries.push(query.includes('Zimbabwe') ? query : `${query}, Zimbabwe`)
    
    // Try without Zimbabwe suffix (sometimes helps)
    if (!query.includes('Zimbabwe')) {
      searchQueries.push(query)
    }
    
    // Try partial matches for longer queries (helps with typos like "Muromedz" -> "Murombedzi")
    // This helps when user types "Muromedz" - we search for "Murom" which finds "Murombedzi"
    if (query.length > 4) {
      // Try first N-1 characters (e.g., "Murom" from "Muromedz")
      const partial = query.substring(0, query.length - 1)
      if (partial.length >= 4) {
        searchQueries.push(`${partial}, Zimbabwe`)
      }

      // Try first N-2 characters if query is long enough
      if (query.length > 6) {
        const partial2 = query.substring(0, query.length - 2)
        if (partial2.length >= 4) {
          searchQueries.push(`${partial2}, Zimbabwe`)
        }
      }

      // Try first 5-7 characters (common prefix length for place names)
      if (query.length >= 7) {
        const prefix = query.substring(0, 7)
        searchQueries.push(`${prefix}, Zimbabwe`)
      }
      if (query.length >= 6) {
        const prefix = query.substring(0, 6)
        searchQueries.push(`${prefix}, Zimbabwe`)
      }
      if (query.length >= 5) {
        const prefix = query.substring(0, 5)
        searchQueries.push(`${prefix}, Zimbabwe`)
      }

      const suffixes = ['e', 'ed', 'be', 'bed']
      suffixes.forEach((suffix) => {
        searchQueries.push(`${query}${suffix}, Zimbabwe`)
      })
    }

    let allResults: any[] = []
    const seenPlaceIds = new Set<number>()

    const variationFetches = searchQueries.slice(0, 5).map(async (searchQuery) => {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=12&countrycodes=zw&addressdetails=1&extratags=1&dedupe=0`
      try {
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'APR Property Registration System',
          },
        })
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } catch (fetchError) {
        console.error('Geocoding search fetch error:', fetchError)
        return []
      }
    })

    const resultsByVariation = await Promise.all(variationFetches)
    for (const data of resultsByVariation) {
      for (const result of data) {
        if (!seenPlaceIds.has(result.place_id)) {
          seenPlaceIds.add(result.place_id)
          allResults.push(result)
        }
      }
      if (allResults.length >= 12) {
        break
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json({
        found: false,
        results: [],
        message: 'Location not found',
      })
    }

    // Transform results to a consistent format with similarity scoring
    const results = allResults.map((result: any) => {
      const placeName = result.address?.village || result.address?.town || result.address?.city || result.address?.suburb || result.name || ''
      const displayName = result.display_name || ''
      
      // Calculate similarity scores for ranking
      const placeScore = placeName ? similarityScore(query, placeName) : 0
      const displayScore = similarityScore(query, displayName)
      const maxScore = Math.max(placeScore, displayScore)

      return {
        coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
        display_name: displayName,
        type: result.type || result.class || 'place',
        importance: result.importance || 0,
        similarityScore: maxScore,
        address: {
          road: result.address?.road,
          suburb: result.address?.suburb,
          village: result.address?.village,
          city: result.address?.city || result.address?.town,
          district: result.address?.district,
          province: result.address?.state,
          country: result.address?.country,
        },
      }
    })

    // Sort by similarity score first (highest first), then by importance
    results.sort((a: any, b: any) => {
      if (Math.abs(a.similarityScore - b.similarityScore) > 0.1) {
        return b.similarityScore - a.similarityScore
      }
      return b.importance - a.importance
    })

    // Filter out very low similarity matches (below 0.25) unless importance is high
    // Lower threshold helps with typos - "Muromedz" vs "Murombedzi" has ~0.7 similarity
    const filteredResults = results.filter((r: any) => 
      r.similarityScore >= 0.25 || r.importance > 0.4
    )

    // Remove similarityScore from final results (internal use only)
    const finalResults = filteredResults.map(({ similarityScore, ...rest }: any) => rest)

    return NextResponse.json({
      found: true,
      results: finalResults,
      // For backward compatibility, include the first result
      coordinates: finalResults[0]?.coordinates,
      display_name: finalResults[0]?.display_name,
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address', found: false },
      { status: 500 }
    )
  }
}

