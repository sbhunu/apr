/**
 * Communal Authorization Cross-Validation Service
 * Validates communal land authorization and tenure compliance during deeds examination
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Communal authorization validation result
 */
export interface CommunalValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  communalLandId?: string
  communalLandCustodianName?: string
  authorizationStatus?: 'authorized' | 'missing' | 'invalid'
}

/**
 * Cross-validate communal authorization for a title
 * Checks that the scheme has proper communal land authorization
 */
export async function validateCommunalAuthorization(
  titleId: string
): Promise<CommunalValidationResult> {
  return monitor('validate_communal_authorization', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get title with section, scheme, and planning plan
      // First get the title with scheme
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          section_id,
          restrictions,
          conditions,
          sections!inner(
            id,
            scheme_id,
            sectional_schemes!inner(
              id,
              scheme_number,
              scheme_name,
              communal_land_id,
              metadata,
              registration_date,
              survey_plan_id
            )
          )
        `)
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          isValid: false,
          errors: ['Title not found'],
          warnings: [],
        }
      }

      const section = (title as any).sections
      const scheme = section?.sectional_schemes
      const surveyPlanId = scheme?.survey_plan_id

      // Get planning plan separately via survey plan
      let planningPlan: any = null
      if (surveyPlanId) {
        const { data: surveyPlan } = await supabase
          .from('survey_sectional_plans')
          .select(`
            id,
            planning_plan_id,
            sectional_scheme_plans!inner(
              id,
              planning_authority,
              approval_status,
              approval_date
            )
          `)
          .eq('id', surveyPlanId)
          .single()

        planningPlan = (surveyPlan as any)?.sectional_scheme_plans
      }


      // Extract communal land information
      const communalLandId = scheme?.communal_land_id
      const schemeMetadata = (scheme?.metadata as Record<string, unknown>) || {}
      const communalLandCustodianName = schemeMetadata.communal_land_custodian_name as string | undefined

      // Validation 1: Communal land ID must be present
      if (!communalLandId || communalLandId.trim() === '') {
        errors.push('Communal land ID is required but missing. Scheme must be linked to parent communal land.')
      } else {
        // Validate format (basic check - should be alphanumeric with possible dashes/slashes)
        const validFormat = /^[A-Z0-9\-\/]+$/i.test(communalLandId.trim())
        if (!validFormat) {
          warnings.push(`Communal land ID format may be invalid: "${communalLandId}"`)
        }
      }

      // Validation 2: Communal land custodian must be linked
      if (!communalLandCustodianName || communalLandCustodianName.trim() === '') {
        errors.push('Communal land custodian name is required but missing. Scheme must identify the custodial authority.')
      } else {
        // Validate custodian name format (should be a proper name)
        const nameLength = communalLandCustodianName.trim().length
        if (nameLength < 3) {
          errors.push('Communal land custodian name appears to be invalid (too short)')
        } else if (nameLength > 200) {
          warnings.push('Communal land custodian name is unusually long')
        }
      }

      // Validation 3: Planning authority approval must exist
      if (!planningPlan) {
        errors.push('Planning plan not found. Scheme must have an approved planning plan.')
      } else if (planningPlan.approval_status !== 'approved') {
        errors.push(
          `Planning plan approval status is "${planningPlan.approval_status}". Scheme must have approved planning plan before deeds registration.`
        )
      }

      // Validation 4: Check for communal tenure restrictions/conditions
      const restrictions = title.restrictions || ''
      const conditions = title.conditions || ''

      // Check if restrictions mention communal tenure
      const hasCommunalRestrictions =
        restrictions.toLowerCase().includes('communal') ||
        restrictions.toLowerCase().includes('tenure') ||
        restrictions.toLowerCase().includes('custodian')

      if (!hasCommunalRestrictions && restrictions.trim() !== '') {
        warnings.push(
          'Restrictions do not explicitly mention communal tenure overlays. Consider adding communal tenure restrictions if applicable.'
        )
      }

      // Validation 5: Check for conflicts with existing schemes on same communal land
      if (communalLandId) {
        const { data: existingSchemes, error: schemesError } = await supabase
          .from('sectional_schemes')
          .select('id, scheme_number, scheme_name, registration_date')
          .eq('communal_land_id', communalLandId)
          .neq('id', scheme.id)
          .not('registration_date', 'is', null)

        if (!schemesError && existingSchemes && existingSchemes.length > 0) {
          // This is informational - multiple schemes can exist on same communal land
          warnings.push(
            `Found ${existingSchemes.length} other registered scheme(s) on the same communal land. Verify no spatial conflicts exist.`
          )
        }
      }

      // Validation 6: Verify scheme registration date is after planning approval
      if (scheme?.registration_date && planningPlan?.approval_date) {
        const registrationDate = new Date(scheme.registration_date)
        const approvalDate = new Date(planningPlan.approval_date)

        if (registrationDate < approvalDate) {
          errors.push(
            `Scheme registration date (${registrationDate.toLocaleDateString()}) is before planning approval date (${approvalDate.toLocaleDateString()}). This violates the workflow sequence.`
          )
        }
      }

      // Validation 7: Check metadata for authorization documents
      const authorizationDocuments = schemeMetadata.authorization_documents as
        | Array<{ type: string; url: string; date: string }>
        | undefined

      if (!authorizationDocuments || authorizationDocuments.length === 0) {
        warnings.push(
          'No authorization documents found in scheme metadata. Consider uploading communal land authorization documents.'
        )
      } else {
        // Check for required document types
        const documentTypes = authorizationDocuments.map((doc) => doc.type.toLowerCase())
        const hasCustodianAuthorization = documentTypes.some((type) =>
          type.includes('custodian') || type.includes('authorization')
        )

        if (!hasCustodianAuthorization) {
          warnings.push(
            'Authorization documents do not appear to include custodian authorization. Verify communal land custodian has authorized this scheme.'
          )
        }
      }

      // Determine authorization status
      let authorizationStatus: 'authorized' | 'missing' | 'invalid' = 'authorized'
      if (!communalLandId || !communalLandCustodianName) {
        authorizationStatus = 'missing'
      } else if (errors.length > 0) {
        authorizationStatus = 'invalid'
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        communalLandId: communalLandId || undefined,
        communalLandCustodianName: communalLandCustodianName || undefined,
        authorizationStatus,
      }
    } catch (error) {
      logger.error('Exception validating communal authorization', error as Error, {
        titleId,
      })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error during validation'],
        warnings: [],
      }
    }
  })
}

/**
 * Validate communal tenure compliance
 * Checks that the title complies with communal tenure regulations
 */
export async function validateCommunalTenureCompliance(
  titleId: string
): Promise<{
  isValid: boolean
  errors: string[]
  warnings: string[]
  complianceChecks: Array<{
    check: string
    passed: boolean
    details?: string
  }>
}> {
  return monitor('validate_communal_tenure_compliance', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []
    const complianceChecks: Array<{
      check: string
      passed: boolean
      details?: string
    }> = []

    try {
      // Get title with restrictions and conditions
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          restrictions,
          conditions,
          sections!inner(
            id,
            sectional_schemes!inner(
              id,
              communal_land_id,
              metadata
            )
          )
        `)
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          isValid: false,
          errors: ['Title not found'],
          warnings: [],
          complianceChecks: [],
        }
      }

      const scheme = (title as any).sections?.sectional_schemes
      const restrictions = title.restrictions || ''
      const conditions = title.conditions || ''

      // Check 1: Restrictions must acknowledge communal tenure
      const hasTenureAcknowledgment =
        restrictions.toLowerCase().includes('communal') ||
        restrictions.toLowerCase().includes('tenure') ||
        restrictions.toLowerCase().includes('custodial')

      complianceChecks.push({
        check: 'Communal tenure acknowledgment in restrictions',
        passed: hasTenureAcknowledgment,
        details: hasTenureAcknowledgment
          ? 'Restrictions properly acknowledge communal tenure'
          : 'Restrictions should explicitly mention communal tenure overlays',
      })

      if (!hasTenureAcknowledgment) {
        warnings.push(
          'Restrictions should explicitly acknowledge communal tenure overlays as required by Zimbabwean law'
        )
      }

      // Check 2: Conditions should not conflict with communal rights
      const hasConflictingConditions =
        conditions.toLowerCase().includes('exclusive') &&
        !conditions.toLowerCase().includes('subject to communal')

      complianceChecks.push({
        check: 'No conflicts with communal rights',
        passed: !hasConflictingConditions,
        details: hasConflictingConditions
          ? 'Conditions may conflict with communal land rights'
          : 'Conditions are compatible with communal tenure',
      })

      if (hasConflictingConditions) {
        errors.push(
          'Conditions contain exclusive rights language that may conflict with communal tenure. Review and ensure compliance with communal land regulations.'
        )
      }

      // Check 3: Verify scheme is properly registered
      if (!scheme?.communal_land_id) {
        complianceChecks.push({
          check: 'Scheme linked to communal land',
          passed: false,
          details: 'Scheme must be linked to parent communal land',
        })
        errors.push('Scheme is not properly linked to communal land')
      } else {
        complianceChecks.push({
          check: 'Scheme linked to communal land',
          passed: true,
          details: `Linked to communal land ID: ${scheme.communal_land_id}`,
        })
      }

      // Check 4: Verify no prohibited uses
      const prohibitedUses = ['mining', 'commercial farming', 'industrial']
      const hasProhibitedUse = prohibitedUses.some((use) =>
        conditions.toLowerCase().includes(use)
      )

      complianceChecks.push({
        check: 'No prohibited uses in conditions',
        passed: !hasProhibitedUse,
        details: hasProhibitedUse
          ? 'Conditions may include uses prohibited on communal land'
          : 'No prohibited uses detected',
      })

      if (hasProhibitedUse) {
        warnings.push(
          'Conditions may include uses that are restricted on communal land. Verify compliance with communal tenure regulations.'
        )
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        complianceChecks,
      }
    } catch (error) {
      logger.error('Exception validating communal tenure compliance', error as Error, {
        titleId,
      })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        complianceChecks: [],
      }
    }
  })
}

