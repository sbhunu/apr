/**
 * Property Search API Route
 * Search for properties by ID, title number, address, or scheme number
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ properties: [] }, { status: 200 })
    }

    // Search in multiple tables/views
    const searchLower = query.toLowerCase()

    // Search sectional titles
    const { data: titles, error: titlesError } = await supabase
      .from('sectional_titles')
      .select('id, title_number, holder_name, registration_date, section_id')
      .or(`title_number.ilike.%${query}%,holder_name.ilike.%${searchLower}%`)
      .limit(20)

    if (titlesError) {
      console.error('Error searching titles:', titlesError)
    }

    // Search sections
    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('id, section_number, scheme_id')
      .or(`section_number.ilike.%${query}%`)
      .limit(20)

    if (sectionsError) {
      console.error('Error searching sections:', sectionsError)
    }

    // Search schemes
    const { data: schemes, error: schemesError } = await supabase
      .from('sectional_schemes')
      .select('id, scheme_number, scheme_name, location')
      .or(`scheme_number.ilike.%${query}%,scheme_name.ilike.%${searchLower}%`)
      .limit(20)

    if (schemesError) {
      console.error('Error searching schemes:', schemesError)
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

