/**
 * Property Search API Route
 * Search for properties by ID, title number, address, or scheme number
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ properties: [] }, { status: 200 })
    }

    // Determine if this is a property ID search (numeric/alphanumeric) or address search
    // Property IDs must contain numbers or be UUIDs
    // Place names (even single-word ones like "Chiweshe") should go to geocoding
    const hasNumbers = /\d/.test(query)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)
    const isPropertyIdSearch = (hasNumbers || isUUID) && query.length < 50 && !query.includes(',') && !query.includes(' ')

    // Search in multiple tables/views - only for property ID searches
    // Address searches should use geocoding API instead
    const searchLower = query.toLowerCase()
    const escapedQuery = query.replace(/'/g, "''") // Escape single quotes for SQL
    const escapedSearchLower = searchLower.replace(/'/g, "''")

    let titles: any[] = []
    let sections: any[] = []
    let schemes: any[] = []

    if (isPropertyIdSearch) {
      // Search sectional titles by title number or ID
      const { data: titlesData, error: titlesError } = await supabase
        .from('sectional_titles')
        .select('id, title_number, holder_name, registration_date, section_id')
        .or(`title_number.ilike.%${escapedQuery}%,id.eq.${escapedQuery}`)
        .limit(20)

      if (titlesError) {
        console.error('Error searching titles:', titlesError)
      } else {
        titles = titlesData || []
      }

      // Search sections by section number
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_number, scheme_id')
        .ilike('section_number', `%${escapedQuery}%`)
        .limit(20)

      if (sectionsError) {
        console.error('Error searching sections:', sectionsError)
      } else {
        sections = sectionsData || []
      }

      // Search schemes by scheme number
      const { data: schemesData, error: schemesError } = await supabase
        .from('sectional_schemes')
        .select('id, scheme_number, scheme_name, location')
        .ilike('scheme_number', `%${escapedQuery}%`)
        .limit(20)

      if (schemesError) {
        console.error('Error searching schemes:', schemesError)
      } else {
        schemes = schemesData || []
      }
    }

    // Fetch geometries for found properties
    const properties: any[] = []

    // Process titles
    if (titles && titles.length > 0) {
      for (const title of titles) {
        if (title.section_id) {
          // Fetch section geometry
          const { data: sectionGeo, error: geoError } = await supabase
            .from('section_geometries')
            .select('geometry')
            .eq('section_id', title.section_id)
            .single()

          if (!geoError && sectionGeo?.geometry) {
            properties.push({
              type: 'Feature',
              properties: {
                id: title.id,
                title_number: title.title_number,
                holder_name: title.holder_name,
                registration_date: title.registration_date,
                type: 'title',
              },
              geometry: sectionGeo.geometry,
            })
          }
        }
      }
    }

    // Process sections
    if (sections && sections.length > 0) {
      for (const section of sections) {
        const { data: sectionGeo, error: geoError } = await supabase
          .from('section_geometries')
          .select('geometry')
          .eq('section_id', section.id)
          .single()

        if (!geoError && sectionGeo?.geometry) {
          // Get scheme info
          const scheme = schemes?.find((s) => s.id === section.scheme_id)
          properties.push({
            type: 'Feature',
            properties: {
              id: section.id,
              section_number: section.section_number,
              scheme_number: scheme?.scheme_number,
              scheme_name: scheme?.scheme_name,
              type: 'section',
            },
            geometry: sectionGeo.geometry,
          })
        }
      }
    }

    // Process schemes (parent parcels)
    if (schemes && schemes.length > 0) {
      for (const scheme of schemes) {
        // Fetch survey plan geometry (parent parcel)
        const { data: surveyPlan, error: surveyError } = await supabase
          .from('survey_sectional_plans')
          .select('id, parent_parcel_geometry')
          .eq('survey_number', scheme.scheme_number)
          .single()

        if (!surveyError && surveyPlan?.parent_parcel_geometry) {
          properties.push({
            type: 'Feature',
            properties: {
              id: scheme.id,
              scheme_number: scheme.scheme_number,
              scheme_name: scheme.scheme_name,
              location: scheme.location,
              type: 'scheme',
            },
            geometry: surveyPlan.parent_parcel_geometry,
          })
        }
      }
    }

    return NextResponse.json({ properties }, { status: 200 })
  } catch (error) {
    console.error('Property search error:', error)
    return NextResponse.json(
      { error: 'Failed to search properties', properties: [] },
      { status: 500 }
    )
  }
}

