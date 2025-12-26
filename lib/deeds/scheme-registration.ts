/**
 * Sectional Scheme Registration Service (Module 3)
 * Handles formal registration of sectional schemes as legal entities
 */

import { createClient } from '@/lib/supabase/server'
import { allocateSchemeNumber, confirmSchemeNumberAllocation } from './scheme-numbers'
import { PROVINCE_CODES, ProvinceCode } from './constants'
import { createBodyCorporate, BodyCorporateRegistrationData } from './body-corporate'
import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Sealed survey ready for registration
 */
export interface SealedSurveyForRegistration {
  id: string
  survey_number: string
  title: string
  surveyor_name: string
  sealed_at: string
  seal_hash: string
  planning_plan_id?: string
  province_code?: string
  section_count?: number
}

/**
 * Scheme registration data
 */
export interface SchemeRegistrationData {
  surveyPlanId: string
  schemeName: string
  provinceCode: ProvinceCode
  communalLandId?: string
  communalLandCustodianName?: string
  registrationDate?: string
  initialTrustees?: Array<{
    name: string
    idNumber?: string
    email?: string
    phone?: string
    role: 'chairperson' | 'secretary' | 'treasurer' | 'trustee'
  }>
  registeredAddress?: string
  contactEmail?: string
  contactPhone?: string
}

/**
 * Scheme registration result
 */
export interface SchemeRegistrationResult {
  success: boolean
  schemeId?: string
  schemeNumber?: string
  bodyCorporateId?: string
  bodyCorporateNumber?: string
  error?: string
}

/**
 * Get sealed surveys ready for scheme registration
 */
