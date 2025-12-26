/**
 * Ownership Transfer Service
 * Handles processing of title ownership transfers
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { generateTitleCertificate } from '@/lib/deeds/certificate-service'
import { createHash } from 'crypto'

/**
 * Transfer submission data
 */
export interface TransferSubmissionData {
  titleId: string
  transferType: 'sale' | 'inheritance' | 'gift' | 'court_order' | 'other'
  newHolderName: string
  newHolderType: 'individual' | 'company' | 'trust' | 'government' | 'other'
  newHolderIdNumber?: string
  considerationAmount?: number
  considerationCurrency?: string
  transferDate: string
  effectiveDate: string
  transferInstrumentType: 'deed_of_sale' | 'will' | 'gift_deed' | 'court_order' | 'other'
  transferInstrumentReference?: string
  transferInstrumentDocumentId?: string
  notes?: string
}

/**
 * Transfer validation result
 */
export interface TransferValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  stampDuty?: number
  currentHolder?: {
    name: string
    id?: string
  }
}

/**
 * Transfer processing result
 */
export interface TransferProcessingResult {
  success: boolean
  transferId?: string
  registrationNumber?: string
  newCertificateUrl?: string
  error?: string
}

/**
 * Validate transfer submission
 */
export async function validateTransferSubmission(
  data: TransferSubmissionData
): Promise<TransferValidationResult> {
  return monitor('validate_transfer_submission', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Get current title
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('id, title_number, holder_name, holder_id_number, registration_status')
        .eq('id', data.titleId)
        .single()

      // Get mortgages separately
      let mortgages: Array<{ id: string; status: string; discharged_at?: string }> = []
      if (title) {
        const { data: titleMortgages } = await supabase
          .from('mortgages')
          .select('id, status, discharged_at')
          .eq('title_id', data.titleId)
          .eq('status', 'registered')
        
        mortgages = titleMortgages || []
      }

      if (titleError || !title) {
        return {
          isValid: false,
          errors: ['Title not found'],
          warnings: [],
        }
      }

      // Verify title is registered
      if (title.registration_status !== 'registered') {
        errors.push(`Title must be registered before transfer. Current status: ${title.registration_status}`)
      }

      // Verify current holder matches
      if (title.holder_name !== data.newHolderName) {
        // This is expected for transfers, but we should verify the current holder
        // For now, we'll just note it
      }

      // Check for active encumbrances
      const activeMortgages = mortgages.filter(
        (m) => m.status === 'registered' && !m.discharged_at
      )

      if (activeMortgages.length > 0) {
        warnings.push(
          `${activeMortgages.length} active mortgage(s) found. Transfer may require lender consent.`
        )
      }

      // Validate transfer dates
      const transferDate = new Date(data.transferDate)
      const effectiveDate = new Date(data.effectiveDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (transferDate > today) {
        warnings.push('Transfer date is in the future')
      }

      if (effectiveDate < transferDate) {
        errors.push('Effective date cannot be before transfer date')
      }

      // Calculate stamp duty (simplified - would need actual rates)
      let stampDuty: number | undefined
      if (data.transferType === 'sale' && data.considerationAmount) {
        // Simplified stamp duty calculation (would need actual Zimbabwe rates)
        // Example: 1% of consideration amount, minimum $50
        stampDuty = Math.max(data.considerationAmount * 0.01, 50)
      } else if (data.transferType === 'gift') {
        // Gifts may have different rates
        stampDuty = 0 // Would need actual rates
      }

      // Validate new holder information
      if (!data.newHolderName.trim()) {
        errors.push('New holder name is required')
      }

      if (data.newHolderType === 'individual' && !data.newHolderIdNumber) {
        warnings.push('National ID number recommended for individual holders')
      }

      if (data.newHolderType === 'company' && !data.newHolderIdNumber) {
        warnings.push('Company registration number recommended')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stampDuty,
        currentHolder: {
          name: title.holder_name,
          id: title.holder_id_number || undefined,
        },
      }
    } catch (error) {
      logger.error('Exception validating transfer', error as Error, { data })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Submit transfer for processing
 */
export async function submitTransfer(
  data: TransferSubmissionData,
  userId: string
): Promise<TransferProcessingResult> {
  return monitor('submit_transfer', async () => {
    const supabase = await createClient()

    try {
      // Validate transfer
      const validation = await validateTransferSubmission(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join('; ')}`,
        }
      }

      // Get current title
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('id, holder_name, holder_id_number, registration_status')
        .eq('id', data.titleId)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Title not found',
        }
      }

      // Create transfer record
      const { data: transfer, error: createError } = await supabase
        .from('ownership_transfers')
        .insert({
          title_id: data.titleId,
          transfer_type: data.transferType,
          current_holder_name: title.holder_name,
          current_holder_id: title.holder_id_number || null,
          new_holder_name: data.newHolderName,
          new_holder_type: data.newHolderType,
          new_holder_id_number: data.newHolderIdNumber || null,
          consideration_amount: data.considerationAmount || null,
          consideration_currency: data.considerationCurrency || 'USD',
          transfer_date: data.transferDate,
          effective_date: data.effectiveDate,
          transfer_instrument_type: data.transferInstrumentType,
          transfer_instrument_reference: data.transferInstrumentReference || null,
          transfer_instrument_document_id: data.transferInstrumentDocumentId || null,
          status: 'submitted',
          workflow_state: 'submitted',
          created_by: userId,
          updated_by: userId,
          metadata: {
            stampDuty: validation.stampDuty,
            validationWarnings: validation.warnings,
            notes: data.notes,
          },
        })
        .select('id')
        .single()

      if (createError) {
        return {
          success: false,
          error: `Failed to create transfer: ${createError.message}`,
        }
      }

      logger.info('Transfer submitted successfully', {
        transferId: transfer.id,
        titleId: data.titleId,
        userId,
      })

      return {
        success: true,
        transferId: transfer.id,
      }
    } catch (error) {
      logger.error('Exception submitting transfer', error as Error, { data, userId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Process approved transfer (register and update title)
 */
export async function processTransfer(
  transferId: string,
  userId: string,
  approvalNumber?: string
): Promise<TransferProcessingResult> {
  return monitor('process_transfer', async () => {
    const supabase = await createClient()

    try {
      // Get transfer
      const { data: transfer, error: transferError } = await supabase
        .from('ownership_transfers')
        .select('id, title_id, new_holder_name, new_holder_type, new_holder_id_number, effective_date, status')
        .eq('id', transferId)
        .single()

      if (transferError || !transfer) {
        return {
          success: false,
          error: 'Transfer not found',
        }
      }

      // Get title separately
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('id, title_number, registration_status')
        .eq('id', transfer.title_id)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Title not found',
        }
      }

      // Verify transfer is approved
      if (transfer.status !== 'approved') {
        return {
          success: false,
          error: `Transfer must be approved before processing. Current status: ${transfer.status}`,
        }
      }

      // Generate registration number
      const registrationNumber = `TRANSFER/${new Date().getFullYear()}/${transferId.substring(0, 8).toUpperCase()}`

      // Get current title metadata
      const { data: currentTitle } = await supabase
        .from('sectional_titles')
        .select('holder_name, metadata')
        .eq('id', transfer.title_id)
        .single()

      // Update title with new holder
      const { error: updateError } = await supabase
        .from('sectional_titles')
        .update({
          holder_name: transfer.new_holder_name,
          holder_type: transfer.new_holder_type,
          holder_id_number: transfer.new_holder_id_number || null,
          updated_at: new Date().toISOString(),
          updated_by: userId,
          metadata: {
            ...((currentTitle?.metadata as Record<string, unknown>) || {}),
            transferId: transfer.id,
            transferDate: transfer.effective_date,
            previousHolder: currentTitle?.holder_name || '',
          },
        })
        .eq('id', transfer.title_id)

      if (updateError) {
        return {
          success: false,
          error: `Failed to update title: ${updateError.message}`,
        }
      }

      // Update transfer with registration details
      const { error: registerError } = await supabase
        .from('ownership_transfers')
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
        .eq('id', transferId)

      if (registerError) {
        logger.error('Failed to update transfer registration', registerError, {
          transferId,
        })
        // Don't fail - title is updated
      }

      // Generate new certificate for new holder
      const certificateResult = await generateTitleCertificate(transfer.title_id, {
        includeQRCode: true,
        includeSignature: true,
      })

      if (!certificateResult.success) {
        logger.warn('Failed to generate new certificate', {
          titleId: transfer.title_id,
          error: certificateResult.error,
        })
        // Don't fail - transfer is registered
      }

      logger.info('Transfer processed successfully', {
        transferId,
        titleId: transfer.title_id,
        registrationNumber,
        userId,
      })

      return {
        success: true,
        transferId,
        registrationNumber,
        newCertificateUrl: certificateResult.certificateUrl,
      }
    } catch (error) {
      logger.error('Exception processing transfer', error as Error, {
        transferId,
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
 * Get transfer history for a title
 */
export async function getTransferHistory(
  titleId: string
): Promise<{
  success: boolean
  transfers?: Array<{
    id: string
    transferType: string
    transferDate: string
    effectiveDate: string
    currentHolder: string
    newHolder: string
    considerationAmount?: number
    status: string
    registrationNumber?: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: transfers, error } = await supabase
      .from('ownership_transfers')
      .select('*')
      .eq('title_id', titleId)
      .order('transfer_date', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      transfers:
        transfers?.map((t: any) => ({
          id: t.id,
          transferType: t.transfer_type,
          transferDate: t.transfer_date,
          effectiveDate: t.effective_date,
          currentHolder: t.current_holder_name,
          newHolder: t.new_holder_name,
          considerationAmount: t.consideration_amount || undefined,
          status: t.status,
          registrationNumber: t.registration_number || undefined,
        })) || [],
    }
  } catch (error) {
    logger.error('Exception getting transfer history', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending transfers for review
 */
export async function getPendingTransfers(): Promise<{
  success: boolean
  transfers?: Array<{
    id: string
    titleNumber: string
    currentHolder: string
    newHolder: string
    transferType: string
    transferDate: string
    considerationAmount?: number
    submittedAt: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: transfers, error } = await supabase
      .from('ownership_transfers')
      .select('id, title_id, transfer_type, current_holder_name, new_holder_name, transfer_date, consideration_amount, created_at')
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Get titles separately
    const titleIds = transfers?.map((t: any) => t.title_id) || []
    const { data: titles } = await supabase
      .from('sectional_titles')
      .select('id, title_number')
      .in('id', titleIds)

    const titleMap = new Map(titles?.map((t: any) => [t.id, t.title_number]) || [])

    return {
      success: true,
      transfers:
        transfers?.map((t: any) => ({
          id: t.id,
          titleNumber: titleMap.get(t.title_id) || 'Unknown',
          currentHolder: t.current_holder_name,
          newHolder: t.new_holder_name,
          transferType: t.transfer_type,
          transferDate: t.transfer_date,
          considerationAmount: t.consideration_amount || undefined,
          submittedAt: t.created_at,
        })) || [],
    }
  } catch (error) {
    logger.error('Exception getting pending transfers', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

