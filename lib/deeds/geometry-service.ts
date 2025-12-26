/**
 * Geometry Service for Module 4
 * Fetches spatial data for schemes and sections for GIS visualization
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { toGeoJsonFeature } from '@/lib/planning/plan-utils'
import type { Feature, Geometry } from 'geojson'

/**
 * Scheme geometry data for GIS viewer
 */
export interface SchemeGeometryData {
  schemeId: string
  schemeNumber: string
  schemeName: string
  parentParcel?: Feature<Geometry>
  sections: Array<{
    id: string
    sectionNumber: string
    area: number
    participationQuota: number
    geometry?: Feature<Geometry>
  }>
  center?: [number, number] // [lat, lng] for map centering
}

/**
 * Get geometry data for a scheme
 */
export async function getSchemeGeometry(schemeId: string): Promise<{
  success: boolean
  data?: SchemeGeometryData
  error?: string
}> {
  return monitor('get_scheme_geometry', async () => {
    const supabase = await createClient()

    try {
      // Get scheme with survey plan
      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .select(`
          id,
          scheme_number,
          scheme_name,
          survey_plan_id,
          survey_sectional_plans!inner(
            id,
            parent_parcel_geometry,
            parent_parcel_centroid
          )
        `)
        .eq('id', schemeId)
        .single()

      if (schemeError || !scheme) {
        logger.error('Failed to get scheme', schemeError, { schemeId })
        return {
          success: false,
          error: schemeError?.message || 'Scheme not found',
        }
      }

      // Get sections with geometries
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select(`
          id,
          section_number,
          area,
          participation_quota,
          geometry
        `)
        .eq('scheme_id', schemeId)
        .order('section_number', { ascending: true })

      if (sectionsError) {
        logger.error('Failed to get sections', sectionsError, { schemeId })
        return {
          success: false,
          error: sectionsError.message,
        }
      }

      // Convert parent parcel geometry
      const surveyPlan = (scheme as any).survey_sectional_plans
      const parentParcelGeoJson = surveyPlan?.parent_parcel_geometry
        ? toGeoJsonFeature(surveyPlan.parent_parcel_geometry)
        : undefined

      // Convert section geometries
      const sectionsWithGeometry =
        sections?.map((s: any) => ({
          id: s.id,
          sectionNumber: s.section_number,
          area: s.area,
          participationQuota: s.participation_quota,
          geometry: s.geometry ? toGeoJsonFeature(s.geometry) : undefined,
        })) || []

      // Calculate center from parent parcel centroid or first section
      let center: [number, number] | undefined
      if (surveyPlan?.parent_parcel_centroid) {
        // Convert UTM Zone 35S (SRID 32735) to WGS84 for Leaflet
        // For now, use a simple approximation - in production, use PostGIS ST_Transform
        // This is a placeholder - actual conversion should use PostGIS
        const centroid = surveyPlan.parent_parcel_centroid
        // If centroid is already in GeoJSON format with coordinates
        if (typeof centroid === 'object' && 'coordinates' in centroid) {
          const coords = (centroid as any).coordinates
          if (Array.isArray(coords) && coords.length >= 2) {
            // Approximate conversion (UTM to WGS84) - should use proper transformation
            // For Zimbabwe UTM Zone 35S, approximate: subtract ~31 from X, add ~17 to Y
            // This is a rough approximation - use PostGIS ST_Transform for accuracy
            center = [coords[1] / 111000 + -17.8, coords[0] / 111000 + 31.0] // Rough approximation
          }
        }
      }

      // Fallback to Harare center if no centroid
      if (!center) {
        center = [-17.8292, 31.0522] // Harare, Zimbabwe
      }

      return {
        success: true,
        data: {
          schemeId: scheme.id,
          schemeNumber: scheme.scheme_number,
          schemeName: scheme.scheme_name,
          parentParcel: parentParcelGeoJson || undefined,
          sections: sectionsWithGeometry,
          center,
        },
      }
    } catch (error) {
      logger.error('Exception getting scheme geometry', error as Error, { schemeId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get geometry for a specific section
 */
export async function getSectionGeometry(sectionId: string): Promise<{
  success: boolean
  geometry?: Feature<Geometry>
  sectionNumber?: string
  error?: string
}> {
  return monitor('get_section_geometry', async () => {
    const supabase = await createClient()

    try {
      const { data: section, error } = await supabase
        .from('sections')
        .select('id, section_number, geometry')
        .eq('id', sectionId)
        .single()

      if (error || !section) {
        return {
          success: false,
          error: error?.message || 'Section not found',
        }
      }

      const geometry = section.geometry ? toGeoJsonFeature(section.geometry) : undefined

      return {
        success: true,
        geometry,
        sectionNumber: section.section_number,
      }
    } catch (error) {
      logger.error('Exception getting section geometry', error as Error, { sectionId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

