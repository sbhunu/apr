/**
 * Participation Quota Service
 * Handles quota calculation and database persistence
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import {
  calculateParticipationQuotas,
  adjustQuota,
  validateQuotaSum,
  UnitAreaData,
  QuotaCalculationResult,
} from './quota-calculator'

/**
 * Calculate and store quotas for a survey plan
 */
export async function calculateAndStoreQuotas(
  surveyPlanId: string,
  commonPropertyArea?: number,
  userId: string
): Promise<{
  success: boolean
  result?: QuotaCalculationResult
  error?: string
}> {
  return monitor('calculate_and_store_quotas', async () => {
    const supabase = await createClient()

    try {
      // Get all section geometries for the survey plan
      const { data: geometries, error: geomError } = await supabase
        .from('apr.section_geometries')
        .select('id, section_number, computed_area, section_type')
        .eq('survey_plan_id', surveyPlanId)
        .neq('section_type', 'common') // Exclude common property units

      if (geomError) {
        return {
          success: false,
          error: `Failed to fetch geometries: ${geomError.message}`,
        }
      }

      if (!geometries || geometries.length === 0) {
        return {
          success: false,
          error: 'No section geometries found for quota calculation',
        }
      }

      // Get common property area if not provided
      let commonArea = commonPropertyArea
      if (commonArea === undefined) {
        // Calculate from parent parcel area minus unit areas
        const { data: surveyPlan } = await supabase
          .from('apr.survey_sectional_plans')
          .select('parent_parcel_area')
          .eq('id', surveyPlanId)
          .single()

        const totalUnitArea = geometries.reduce(
          (sum, g) => sum + (g.computed_area || 0),
          0
        )
        commonArea = (surveyPlan?.parent_parcel_area || 0) - totalUnitArea
      }

      // Prepare unit data
      const units: UnitAreaData[] = geometries.map((g) => ({
        id: g.id,
        sectionNumber: g.section_number,
        area: g.computed_area || 0,
        sectionType: g.section_type as UnitAreaData['sectionType'],
      }))

      // Calculate quotas
      const result = calculateParticipationQuotas(units, commonArea || 0, {
        excludeCommonUnits: true,
        precision: 4,
        adjustTo100: true,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.errors?.join('; ') || 'Quota calculation failed',
        }
      }

      // Update quotas in database
      const updatePromises = result.quotas.map((quota) =>
        supabase
          .from('apr.section_geometries')
          .update({
            participation_quota: quota.quota,
            common_area_share: quota.commonAreaShare,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq('survey_plan_id', surveyPlanId)
          .eq('section_number', quota.sectionNumber)
      )

      const updateResults = await Promise.all(updatePromises)
      const updateErrors = updateResults.filter((r) => r.error)

      if (updateErrors.length > 0) {
        logger.error('Failed to update some quotas', {
          surveyPlanId,
          errors: updateErrors.map((e) => e.error),
        })
        return {
          success: false,
          error: `Failed to update ${updateErrors.length} quotas`,
        }
      }

      // Log quota history
      await logQuotaHistory(surveyPlanId, result, userId)

      logger.info('Quotas calculated and stored', {
        surveyPlanId,
        unitCount: result.quotas.length,
        totalQuota: result.totalQuota,
        userId,
      })

      return {
        success: true,
        result,
      }
    } catch (error) {
      logger.error('Exception calculating quotas', error as Error, {
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
 * Manually adjust quota for a specific unit
 */
export async function adjustUnitQuota(
  surveyPlanId: string,
  sectionNumber: string,
  newQuota: number,
  commonPropertyArea?: number,
  userId: string
): Promise<{
  success: boolean
  result?: QuotaCalculationResult
  error?: string
}> {
  return monitor('adjust_unit_quota', async () => {
    const supabase = await createClient()

    try {
      // Get all geometries
      const { data: geometries, error: geomError } = await supabase
        .from('apr.section_geometries')
        .select('id, section_number, computed_area, section_type')
        .eq('survey_plan_id', surveyPlanId)
        .neq('section_type', 'common')

      if (geomError || !geometries) {
        return {
          success: false,
          error: 'Failed to fetch geometries',
        }
      }

      // Find unit to adjust
      const unitToAdjust = geometries.find((g) => g.section_number === sectionNumber)
      if (!unitToAdjust) {
        return {
          success: false,
          error: `Section ${sectionNumber} not found`,
        }
      }

      // Get common property area if not provided
      let commonArea = commonPropertyArea
      if (commonArea === undefined) {
        const { data: surveyPlan } = await supabase
          .from('apr.survey_sectional_plans')
          .select('parent_parcel_area')
          .eq('id', surveyPlanId)
          .single()

        const totalUnitArea = geometries.reduce(
          (sum, g) => sum + (g.computed_area || 0),
          0
        )
        commonArea = (surveyPlan?.parent_parcel_area || 0) - totalUnitArea
      }

      // Prepare unit data
      const units: UnitAreaData[] = geometries.map((g) => ({
        id: g.id,
        sectionNumber: g.section_number,
        area: g.computed_area || 0,
        sectionType: g.section_type as UnitAreaData['sectionType'],
      }))

      // Adjust quota
      const result = adjustQuota(
        units,
        unitToAdjust.id,
        newQuota,
        commonArea || 0,
        4
      )

      if (!result.success) {
        return {
          success: false,
          error: result.errors?.join('; ') || 'Quota adjustment failed',
        }
      }

      // Update all quotas in database
      const updatePromises = result.quotas.map((quota) =>
        supabase
          .from('apr.section_geometries')
          .update({
            participation_quota: quota.quota,
            common_area_share: quota.commonAreaShare,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq('survey_plan_id', surveyPlanId)
          .eq('section_number', quota.sectionNumber)
      )

      const updateResults = await Promise.all(updatePromises)
      const updateErrors = updateResults.filter((r) => r.error)

      if (updateErrors.length > 0) {
        return {
          success: false,
          error: `Failed to update ${updateErrors.length} quotas`,
        }
      }

      // Log quota history
      await logQuotaHistory(surveyPlanId, result, userId, 'manual_adjustment')

      logger.info('Quota adjusted manually', {
        surveyPlanId,
        sectionNumber,
        newQuota,
        userId,
      })

      return {
        success: true,
        result,
      }
    } catch (error) {
      logger.error('Exception adjusting quota', error as Error, {
        surveyPlanId,
        sectionNumber,
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
 * Get quotas for a survey plan
 */
export async function getQuotas(
  surveyPlanId: string
): Promise<{
  success: boolean
  quotas?: Array<{
    sectionNumber: string
    quota: number
    area: number
    commonAreaShare: number
  }>
  validation?: {
    isValid: boolean
    total: number
    difference: number
    message: string
  }
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: geometries, error } = await supabase
      .from('apr.section_geometries')
      .select('section_number, participation_quota, computed_area, common_area_share')
      .eq('survey_plan_id', surveyPlanId)
      .neq('section_type', 'common')
      .order('section_number', { ascending: true })

    if (error) {
      throw error
    }

    if (!geometries || geometries.length === 0) {
      return {
        success: false,
        error: 'No quotas found',
      }
    }

    const quotas = geometries.map((g) => ({
      sectionNumber: g.section_number,
      quota: g.participation_quota || 0,
      area: g.computed_area || 0,
      commonAreaShare: g.common_area_share || 0,
    }))

    // Validate quota sum
    const validation = validateQuotaSum(quotas, 4)

    return {
      success: true,
      quotas,
      validation,
    }
  } catch (error) {
    logger.error('Failed to get quotas', error as Error, { surveyPlanId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log quota calculation history
 */
async function logQuotaHistory(
  surveyPlanId: string,
  result: QuotaCalculationResult,
  userId: string,
  action: string = 'calculation'
): Promise<void> {
  const supabase = await createClient()

  try {
    // Store history in survey plan metadata
    const { data: surveyPlan } = await supabase
      .from('apr.survey_sectional_plans')
      .select('metadata')
      .eq('id', surveyPlanId)
      .single()

    const metadata = (surveyPlan?.metadata as Record<string, unknown>) || {}
    const quotaHistory = (metadata.quotaHistory as Array<Record<string, unknown>>) || []

    quotaHistory.push({
      timestamp: new Date().toISOString(),
      userId,
      action,
      totalQuota: result.totalQuota,
      unitCount: result.quotas.length,
      adjustmentApplied: result.adjustmentApplied,
      adjustmentDetails: result.adjustmentDetails,
      quotas: result.quotas.map((q) => ({
        sectionNumber: q.sectionNumber,
        quota: q.quota,
      })),
    })

    // Keep only last 50 history entries
    const trimmedHistory = quotaHistory.slice(-50)

    await supabase
      .from('apr.survey_sectional_plans')
      .update({
        metadata: {
          ...metadata,
          quotaHistory: trimmedHistory,
        },
      })
      .eq('id', surveyPlanId)
  } catch (error) {
    logger.warn('Failed to log quota history', error as Error, {
      surveyPlanId,
      userId,
    })
    // Don't fail the operation if history logging fails
  }
}

