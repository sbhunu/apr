/**
 * Sectional Geometry Service
 * Handles generation and storage of sectional unit geometries
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import {
  generateSectionalGeometries,
  UnitSpecification,
  GeometryGenerationResult,
  validateFloorLevels,
} from './geometry-generator'
import { parseWKTGeometry } from '@/lib/spatial/geometry'

/**
 * Generate and store sectional geometries for a survey plan
 */
export async function generateAndStoreSectionalGeometries(
  surveyPlanId: string,
  unitSpecifications: UnitSpecification[],
  userId: string
): Promise<{
  success: boolean
  result?: GeometryGenerationResult
  error?: string
}> {
  return monitor('generate_and_store_sectional_geometries', async () => {
    const supabase = await createClient()

    try {
      // Get survey plan with parent parcel geometry
      const { data: surveyPlan, error: planError } = await supabase
        .from('apr.survey_sectional_plans')
        .select('parent_parcel_geometry, planning_plan_id')
        .eq('id', surveyPlanId)
        .single()

      if (planError || !surveyPlan) {
        return {
          success: false,
          error: 'Survey plan not found',
        }
      }

      if (!surveyPlan.parent_parcel_geometry) {
        return {
          success: false,
          error: 'Parent parcel geometry not found. Please upload geometry first.',
        }
      }

      // Get approved planning plan to extract unit specifications if not provided
      let specs = unitSpecifications
      if (specs.length === 0 && surveyPlan.planning_plan_id) {
        const { data: planningPlan } = await supabase
          .from('apr.sectional_scheme_plans')
          .select('metadata')
          .eq('id', surveyPlan.planning_plan_id)
          .single()

        if (planningPlan?.metadata) {
          const metadata = planningPlan.metadata as {
            sections?: Array<{
              sectionNumber: string
              sectionType: string
              floorLevel: number
              coordinates: Array<{ x: number; y: number }>
              declaredArea?: number
            }>
          }

          if (metadata.sections) {
            specs = metadata.sections.map((s) => ({
              sectionNumber: s.sectionNumber,
              sectionType: s.sectionType as UnitSpecification['sectionType'],
              floorLevel: s.floorLevel,
              coordinates: s.coordinates.map((c) => ({ x: c.x, y: c.y })),
              declaredArea: s.declaredArea,
            }))
          }
        }
      }

      if (specs.length === 0) {
        return {
          success: false,
          error: 'No unit specifications provided',
        }
      }

      // Generate geometries
      const result = generateSectionalGeometries(
        surveyPlan.parent_parcel_geometry as string,
        specs
      )

      if (!result.success) {
        return {
          success: false,
          error: result.validation.errors.join('; '),
        }
      }

      // Validate floor levels
      const floorValidation = validateFloorLevels(result.units)
      if (!floorValidation.valid) {
        result.validation.errors.push(...floorValidation.errors)
        result.validation.warnings.push(...floorValidation.warnings)
      }

      // Store geometries in database
      const insertPromises = result.units.map((unit) =>
        supabase.from('apr.section_geometries').insert({
          survey_plan_id: surveyPlanId,
          section_number: unit.sectionNumber,
          section_type: unit.sectionType,
          floor_level: unit.floorLevel,
          geometry: unit.geometry,
          computed_area: unit.computedArea,
          declared_area: unit.declaredArea,
          area_difference: unit.areaDifference,
          dimensions: unit.dimensions,
          exclusive_use_areas: unit.exclusiveUseAreas,
          exclusive_use_area_total: unit.exclusiveUseAreaTotal,
          containment_validated: unit.containmentValidated,
          overlap_validated: unit.overlapValidated,
          validation_notes: [
            ...(unit.validationErrors || []),
            ...(unit.validationWarnings || []),
          ].join('; '),
          validated_by: userId,
          validated_at: new Date().toISOString(),
        })
      )

      const insertResults = await Promise.all(insertPromises)
      const insertErrors = insertResults.filter((r) => r.error)

      if (insertErrors.length > 0) {
        logger.error('Failed to store some geometries', {
          surveyPlanId,
          errors: insertErrors.map((e) => e.error),
        })
        return {
          success: false,
          error: `Failed to store ${insertErrors.length} geometries`,
        }
      }

      logger.info('Sectional geometries generated and stored', {
        surveyPlanId,
        unitCount: result.units.length,
        commonPropertyArea: result.commonProperty.area,
        userId,
      })

      return {
        success: true,
        result,
      }
    } catch (error) {
      logger.error('Exception generating sectional geometries', error as Error, {
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
 * Get sectional geometries for a survey plan
 */
export async function getSectionalGeometries(
  surveyPlanId: string
): Promise<{
  success: boolean
  geometries?: Array<{
    id: string
    sectionNumber: string
    sectionType: string
    floorLevel: number
    geometry: string
    computedArea: number
    exclusiveUseAreaTotal: number
    containmentValidated: boolean
    overlapValidated: boolean
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: geometries, error } = await supabase
      .from('apr.section_geometries')
      .select('id, section_number, section_type, floor_level, geometry, computed_area, exclusive_use_area_total, containment_validated, overlap_validated')
      .eq('survey_plan_id', surveyPlanId)
      .order('floor_level', { ascending: true })
      .order('section_number', { ascending: true })

    if (error) {
      throw error
    }

    return {
      success: true,
      geometries: geometries?.map((g) => ({
        id: g.id,
        sectionNumber: g.section_number,
        sectionType: g.section_type,
        floorLevel: g.floor_level,
        geometry: g.geometry,
        computedArea: g.computed_area,
        exclusiveUseAreaTotal: g.exclusive_use_area_total || 0,
        containmentValidated: g.containment_validated,
        overlapValidated: g.overlap_validated,
      })),
    }
  } catch (error) {
    logger.error('Failed to get sectional geometries', error as Error, {
      surveyPlanId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

