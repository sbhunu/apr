/**
 * Dispute Service
 * Handles dispute creation, assignment, and resolution workflows
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Dispute creation data
 */
export interface DisputeCreationData {
  disputeType: 'boundary' | 'ownership' | 'rights' | 'amendment' | 'lease' | 'mortgage' | 'other'
  titleId?: string
  schemeId?: string
  amendmentId?: string
  complainantName: string
  complainantIdNumber?: string
  complainantContactEmail?: string
  complainantContactPhone?: string
  complainantAddress?: string
  respondentName?: string
  respondentIdNumber?: string
  respondentContactEmail?: string
  respondentContactPhone?: string
  description: string
  supportingDocuments?: string[] // Array of document IDs
  requestedResolution?: string
}

/**
 * Dispute validation result
 */
export interface DisputeValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Dispute creation result
 */
export interface DisputeCreationResult {
  success: boolean
  disputeId?: string
  error?: string
}

/**
 * Validate dispute creation
 */
export async function validateDisputeCreation(
  data: DisputeCreationData
): Promise<DisputeValidationResult> {
  return monitor('validate_dispute_creation', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate at least one reference exists
      if (!data.titleId && !data.schemeId && !data.amendmentId) {
        errors.push('At least one reference (title, scheme, or amendment) must be provided')
      }

      // Validate complainant information
      if (!data.complainantName.trim()) {
        errors.push('Complainant name is required')
      }

      if (!data.description.trim()) {
        errors.push('Dispute description is required')
      }

      if (data.description.length < 50) {
        warnings.push('Dispute description should be at least 50 characters for clarity')
      }

      // Validate references exist
      if (data.titleId) {
        const { data: title, error: titleError } = await supabase
          .from('sectional_titles')
          .select('id')
          .eq('id', data.titleId)
          .single()

        if (titleError || !title) {
          errors.push('Referenced title not found')
        }
      }

      if (data.schemeId) {
        const { data: scheme, error: schemeError } = await supabase
          .from('sectional_schemes')
          .select('id')
          .eq('id', data.schemeId)
          .single()

        if (schemeError || !scheme) {
          errors.push('Referenced scheme not found')
        }
      }

      if (data.amendmentId) {
        const { data: amendment, error: amendmentError } = await supabase
          .from('scheme_amendments')
          .select('id')
          .eq('id', data.amendmentId)
          .single()

        if (amendmentError || !amendment) {
          errors.push('Referenced amendment not found')
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error) {
      logger.error('Exception validating dispute', error as Error, { data })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Create dispute
 */
export async function createDispute(
  data: DisputeCreationData
): Promise<DisputeCreationResult> {
  return monitor('create_dispute', async () => {
    const supabase = await createClient()

    // Validate dispute
    const validation = await validateDisputeCreation(data)
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join('; ')}`,
      }
    }

    // Create dispute record
    const { data: dispute, error: createError } = await supabase
      .from('disputes')
      .insert({
        dispute_type: data.disputeType,
        title_id: data.titleId || null,
        scheme_id: data.schemeId || null,
        amendment_id: data.amendmentId || null,
        complainant_name: data.complainantName,
        complainant_id_number: data.complainantIdNumber || null,
        complainant_contact_email: data.complainantContactEmail || null,
        complainant_contact_phone: data.complainantContactPhone || null,
        complainant_address: data.complainantAddress || null,
        respondent_name: data.respondentName || null,
        respondent_id_number: data.respondentIdNumber || null,
        respondent_contact_email: data.respondentContactEmail || null,
        respondent_contact_phone: data.respondentContactPhone || null,
        description: data.description,
        supporting_documents: data.supportingDocuments || [],
        requested_resolution: data.requestedResolution || null,
        status: 'submitted',
        workflow_state: 'submitted',
      })
      .select('id')
      .single()

    if (createError) {
      logger.error('Failed to create dispute', createError, { data })
      return {
        success: false,
        error: createError.message,
      }
    }

    logger.info('Dispute created successfully', {
      disputeId: dispute.id,
    })

    return {
      success: true,
      disputeId: dispute.id,
    }
  })
}

/**
 * Assign dispute to authority
 */
export async function assignDispute(
  disputeId: string,
  assignedTo: string,
  assignedAuthority: 'scheme_body' | 'district_admin' | 'provincial_admin' | 'land_commission' | 'ministry' | 'courts'
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('assign_dispute', async () => {
    const supabase = await createClient()

    try {
      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          status: 'assigned',
          workflow_state: 'assigned',
          assigned_to: assignedTo,
          assigned_authority: assignedAuthority,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        }
      }

      logger.info('Dispute assigned successfully', {
        disputeId,
        assignedTo,
        assignedAuthority,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Exception assigning dispute', error as Error, { disputeId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Schedule hearing for dispute
 */
export async function scheduleDisputeHearing(
  disputeId: string,
  hearingDate: string,
  hearingLocation: string,
  hearingOfficerId: string
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('schedule_dispute_hearing', async () => {
    const supabase = await createClient()

    try {
      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          status: 'hearing_scheduled',
          workflow_state: 'hearing_scheduled',
          hearing_date: hearingDate,
          hearing_location: hearingLocation,
          hearing_officer: hearingOfficerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        }
      }

      logger.info('Dispute hearing scheduled successfully', {
        disputeId,
        hearingDate,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Exception scheduling dispute hearing', error as Error, { disputeId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Resolve dispute
 */
export async function resolveDispute(
  disputeId: string,
  resolution: string,
  resolutionType: 'upheld' | 'dismissed' | 'compromise' | 'referred',
  resolvedById: string,
  resolutionDocumentId?: string
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('resolve_dispute', async () => {
    const supabase = await createClient()

    try {
      const { error: updateError } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          workflow_state: 'resolved',
          resolution,
          resolution_type: resolutionType,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedById,
          resolution_document_id: resolutionDocumentId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        }
      }

      logger.info('Dispute resolved successfully', {
        disputeId,
        resolvedById,
        resolutionType,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Exception resolving dispute', error as Error, { disputeId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get dispute by ID
 */
export async function getDispute(
  disputeId: string
): Promise<{
  success: boolean
  dispute?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: dispute, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Dispute not found',
        }
      }
      throw error
    }

    return {
      success: true,
      dispute,
    }
  } catch (error) {
    logger.error('Failed to get dispute', error as Error, { disputeId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending disputes for review
 */
export async function getPendingDisputes(): Promise<{
  success: boolean
  disputes?: Array<{
    id: string
    disputeType: string
    complainantName: string
    description: string
    submittedAt: string
    assignedAuthority?: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: disputes, error } = await supabase
      .from('disputes')
      .select('id, dispute_type, complainant_name, description, created_at, assigned_authority')
      .in('status', ['submitted', 'assigned', 'under_review'])
      .order('created_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      disputes:
        disputes?.map((d) => ({
          id: d.id,
          disputeType: d.dispute_type,
          complainantName: d.complainant_name,
          description: d.description,
          submittedAt: d.created_at,
          assignedAuthority: d.assigned_authority || undefined,
        })) || [],
    }
  } catch (error) {
    logger.error('Failed to get pending disputes', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

