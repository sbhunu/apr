/**
 * Survey Computation Service
 * Handles computation execution and database persistence
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import {
  computeOutsideFigure,
  ComputationInput,
  ComputationResult,
  generateComputationReport,
} from './computation-engine'
import { COGOPoint } from '@/lib/spatial/cogo'

/**
 * Execute computation for a survey plan
 */
export async function executeComputation(
  surveyPlanId: string,
  userId: string
): Promise<{
  success: boolean
  result?: ComputationResult
  error?: string
}> {
  return monitor('execute_computation', async () => {
    const supabase = await createClient()

    try {
      // Get survey plan with geometry
      const { data: surveyPlan, error: planError } = await supabase
        .from('apr.survey_sectional_plans')
        .select('parent_parcel_geometry, control_points, metadata')
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

      // Extract coordinates from geometry (WKT format)
      // Parse WKT geometry to extract coordinates
      const { parseWKTGeometry } = await import('@/lib/spatial/geometry')
      try {
        const geom = parseWKTGeometry(surveyPlan.parent_parcel_geometry as string)
        if (geom.type === 'Polygon' && geom.coordinates) {
          const coords: COGOPoint[] = geom.coordinates[0].map((c: number[], i: number) => ({
            x: c[0],
            y: c[1],
            id: `P${i + 1}`,
          }))

            // Execute computation
            const input: ComputationInput = {
              coordinates: coords,
              surveyMethod: (surveyPlan.metadata as { surveyMethod?: string })?.surveyMethod as any,
              controlPoints: surveyPlan.control_points as COGOPoint[] | undefined,
            }

            const result = computeOutsideFigure(input)

            // Update survey plan with computation results
            const { error: updateError } = await supabase
              .from('apr.survey_sectional_plans')
              .update({
                closure_error: result.closure.closureError,
                accuracy_ratio: result.closure.closureErrorRatio,
                parent_parcel_area: result.area.area,
                computation_status: result.success ? 'completed' : 'failed',
                updated_at: new Date().toISOString(),
                updated_by: userId,
                metadata: {
                  ...(surveyPlan.metadata as object),
                  computationResult: {
                    closure: result.closure,
                    area: result.area,
                    accuracy: result.accuracy,
                    qualityControl: result.qualityControl,
                    report: generateComputationReport(result),
                  },
                },
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

            logger.info('Computation executed successfully', {
              surveyPlanId,
              closureError: result.closure.closureError,
              area: result.area.area,
              userId,
            })

            return {
              success: true,
              result,
            }
          } else {
            return {
              success: false,
              error: 'Geometry is not a valid polygon',
            }
          }
        } catch (parseError) {
          return {
            success: false,
            error: `Failed to parse geometry: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          }
        }
    } catch (error) {
      logger.error('Exception executing computation', error as Error, {
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
 * Get computation results for a survey plan
 */
export async function getComputationResults(
  surveyPlanId: string
): Promise<{
  success: boolean
  result?: ComputationResult
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: surveyPlan, error } = await supabase
      .from('apr.survey_sectional_plans')
      .select('closure_error, accuracy_ratio, parent_parcel_area, computation_status, metadata')
      .eq('id', surveyPlanId)
      .single()

    if (error || !surveyPlan) {
      return {
        success: false,
        error: 'Survey plan not found',
      }
    }

    if (surveyPlan.computation_status !== 'completed') {
      return {
        success: false,
        error: 'Computation not yet executed',
      }
    }

    const metadata = surveyPlan.metadata as {
      computationResult?: ComputationResult
    }

    if (!metadata?.computationResult) {
      return {
        success: false,
        error: 'Computation results not found',
      }
    }

    return {
      success: true,
      result: metadata.computationResult,
    }
  } catch (error) {
    logger.error('Failed to get computation results', error as Error, {
      surveyPlanId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

