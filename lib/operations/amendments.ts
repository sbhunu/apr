/**
 * Scheme Amendment Service
 * Handles processing of scheme amendments (extensions, subdivisions, consolidations)
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { calculateParticipationQuotas, UnitAreaData } from '@/lib/survey/quota-calculator'

/**
 * Amendment submission data
 */
export interface AmendmentSubmissionData {
  schemeId: string
  amendmentType: 'extension' | 'subdivision' | 'consolidation' | 'exclusive_use_change' | 'quota_adjustment' | 'other'
  description: string
  reason: string
  affectedSectionIds: string[]
  newSectionCount?: number
  surveyPlanId?: string
  amendedGeometryWKT?: string
  newSections?: Array<{
    sectionNumber: string
    area: number
    sectionType?: string
  }>
}

/**
 * Amendment validation result
 */
export interface AmendmentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  geometryValid?: boolean
  quotaValid?: boolean
}

/**
 * Amendment processing result
 */
export interface AmendmentProcessingResult {
  success: boolean
  amendmentId?: string
  registrationNumber?: string
  newSectionIds?: string[]
  error?: string
}

/**
 * Validate amendment submission
 */
export async function validateAmendmentSubmission(
  data: AmendmentSubmissionData
): Promise<AmendmentValidationResult> {
  return monitor('validate_amendment_submission', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get scheme with current sections
      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .select(`
          id,
          scheme_number,
          sections(
            id,
            section_number,
            area,
            participation_quota,
            section_type
          )
        `)
        .eq('id', data.schemeId)
        .single()

      if (schemeError || !scheme) {
        return {
          isValid: false,
          errors: ['Scheme not found'],
          warnings: [],
        }
      }

      const sections = (scheme.sections as any[]) || []

      // Validate affected sections exist
      if (data.affectedSectionIds.length === 0) {
        errors.push('At least one affected section must be specified')
      }

      for (const sectionId of data.affectedSectionIds) {
        const section = sections.find((s: any) => s.id === sectionId)
        if (!section) {
          errors.push(`Affected section ${sectionId} not found in scheme`)
        }
      }

      // Type-specific validation
      if (data.amendmentType === 'extension') {
        if (!data.newSectionCount || data.newSectionCount <= 0) {
          errors.push('Extension requires new section count')
        }
        if (!data.surveyPlanId) {
          warnings.push('Extension should include survey plan')
        }
      }

      if (data.amendmentType === 'subdivision') {
        if (data.affectedSectionIds.length !== 1) {
          errors.push('Subdivision requires exactly one affected section')
        }
        if (!data.newSections || data.newSections.length < 2) {
          errors.push('Subdivision requires at least 2 new sections')
        }
        // Validate total area matches
        const affectedSection = sections.find((s: any) => s.id === data.affectedSectionIds[0])
        if (affectedSection && data.newSections) {
          const totalNewArea = data.newSections.reduce((sum, s) => sum + s.area, 0)
          const areaDifference = Math.abs(totalNewArea - affectedSection.area)
          if (areaDifference > 0.01) {
            warnings.push(
              `Subdivision area mismatch: original ${affectedSection.area} m², new total ${totalNewArea} m²`
            )
          }
        }
      }

      if (data.amendmentType === 'consolidation') {
        if (data.affectedSectionIds.length < 2) {
          errors.push('Consolidation requires at least 2 affected sections')
        }
        // Check all sections have same owner (simplified - would need title check)
        warnings.push('Consolidation requires all sections to have same owner')
      }

      // Validate geometry if provided
      let geometryValid = true
      if (data.amendedGeometryWKT) {
        try {
          const { data: validationResult, error: validationError } = await supabase.rpc(
            'st_isvalid',
            {
              geometry_wkt: data.amendedGeometryWKT,
            }
          )

          if (validationError || !validationResult?.is_valid) {
            geometryValid = false
            errors.push(
              `Invalid geometry: ${validationResult?.message || validationError?.message || 'Unknown error'}`
            )
          }
        } catch (geomError) {
          geometryValid = false
          errors.push('Failed to validate geometry')
        }
      }

      // Validate quotas if new sections provided
      let quotaValid = true
      if (data.newSections && data.newSections.length > 0) {
        const allSections = [...sections]
        // Add new sections for quota calculation
        const newSectionData: UnitAreaData[] = data.newSections.map((s) => ({
          id: `new-${s.sectionNumber}`,
          sectionNumber: s.sectionNumber,
          area: s.area,
          sectionType: (s.sectionType as UnitAreaData['sectionType']) || 'residential',
        }))

        // For subdivision, replace affected section with new ones
        if (data.amendmentType === 'subdivision') {
          const filtered = allSections.filter(
            (s: any) => !data.affectedSectionIds.includes(s.id)
          )
          allSections.length = 0
          allSections.push(...filtered)
        }

        // Add new sections
        const updatedSections: UnitAreaData[] = [
          ...allSections.map((s: any) => ({
            id: s.id,
            sectionNumber: s.section_number,
            area: s.area,
            sectionType: s.section_type as UnitAreaData['sectionType'],
          })),
          ...newSectionData,
        ]

        const quotaResult = calculateParticipationQuotas(updatedSections)
        if (!quotaResult.isValid || Math.abs(quotaResult.totalQuota - 100) > 0.0001) {
          quotaValid = false
          errors.push(
            `Quota calculation invalid: total quota ${quotaResult.totalQuota.toFixed(4)}% (must be 100.0000%)`
          )
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        geometryValid,
        quotaValid,
      }
    } catch (error) {
      logger.error('Exception validating amendment', error as Error, { data })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Submit amendment for processing
 */
export async function submitAmendment(
  data: AmendmentSubmissionData,
  userId: string
): Promise<AmendmentProcessingResult> {
  return monitor('submit_amendment', async () => {
    const supabase = await createClient()

    try {
      // Validate amendment
      const validation = await validateAmendmentSubmission(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join('; ')}`,
        }
      }

      // Generate amendment number
      const year = new Date().getFullYear()
      const amendmentNumber = `AMEND/${year}/HARARE/${Date.now().toString().slice(-6)}`

      // Create amendment record
      const { data: amendment, error: createError } = await supabase
        .from('scheme_amendments')
        .insert({
          scheme_id: data.schemeId,
          amendment_number: amendmentNumber,
          amendment_type: data.amendmentType,
          description: data.description,
          reason: data.reason,
          affected_section_ids: data.affectedSectionIds,
          new_section_count: data.newSectionCount || (data.newSections?.length || 0),
          survey_plan_id: data.surveyPlanId || null,
          amended_geometry: data.amendedGeometryWKT
            ? `SRID=32735;${data.amendedGeometryWKT}`
            : null,
          status: 'submitted',
          workflow_state: 'submitted',
          created_by: userId,
          updated_by: userId,
          metadata: {
            validationWarnings: validation.warnings,
            newSections: data.newSections,
          },
        })
        .select('id')
        .single()

      if (createError) {
        return {
          success: false,
          error: `Failed to create amendment: ${createError.message}`,
        }
      }

      logger.info('Amendment submitted successfully', {
        amendmentId: amendment.id,
        schemeId: data.schemeId,
        userId,
      })

      return {
        success: true,
        amendmentId: amendment.id,
      }
    } catch (error) {
      logger.error('Exception submitting amendment', error as Error, { data, userId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
  }
  })
}

/**
 * Process approved amendment (register and update scheme)
 */
export async function processAmendment(
  amendmentId: string,
  userId: string,
  approvalNumber?: string
): Promise<AmendmentProcessingResult> {
  return monitor('process_amendment', async () => {
    const supabase = await createClient()

    try {
      // Get amendment with scheme and section data
      const { data: amendment, error: amendmentError } = await supabase
        .from('scheme_amendments')
        .select(`
          id,
          scheme_id,
          amendment_type,
          affected_section_ids,
          new_section_count,
          amended_geometry,
          status,
          metadata,
          sectional_schemes!inner(
            id,
            scheme_number,
            sections(
              id,
              section_number,
              area,
              participation_quota,
              section_type
            )
          )
        `)
        .eq('id', amendmentId)
        .single()

      if (amendmentError || !amendment) {
        return {
          success: false,
          error: 'Amendment not found',
        }
      }

      // Verify amendment is approved
      if (amendment.status !== 'approved') {
        return {
          success: false,
          error: `Amendment must be approved before processing. Current status: ${amendment.status}`,
        }
      }

      const scheme = (amendment.sectional_schemes as any)
      const sections = (scheme.sections as any[]) || []
      const metadata = (amendment.metadata as Record<string, unknown>) || {}
      const newSections = (metadata.newSections as Array<{
        sectionNumber: string
        area: number
        sectionType?: string
      }>) || []

      // Generate registration number
      const registrationNumber = `AMEND/${new Date().getFullYear()}/${amendmentId.substring(0, 8).toUpperCase()}`

      const newSectionIds: string[] = []

      // Process based on amendment type
      if (amendment.amendment_type === 'extension' && newSections.length > 0) {
        // Create new sections
        for (const newSection of newSections) {
          const { data: createdSection, error: createError } = await supabase
            .from('sections')
            .insert({
              scheme_id: amendment.scheme_id,
              section_number: newSection.sectionNumber,
              area: newSection.area,
              section_type: newSection.sectionType || 'residential',
              participation_quota: 0, // Will be recalculated
              created_by: userId,
              updated_by: userId,
            })
            .select('id')
            .single()

          if (createError) {
            logger.error('Failed to create new section', createError, {
              amendmentId,
              sectionNumber: newSection.sectionNumber,
            })
            continue
          }

          newSectionIds.push(createdSection.id)
        }
      } else if (amendment.amendment_type === 'subdivision') {
        // Mark affected section as cancelled
        const affectedSectionId = amendment.affected_section_ids[0]
        await supabase
          .from('sections')
          .update({
            section_type: 'cancelled',
            updated_at: new Date().toISOString(),
            updated_by: userId,
            metadata: {
              cancelled_by_amendment: amendmentId,
              cancelled_at: new Date().toISOString(),
            },
          })
          .eq('id', affectedSectionId)

        // Create new sections
        for (const newSection of newSections) {
          const { data: createdSection, error: createError } = await supabase
            .from('sections')
            .insert({
              scheme_id: amendment.scheme_id,
              section_number: newSection.sectionNumber,
              area: newSection.area,
              section_type: newSection.sectionType || 'residential',
              participation_quota: 0, // Will be recalculated
              created_by: userId,
              updated_by: userId,
              metadata: {
                created_by_amendment: amendmentId,
                original_section_id: affectedSectionId,
              },
            })
            .select('id')
            .single()

          if (createError) {
            logger.error('Failed to create subdivided section', createError, {
              amendmentId,
              sectionNumber: newSection.sectionNumber,
            })
            continue
          }

          newSectionIds.push(createdSection.id)
        }
      } else if (amendment.amendment_type === 'consolidation') {
        // Mark all affected sections as cancelled
        for (const sectionId of amendment.affected_section_ids) {
          await supabase
            .from('sections')
            .update({
              section_type: 'cancelled',
              updated_at: new Date().toISOString(),
              updated_by: userId,
              metadata: {
                cancelled_by_amendment: amendmentId,
                cancelled_at: new Date().toISOString(),
              },
            })
            .eq('id', sectionId)
        }

        // Create consolidated section
        const totalArea = sections
          .filter((s: any) => amendment.affected_section_ids.includes(s.id))
          .reduce((sum: number, s: any) => sum + s.area, 0)

        const { data: createdSection, error: createError } = await supabase
          .from('sections')
          .insert({
            scheme_id: amendment.scheme_id,
            section_number: newSections[0]?.sectionNumber || 'CONSOLIDATED',
            area: totalArea,
            section_type: newSections[0]?.sectionType || 'residential',
            participation_quota: 0, // Will be recalculated
            created_by: userId,
            updated_by: userId,
            metadata: {
              created_by_amendment: amendmentId,
              consolidated_from: amendment.affected_section_ids,
            },
          })
          .select('id')
          .single()

        if (!createError && createdSection) {
          newSectionIds.push(createdSection.id)
        }
      }

      // Recalculate quotas for all sections in scheme
      const { data: allSections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, section_number, area, section_type')
        .eq('scheme_id', amendment.scheme_id)
        .neq('section_type', 'cancelled')

      if (!sectionsError && allSections) {
        const unitData: UnitAreaData[] = allSections.map((s: any) => ({
          id: s.id,
          sectionNumber: s.section_number,
          area: s.area,
          sectionType: (s.section_type as UnitAreaData['sectionType']) || 'residential',
        }))

        const quotaResult = calculateParticipationQuotas(unitData)

        // Update quotas for all sections
        for (const quota of quotaResult.quotas) {
          const section = allSections.find((s: any) => s.section_number === quota.sectionNumber)
          if (section) {
            await supabase
              .from('sections')
              .update({
                participation_quota: quota.quota,
                updated_at: new Date().toISOString(),
                updated_by: userId,
              })
              .eq('id', section.id)
          }
        }
      }

      // Update amendment with registration details
      const { error: registerError } = await supabase
        .from('scheme_amendments')
        .update({
          status: 'registered',
          workflow_state: 'registered',
          registration_number: registrationNumber,
          registered_at: new Date().toISOString(),
          registered_by: userId,
          approval_number: approvalNumber || null,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', amendmentId)

      if (registerError) {
        logger.error('Failed to update amendment registration', registerError, {
          amendmentId,
        })
        // Don't fail - sections are updated
      }

      logger.info('Amendment processed successfully', {
        amendmentId,
        schemeId: amendment.scheme_id,
        registrationNumber,
        newSectionIds,
        userId,
      })

      return {
        success: true,
        amendmentId,
        registrationNumber,
        newSectionIds,
      }
    } catch (error) {
      logger.error('Exception processing amendment', error as Error, {
        amendmentId,
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
 * Get amendment history for a scheme
 */
export async function getAmendmentHistory(
  schemeId: string
): Promise<{
  success: boolean
  amendments?: Array<{
    id: string
    amendmentType: string
    description: string
    status: string
    submittedAt: string
    registeredAt?: string
    registrationNumber?: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: amendments, error } = await supabase
      .from('scheme_amendments')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      amendments:
        amendments?.map((a: any) => ({
          id: a.id,
          amendmentType: a.amendment_type,
          description: a.description,
          status: a.status,
          submittedAt: a.created_at,
          registeredAt: a.registered_at || undefined,
          registrationNumber: a.registration_number || undefined,
        })) || [],
    }
  } catch (error) {
    logger.error('Exception getting amendment history', error as Error, { schemeId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending amendments for review
 */
export async function getPendingAmendments(): Promise<{
  success: boolean
  amendments?: Array<{
    id: string
    schemeNumber: string
    amendmentType: string
    description: string
    affectedSectionCount: number
    submittedAt: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: amendments, error } = await supabase
      .from('scheme_amendments')
      .select('id, scheme_id, amendment_type, description, affected_section_ids, created_at')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })

    if (error) {
      // If table doesn't exist or join syntax error, return empty array
      if (error.code === 'PGRST205' || 
          error.message.includes('schema cache') || 
          error.message.includes('parse') ||
          error.message.includes('failed to parse')) {
        logger.warn('scheme_amendments table/view not accessible or join syntax error', { 
          error: error.message,
          code: error.code 
        })
        return {
          success: true,
          amendments: [],
        }
      }
      return {
        success: false,
        error: error.message,
      }
    }

    // Get schemes separately
    const schemeIds = amendments?.map((a: any) => a.scheme_id) || []
    const { data: schemes } = await supabase
      .from('sectional_schemes')
      .select('id, scheme_number')
      .in('id', schemeIds)

    const schemeMap = new Map(schemes?.map((s: any) => [s.id, s.scheme_number]) || [])

    return {
      success: true,
      amendments:
        amendments?.map((a: any) => ({
          id: a.id,
          schemeNumber: schemeMap.get(a.scheme_id) || 'Unknown',
          amendmentType: a.amendment_type,
          description: a.description,
          affectedSectionCount: (a.affected_section_ids as string[])?.length || 0,
          submittedAt: a.created_at,
        })) || [],
    }
  } catch (error) {
    logger.error('Exception getting pending amendments', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

