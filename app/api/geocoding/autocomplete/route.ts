/**
 * Geocoding Autocomplete API Route
 * Provides autocomplete suggestions for place names and addresses
 * Includes fuzzy matching to handle typos and misspellings
 */

import { NextRequest, NextResponse } from 'next/server'
import { similarityScore } from '@/lib/utils/fuzzyMatch'

const AUTOCOMPLETE_CACHE = new Map<string, { cachedAt: number; suggestions: any[] }>()
const CACHE_TTL_MS = 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 })
    }

    const cacheKey = query.toLowerCase()
    const cached = AUTOCOMPLETE_CACHE.get(cacheKey)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ suggestions: cached.suggestions }, { status: 200 })
    }

    // Use OpenStreetMap Nominatim for autocomplete
    // Add "Zimbabwe" to improve results for local places
    const searchQuery = query.includes('Zimbabwe') ? query : `${query}, Zimbabwe`
    
    // Try multiple search strategies for better fuzzy matching
    // 1. Original query with Zimbabwe
    // 2. Original query without Zimbabwe
    // 3. Partial matches (helps with typos like "Muromedz" -> "Murombedzi")
    const searchVariations: string[] = [
      searchQuery, // Original query with Zimbabwe
    ]
    
    if (!query.includes('Zimbabwe')) {
      searchVariations.push(query) // Without "Zimbabwe" suffix
    }
    
    // Try partial matches for longer queries (helps with typos)
    // This helps when user types "Muromedz" - we search for "Murom" which finds "Murombedzi"
    if (query.length > 4) {
      // Try first N-1 characters (e.g., "Murom" from "Muromedz")
      const partial = query.substring(0, query.length - 1)
      if (partial.length >= 4) {
        searchVariations.push(`${partial}, Zimbabwe`)
      }

      // Try first N-2 characters if query is long enough
      if (query.length > 6) {
        const partial2 = query.substring(0, query.length - 2)
        if (partial2.length >= 4) {
          searchVariations.push(`${partial2}, Zimbabwe`)
        }
      }

      // Try first 5-7 characters (common prefix length for place names)
      // For "Muromedz" (8 chars), try "Murome" (6 chars) which should find "Murombedzi"
      if (query.length >= 7) {
        const prefix = query.substring(0, 7)
        searchVariations.push(`${prefix}, Zimbabwe`)
      }
      if (query.length >= 6) {
        const prefix = query.substring(0, 6)
        searchVariations.push(`${prefix}, Zimbabwe`)
      }
      if (query.length >= 5) {
        const prefix = query.substring(0, 5)
        searchVariations.push(`${prefix}, Zimbabwe`)
      }

      // Try appending common suffixes to catch missing letters
      const suffixes = ['e', 'ed', 'be', 'bed']
      suffixes.forEach((suffix) => {
        searchVariations.push(`${query}${suffix}, Zimbabwe`)
      })
    }

    let allResults: any[] = []
    const seenPlaceIds = new Set<number>()

    for (const variation of searchVariations) {
      if (allResults.length >= 8) {
        break
      }
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variation)}&limit=8&countrycodes=zw&addressdetails=1&extratags=1&namedetails=1&dedupe=0`
      try {
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'APR Property Registration System',
          },
        })
        if (!response.ok) continue
        const data = await response.json()
        if (!Array.isArray(data) || data.length === 0) continue
        for (const result of data) {
          if (!seenPlaceIds.has(result.place_id)) {
            seenPlaceIds.add(result.place_id)
            allResults.push(result)
          }
        }
      } catch (fetchError) {
        console.error('Autocomplete fetch error:', fetchError)
      }
    }

    if (allResults.length === 0) {
      return NextResponse.json({ suggestions: [] }, { status: 200 })
    }

    // Transform to autocomplete suggestions with similarity scoring
    const suggestions = allResults.map((result: any) => {
      const placeName = result.address?.village || result.address?.town || result.address?.city || result.address?.suburb || result.name || ''
      const displayName = result.display_name || ''
      
      // Calculate similarity scores for ranking
      const placeScore = placeName ? similarityScore(query, placeName) : 0
      const displayScore = similarityScore(query, displayName)
      const maxScore = Math.max(placeScore, displayScore)

      return {
        text: displayName,
        place: placeName,
        province: result.address?.state || result.address?.province,
        type: result.type || result.class || 'place',
        coordinates: [parseFloat(result.lat), parseFloat(result.lon)],
        importance: result.importance || 0,
        similarityScore: maxScore, // Add similarity score for ranking
      }
    })

    // Sort by similarity score (highest first), then by importance
    suggestions.sort((a: any, b: any) => {
      if (Math.abs(a.similarityScore - b.similarityScore) > 0.1) {
        return b.similarityScore - a.similarityScore
      }
      return b.importance - a.importance
    })

    // Filter out very low similarity matches (below 0.25) unless importance is high
    // Lower threshold helps with typos - "Muromedz" vs "Murombedzi" has ~0.7 similarity
    const filteredSuggestions = suggestions.filter((s: any) => 
      s.similarityScore >= 0.25 || s.importance > 0.4
    )

    const topSuggestions = filteredSuggestions.slice(0, 8).map(({ similarityScore, ...rest }: any) => rest)
    AUTOCOMPLETE_CACHE.set(cacheKey, { cachedAt: Date.now(), suggestions: topSuggestions })
    return NextResponse.json({ suggestions: topSuggestions }, { status: 200 })
  } catch (error) {
    console.error('Autocomplete error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}

