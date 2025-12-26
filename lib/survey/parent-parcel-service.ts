/**
 * Parent Parcel Service
 * Handles parent parcel geometry upload and validation
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import {
  parseCSVCoordinates,
  transformCoordinatesToUTM,
  coordinatesToWKTPolygon,
  CoordinateParseResult,
} from './coordinate-parser'
import { validateGeometryBasic } from '@/lib/spatial/geometry'

/**
 * Upload parent parcel geometry
 */
export async function uploadParentParcelGeometry(
  surveyPlanId: string,
  coordinates: Array<{ x: number; y: number; z?: number }>,
  datum: string = 'WGS84',
  projection: string = 'UTM Zone 35S',
  userId: string
): Promise<{
  success: boolean
  geometryId?: string
  error?: string
}> {
  return monitor('upload_parent_parcel_geometry', async () => {
    const supabase = await createClient()

    try {
      // Validate coordinates
      if (coordinates.length < 3) {
        return {
          success: false,
          error: 'At least 3 coordinates required for a polygon',
        }
      }

      // Convert to WKT
      const wkt = coordinatesToWKTPolygon(
        coordinates.map((c) => ({ x: c.x, y: c.y, z: c.z }))
      )

      // Validate geometry
      const validation = validateGeometryBasic(wkt)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid geometry: ${validation.error}`,
        }
      }

      // Store geometry in parent_parcels table
      const { data: parcel, error: parcelError } = await supabase
        .from('apr.parent_parcels')
        .insert({
          survey_plan_id: surveyPlanId,
          geometry: wkt,
          datum,
          projection,
          created_by: userId,
        })
        .select('id')
        .single()

      if (parcelError) {
        logger.error('Failed to create parent parcel', parcelError, {
          surveyPlanId,
          userId,
        })
        return {
          success: false,
          error: parcelError.message,
        }
      }

      // Update survey plan with geometry reference
      const { error: updateError } = await supabase
        .from('apr.survey_sectional_plans')
        .update({
          parent_parcel_geometry: wkt,
          datum,
          projection,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', surveyPlanId)

      if (updateError) {
        logger.error('Failed to update survey plan', updateError, {
          surveyPlanId,
          userId,
        })
        return {
          success: false,
          error: updateError.message,
        }
      }

      logger.info('Parent parcel geometry uploaded', {
        surveyPlanId,
        parcelId: parcel.id,
        coordinateCount: coordinates.length,
        userId,
      })

      return {
        success: true,
        geometryId: parcel.id,
      }
    } catch (error) {
      logger.error('Exception uploading parent parcel geometry', error as Error, {
        surveyPlanId,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Parse and validate coordinate file
 */
export async function parseCoordinateFile(
  file: File,
  options: {
    format?: 'decimal' | 'utm' | 'dms'
    sourceSRID?: number
  } = {}
): Promise<CoordinateParseResult> {
  return monitor('parse_coordinate_file', async () => {
    try {
      const fileContent = await file.text()

      // Parse CSV
      const parseResult = parseCSVCoordinates(fileContent, {
        coordinateFormat: options.format || 'decimal',
        hasHeader: true,
      })

      // Transform to UTM if needed
      if (parseResult.success && options.sourceSRID && options.sourceSRID !== 32735) {
        const transformed = await transformCoordinatesToUTM(
          parseResult.coordinates,
          options.sourceSRID
        )
        parseResult.coordinates = transformed
        parseResult.projection = 'UTM Zone 35S'
        parseResult.datum = 'WGS84'
      }

      return parseResult
    } catch (error) {
      logger.error('Failed to parse coordinate file', error as Error, {
        fileName: file.name,
      })
      return {
        success: false,
        coordinates: [],
        format: 'csv',
        errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
      }
    }
  })
}

