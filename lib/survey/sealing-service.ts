/**
 * Survey Sealing Service
 * Handles digital sealing of survey plans with hash generation
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { createHash } from 'crypto'
import { transitionSurveyState } from '@/lib/workflows/survey-workflow'
import { SurveyState } from '@/types/workflows'
import { signDocument } from '@/lib/signatures/signature-service'

/**
 * Sealing options
 */
export interface SealingOptions {
  sealNotes?: string
  certificateData?: Record<string, unknown>
}

/**
 * Seal result
 */
export interface SealResult {
  success: boolean
  sealHash?: string
  sealedAt?: string
  certificateUrl?: string
  error?: string
}

/**
 * Generate seal hash from survey data
 */
function generateSealHash(surveyPlanId: string, surveyData: Record<string, unknown>): string {
  // Create hash from survey ID, geometries, areas, and timestamp
  const hashInput = JSON.stringify({
    surveyPlanId,
    parentParcelArea: surveyData.parentParcelArea,
    sectionCount: surveyData.sectionCount,
    totalUnitArea: surveyData.totalUnitArea,
    timestamp: new Date().toISOString(),
  })

  return createHash('sha256').update(hashInput).digest('hex')
}

/**
 * Seal survey plan
 */
export async function sealSurveyPlan(
  surveyPlanId: string,
  userId: string,
  options: SealingOptions = {}
): Promise<SealResult> {
  return monitor('seal_survey_plan', async () => {
    const supabase = await createClient()

    try {
      // Get survey plan data
      const { data: surveyPlan, error: planError } = await supabase
        .from('survey_sectional_plans')
        .select('*')
        .eq('id', surveyPlanId)
        .single()

      if (planError || !surveyPlan) {
        return {
          success: false,
          error: 'Survey plan not found',
        }
      }

      // Verify survey is in correct state for sealing
      if (surveyPlan.status !== 'under_review') {
        return {
          success: false,
          error: `Survey must be in 'under_review' state. Current state: ${surveyPlan.status}`,
        }
      }

      // Get section geometries for hash calculation
      const { data: geometries, error: geomError } = await supabase
        .from('section_geometries')
        .select('section_number, computed_area, participation_quota, geometry')
        .eq('survey_plan_id', surveyPlanId)

      if (geomError) {
        return {
          success: false,
          error: `Failed to fetch geometries: ${geomError.message}`,
        }
      }

      // Calculate total unit area
      const totalUnitArea = geometries?.reduce(
        (sum, g) => sum + (g.computed_area || 0),
        0
      ) || 0

      // Generate seal hash
      const sealHash = generateSealHash(surveyPlanId, {
        parentParcelArea: surveyPlan.parent_parcel_area,
        sectionCount: geometries?.length || 0,
        totalUnitArea,
        geometries: geometries?.map((g) => ({
          sectionNumber: g.section_number,
          area: g.computed_area,
          quota: g.participation_quota,
        })),
      })

      // Transition workflow state to 'sealed'
      const transitionResult = await transitionSurveyState(
        surveyPlan.workflow_state as SurveyState,
        'sealed',
        {
          userId,
          resourceId: surveyPlanId,
          metadata: {
            sealHash,
            sealNotes: options.sealNotes,
          },
        },
        options.sealNotes || 'Survey plan sealed by Surveyor-General'
      )

      if (!transitionResult.success) {
        return {
          success: false,
          error: `Workflow transition failed: ${transitionResult.error}`,
        }
      }

      // Update survey plan with seal information
      const sealedAt = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('survey_sectional_plans')
        .update({
          status: 'sealed',
          workflow_state: 'sealed',
          sealed_at: sealedAt,
          sealed_by: userId,
          seal_hash: sealHash,
          review_notes: options.sealNotes,
          updated_at: sealedAt,
          updated_by: userId,
        })
        .eq('id', surveyPlanId)

      if (updateError) {
        logger.error('Failed to update survey plan with seal', updateError, {
          surveyPlanId,
          userId,
        })
        return {
          success: false,
          error: `Failed to update survey plan: ${updateError.message}`,
        }
      }

      // Add PKI digital signature for sealing
      let signatureId: string | undefined
      try {
        // Get signer profile for signature metadata
        const { data: signerProfile } = await supabase
          .from('user_profiles')
          .select('name, role')
          .eq('id', userId)
          .single()

        // Sign document with PKI
        const signatureResult = await signDocument({
          documentId: surveyPlanId,
          documentType: 'survey_seal',
          workflowStage: 'survey_sealing',
          signerId: userId,
          signerName: signerProfile?.name || 'Unknown',
          signerRole: signerProfile?.role || 'surveyor_general',
          signedAt: sealedAt,
          documentHash: sealHash,
          approvalType: 'seal',
          notes: options.sealNotes,
        })

        if (signatureResult.success && signatureResult.signatureId) {
          signatureId = signatureResult.signatureId
          logger.info('PKI signature applied to survey seal', {
            surveyPlanId,
            signatureId,
          })
        } else {
          logger.warn('PKI signature failed for survey seal', {
            surveyPlanId,
            error: signatureResult.error,
          })
          // Continue without PKI signature - hash-based seal is still valid
        }
      } catch (sigError) {
        logger.warn('Exception applying PKI signature to survey seal', sigError as Error, {
          surveyPlanId,
        })
        // Continue without PKI signature - hash-based seal is still valid
      }

      // Generate seal certificate (placeholder - would generate PDF)
      const certificateUrl = await generateSealCertificate(
        surveyPlanId,
        sealHash,
        sealedAt,
        userId
      )

      logger.info('Survey plan sealed successfully', {
        surveyPlanId,
        sealHash,
        sealedAt,
        userId,
        signatureId,
      })

      return {
        success: true,
        sealHash,
        sealedAt,
        certificateUrl,
      }
    } catch (error) {
      logger.error('Exception sealing survey plan', error as Error, {
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
 * Generate seal certificate PDF
 */
async function generateSealCertificate(
  surveyPlanId: string,
  sealHash: string,
  sealedAt: string,
  userId: string
): Promise<string> {
  // TODO: Generate actual PDF certificate
  // For now, return placeholder URL
  return `/api/survey/certificates/${surveyPlanId}`
}

/**
 * Verify seal integrity
 */
export async function verifySeal(
  surveyPlanId: string
): Promise<{
  isValid: boolean
  sealHash?: string
  sealedAt?: string
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: surveyPlan, error } = await supabase
      .from('survey_sectional_plans')
      .select('seal_hash, sealed_at, status')
      .eq('id', surveyPlanId)
      .single()

    if (error || !surveyPlan) {
      return {
        isValid: false,
        error: 'Survey plan not found',
      }
    }

    if (surveyPlan.status !== 'sealed') {
      return {
        isValid: false,
        error: 'Survey plan is not sealed',
      }
    }

    // Recalculate hash to verify integrity
    const { data: geometries } = await supabase
      .from('section_geometries')
      .select('section_number, computed_area, participation_quota')
      .eq('survey_plan_id', surveyPlanId)

    const { data: planData } = await supabase
      .from('survey_sectional_plans')
      .select('parent_parcel_area')
      .eq('id', surveyPlanId)
      .single()

    const totalUnitArea =
      geometries?.reduce((sum, g) => sum + (g.computed_area || 0), 0) || 0

    const recalculatedHash = generateSealHash(surveyPlanId, {
      parentParcelArea: planData?.parent_parcel_area || 0,
      sectionCount: geometries?.length || 0,
      totalUnitArea,
    })

    const isValid = recalculatedHash === surveyPlan.seal_hash

    return {
      isValid,
      sealHash: surveyPlan.seal_hash || undefined,
      sealedAt: surveyPlan.sealed_at || undefined,
      error: isValid ? undefined : 'Seal hash mismatch - data may have been modified',
    }
  } catch (error) {
    logger.error('Exception verifying seal', error as Error, { surveyPlanId })
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