export async function getSealedSurveysForRegistration(): Promise<{
  success: boolean
  surveys?: SealedSurveyForRegistration[]
  error?: string
}> {
  return monitor('get_sealed_surveys_for_registration', async () => {
    const supabase = await createClient()

    try {
      // Get sealed surveys that don't have a registered scheme yet
      const { data: surveys, error } = await supabase
        .from('survey_sectional_plans')
        .select(`
          id,
          survey_number,
          title,
          surveyor_name,
          sealed_at,
          seal_hash,
          planning_plan_id,
          metadata
        `)
        .eq('status', 'sealed')
        .not('sealed_at', 'is', null)
        .order('sealed_at', { ascending: false })

      if (error) {
        logger.error('Failed to get sealed surveys', error, {})
        return {
          success: false,
          error: error.message,
        }
      }

      // Check which surveys already have registered schemes
      const surveyIds = surveys?.map((s) => s.id) || []
      const { data: existingSchemes } = await supabase
        .from('sectional_schemes')
        .select('survey_plan_id')
        .in('survey_plan_id', surveyIds)

      const registeredSurveyIds = new Set(existingSchemes?.map((s) => s.survey_plan_id) || [])

      // Filter out already registered surveys
      const availableSurveys = surveys?.filter((s) => !registeredSurveyIds.has(s.id)) || []

      // Get section counts
      const enrichedSurveys = await Promise.all(
        availableSurveys.map(async (survey) => {
          const { count } = await supabase
            .from('section_geometries')
            .select('*', { count: 'exact', head: true })
            .eq('survey_plan_id', survey.id)

          return {
            ...survey,
            section_count: count || 0,
            province_code: (survey.metadata as any)?.province_code,
          }
        })
      )

      return {
        success: true,
        surveys: enrichedSurveys,
      }
    } catch (error) {
      logger.error('Exception getting sealed surveys', error as Error, {})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Register a sectional scheme (Module 3)
 * This combines:
 * - Scheme number allocation
 * - Scheme registration
 * - Body Corporate creation
 * - Linking to communal land custodian
 */
export async function registerSectionalScheme(
  registrationData: SchemeRegistrationData
): Promise<SchemeRegistrationResult> {
  return monitor('register_sectional_scheme', async () => {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new ValidationError('Authentication required', 'scheme_registration')
    }

    // Validate required fields
    if (!registrationData.surveyPlanId) {
      throw new ValidationError('Survey Plan ID is required', 'scheme_registration')
    }

    if (!registrationData.schemeName) {
      throw new ValidationError('Scheme name is required', 'scheme_registration')
    }

    if (!PROVINCE_CODES.includes(registrationData.provinceCode)) {
      throw new ValidationError(
        `Invalid province code: ${registrationData.provinceCode}`,
        'scheme_registration'
      )
    }

    // Verify survey is sealed and get planning plan ID
    const { data: survey, error: surveyError } = await supabase
      .from('survey_sectional_plans')
      .select('id, status, sealed_at, seal_hash, survey_number, planning_plan_id')
      .eq('id', registrationData.surveyPlanId)
      .single()

    if (surveyError || !survey) {
      throw new ValidationError('Survey plan not found', 'scheme_registration', {
        surveyPlanId: registrationData.surveyPlanId,
      })
    }

    if (survey.status !== 'sealed') {
      throw new ValidationError(
        `Survey must be sealed before registration. Current status: ${survey.status}`,
        'scheme_registration',
        { surveyPlanId: registrationData.surveyPlanId, status: survey.status }
      )
    }

    if (!survey.sealed_at || !survey.seal_hash) {
      throw new ValidationError('Survey seal data is missing', 'scheme_registration', {
        surveyPlanId: registrationData.surveyPlanId,
      })
    }

    // Check if scheme already exists for this survey
    const { data: existingScheme } = await supabase
      .from('sectional_schemes')
      .select('id, scheme_number')
      .eq('survey_plan_id', registrationData.surveyPlanId)
      .single()

    if (existingScheme) {
      logger.warn('Scheme already registered for survey', {
        surveyPlanId: registrationData.surveyPlanId,
        schemeId: existingScheme.id,
        schemeNumber: existingScheme.scheme_number,
      })
      return {
        success: false,
        error: `Scheme already registered: ${existingScheme.scheme_number}`,
        schemeId: existingScheme.id,
        schemeNumber: existingScheme.scheme_number,
      }
    }

    try {
      // Step 1: Allocate scheme number
      const allocation = await allocateSchemeNumber(
        registrationData.provinceCode,
        new Date().getFullYear()
      )

      if (!allocation.success || !allocation.scheme_number) {
        throw new ValidationError(
          allocation.error || 'Failed to allocate scheme number',
          'scheme_registration'
        )
      }

      // Step 2: Create scheme record
      const registrationDate = registrationData.registrationDate || new Date().toISOString()
      if (!survey.planning_plan_id) {
        throw new ValidationError(
          'Survey plan must reference a planning plan',
          'scheme_registration',
          { surveyPlanId: registrationData.surveyPlanId }
        )
      }

      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .insert({
          survey_plan_id: registrationData.surveyPlanId,
          planning_plan_id: survey.planning_plan_id,
          scheme_number: allocation.scheme_number,
          scheme_name: registrationData.schemeName,
          registration_date: registrationDate,
          registered_by: user.id,
          communal_land_id: registrationData.communalLandId || null,
          status: 'registered',
          metadata: {
            province_code: registrationData.provinceCode,
            communal_land_custodian_name: registrationData.communalLandCustodianName || null,
            registration_notes: 'Registered via Module 3 workflow',
          },
        })
        .select('id, scheme_number')
        .single()

      if (schemeError || !scheme) {
        // Cancel the scheme number allocation if scheme creation failed
        if (allocation.allocation_id) {
          await supabase.rpc('cancel_scheme_number_allocation', {
            p_allocation_id: allocation.allocation_id,
            p_user_id: user.id,
            p_reason: 'Scheme registration failed',
          })
        }
        throw new ValidationError(
          schemeError?.message || 'Failed to create scheme record',
          'scheme_registration'
        )
      }

      // Step 3: Confirm scheme number allocation
      if (allocation.allocation_id) {
        await confirmSchemeNumberAllocation(allocation.allocation_id, scheme.id)
      }

      // Step 4: Create Body Corporate
      const bodyCorporateData: BodyCorporateRegistrationData = {
        schemeId: scheme.id,
        schemeName: registrationData.schemeName,
        schemeNumber: allocation.scheme_number,
        provinceCode: registrationData.provinceCode,
        initialTrustees: registrationData.initialTrustees,
        registeredAddress: registrationData.registeredAddress,
        contactEmail: registrationData.contactEmail,
        contactPhone: registrationData.contactPhone,
      }

      const bodyCorporateResult = await createBodyCorporate(bodyCorporateData)

      if (!bodyCorporateResult.success) {
        logger.error('Failed to create Body Corporate', new Error(bodyCorporateResult.error || 'Unknown error'), {
          schemeId: scheme.id,
        })
        // Don't fail the whole registration, but log the error
      }

      logger.info('Sectional scheme registered successfully', {
        schemeId: scheme.id,
        schemeNumber: allocation.scheme_number,
        surveyPlanId: registrationData.surveyPlanId,
        bodyCorporateId: bodyCorporateResult.bodyCorporateId,
      })

      return {
        success: true,
        schemeId: scheme.id,
        schemeNumber: allocation.scheme_number,
        bodyCorporateId: bodyCorporateResult.bodyCorporateId,
        bodyCorporateNumber: bodyCorporateResult.registrationNumber,
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      logger.error('Unexpected error registering scheme', error as Error, {
        surveyPlanId: registrationData.surveyPlanId,
      })
      throw new ValidationError(
        'Unexpected error registering scheme',
        'scheme_registration',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  })
}

/**
 * Get registered schemes
 */
export async function getRegisteredSchemes(): Promise<{
  success: boolean
  schemes?: Array<{
    id: string
    scheme_number: string
    scheme_name: string
    registration_date: string
    status: string
    body_corporate_id?: string
    survey_plan_id: string
  }>
  error?: string
}> {
  return monitor('get_registered_schemes', async () => {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase
        .from('sectional_schemes')
        .select('id, scheme_number, scheme_name, registration_date, status, body_corporate_id, survey_plan_id')
        .eq('status', 'registered')
        .order('registration_date', { ascending: false })

      if (error) {
        logger.error('Failed to get registered schemes', error, {})
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        schemes: data || [],
      }
    } catch (error) {
      logger.error('Exception getting registered schemes', error as Error, {})
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

