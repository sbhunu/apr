/**
 * Scheme Plan Service
 * Service layer for scheme plan generation
 */

import { generateSchemePlan, SchemePlanOptions, SchemePlanResult } from './scheme-plan-generator'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Generate and store scheme plan
 */
export async function generateAndStoreSchemePlan(
  surveyPlanId: string,
  options: SchemePlanOptions = {},
  userId?: string
): Promise<{
  success: boolean
  pdfUrl?: string
  error?: string
  metadata?: SchemePlanResult['metadata']
}> {
  return monitor('generate_and_store_scheme_plan', async () => {
    try {
      // Generate PDF
      const result = await generateSchemePlan(surveyPlanId, options, userId)

      if (!result.success || !result.pdfBuffer) {
        return {
          success: false,
          error: result.error || 'Failed to generate scheme plan',
        }
      }

      // TODO: Upload PDF to Supabase Storage
      // For now, return success with metadata
      logger.info('Scheme plan generated successfully', {
        surveyPlanId,
        pageCount: result.pageCount,
        scale: result.metadata?.scale,
        userId,
      })

      return {
        success: true,
        metadata: result.metadata,
        // pdfUrl would be set after uploading to storage
      }
    } catch (error) {
      logger.error('Exception generating scheme plan', error as Error, {
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

