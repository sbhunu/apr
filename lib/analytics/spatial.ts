/**
 * Spatial Analytics Service
 * Provides GIS-based spatial analysis
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Spatial analysis result
 */
export interface SpatialAnalysisResult {
  totalArea: number // m²
  schemeCount: number
  averageSchemeArea: number // m²
  density: number // schemes per km²
  distribution: Array<{
    province: string
    schemeCount: number
    totalArea: number
    averageArea: number
  }>
  heatmapData: Array<{
    lat: number
    lng: number
    weight: number
  }>
}

/**
 * Get spatial analysis
 */
export async function getSpatialAnalysis(
  filters?: {
    province?: string
    bbox?: {
      minLng: number
      minLat: number
      maxLng: number
      maxLat: number
    }
  }
): Promise<{
  success: boolean
  analysis?: SpatialAnalysisResult
  error?: string
}> {
  return monitor('get_spatial_analysis', async () => {
    const supabase = await createClient()

    try {
      // Get schemes with geometry data
      const { data: schemes, error: schemesError } = await supabase
        .from('apr.sectional_schemes')
        .select(`
          id,
          scheme_number,
          apr.survey_sectional_plans!left(
            parent_parcel_area,
            parent_parcel_centroid
          )
        `)
        .limit(1000)

      if (schemesError) {
        return {
          success: false,
          error: schemesError.message,
        }
      }

      let totalArea = 0
      let schemeCount = 0
      const provinceMap = new Map<
        string,
        { schemeCount: number; totalArea: number; areas: number[] }
      >()
      const heatmapData: Array<{ lat: number; lng: number; weight: number }> = []

      schemes?.forEach((scheme: any) => {
        const surveyPlan = scheme.survey_sectional_plans
        if (surveyPlan && surveyPlan.parent_parcel_area) {
          const area = parseFloat(surveyPlan.parent_parcel_area) || 0
          totalArea += area
          schemeCount++

          // Extract province from scheme number
          const parts = scheme.scheme_number?.split('/') || []
          if (parts.length >= 3) {
            const province = parts[2]
            const current = provinceMap.get(province) || {
              schemeCount: 0,
              totalArea: 0,
              areas: [],
            }
            current.schemeCount++
            current.totalArea += area
            current.areas.push(area)
            provinceMap.set(province, current)
          }

          // Extract centroid for heatmap (if available)
          if (surveyPlan.parent_parcel_centroid) {
            // Parse PostGIS POINT geometry
            // Format: SRID=32735;POINT(x y)
            const geomStr = surveyPlan.parent_parcel_centroid
            const match = geomStr.match(/POINT\(([^)]+)\)/)
            if (match) {
              const [x, y] = match[1].split(' ').map(parseFloat)
              // Convert UTM to lat/lng (simplified - would need proj4)
              // For now, use approximate conversion
              heatmapData.push({
                lat: y / 111000, // Approximate conversion
                lng: x / 111000,
                weight: area,
              })
            }
          }
        }
      })

      const distribution = Array.from(provinceMap.entries()).map(([province, data]) => ({
        province,
        schemeCount: data.schemeCount,
        totalArea: data.totalArea,
        averageArea: data.schemeCount > 0 ? data.totalArea / data.schemeCount : 0,
      }))

      // Calculate density (simplified - would need actual bounding box area)
      const density = schemeCount > 0 ? schemeCount / (totalArea / 1000000) : 0 // schemes per km²

      return {
        success: true,
        analysis: {
          totalArea,
          schemeCount,
          averageSchemeArea: schemeCount > 0 ? totalArea / schemeCount : 0,
          density,
          distribution,
          heatmapData,
        },
      }
    } catch (error) {
      logger.error('Exception getting spatial analysis', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get scheme distribution by province
 */
export async function getProvinceDistribution(): Promise<{
  success: boolean
  distribution?: Array<{
    province: string
    schemeCount: number
    titleCount: number
    totalArea: number
  }>
  error?: string
}> {
  return monitor('get_province_distribution', async () => {
    const supabase = await createClient()

    try {
      const { data: schemes } = await supabase
        .from('apr.sectional_schemes')
        .select('scheme_number')
        .limit(1000)

      const provinceMap = new Map<
        string,
        { schemeCount: number; titleCount: number; totalArea: number }
      >()

      schemes?.forEach((scheme: any) => {
        const parts = scheme.scheme_number?.split('/') || []
        if (parts.length >= 3) {
          const province = parts[2]
          const current = provinceMap.get(province) || {
            schemeCount: 0,
            titleCount: 0,
            totalArea: 0,
          }
          current.schemeCount++
          provinceMap.set(province, current)
        }
      })

      // Get titles by province
      const { data: titles } = await supabase
        .from('apr.sectional_titles')
        .select(`
          id,
          apr.sections!inner(
            area,
            apr.sectional_schemes!inner(
              scheme_number
            )
          )
        `)
        .limit(1000)

      titles?.forEach((title: any) => {
        const schemeNumber = title.sections?.sectional_schemes?.scheme_number
        if (schemeNumber) {
          const parts = schemeNumber.split('/')
          if (parts.length >= 3) {
            const province = parts[2]
            const current = provinceMap.get(province) || {
              schemeCount: 0,
              titleCount: 0,
              totalArea: 0,
            }
            current.titleCount++
            current.totalArea += parseFloat(title.sections?.area || 0)
            provinceMap.set(province, current)
          }
        }
      })

      return {
        success: true,
        distribution: Array.from(provinceMap.entries()).map(([province, data]) => ({
          province,
          ...data,
        })),
      }
    } catch (error) {
      logger.error('Exception getting province distribution', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

