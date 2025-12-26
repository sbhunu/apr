/**
 * Mortgage Registration Service
 * Handles mortgage/charge registration, priority, discharge, and encumbrance management
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError, ConflictError, SystemError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { PROVINCE_CODES, ProvinceCode } from '@/lib/deeds/constants'

/**
 * Mortgage registration data
 */
export interface MortgageRegistrationData {
  titleId: string
  lenderName: string
  lenderType: 'bank' | 'financial_institution' | 'private_lender' | 'government' | 'other'
  lenderRegistrationNumber?: string
  lenderContactEmail?: string
  lenderContactPhone?: string
  mortgageAmount: number
  mortgageCurrency?: string
  interestRate?: number
  termMonths?: number
  mortgageDate: string
  registrationDate: string
  effectiveDate: string
  expiryDate?: string
  mortgageDeedReference?: string
  mortgageDeedDocumentId?: string
  lenderSignatureId?: string
  borrowerSignatureId?: string
}

/**
 * Mortgage registration result
 */
export interface MortgageRegistrationResult {
  success: boolean
  mortgageId?: string
  mortgageNumber?: string
  priority?: number
  error?: string
}

/**
 * Mortgage discharge data
 */
export interface MortgageDischargeData {
  mortgageId: string
  dischargeDate: string
  dischargeReference?: string
  dischargeDocumentId?: string
  registrarSignatureId?: string
}

/**
 * Mortgage discharge result
 */
export interface MortgageDischargeResult {
  success: boolean
  dischargedAt?: string
  error?: string
}

/**
 * Mortgage priority information
 */
export interface MortgagePriority {
  mortgageId: string
  mortgageNumber: string
  priority: number
  registrationDate: string
  mortgageAmount: number
  status: string
}

/**
 * Allocate mortgage number
 * Format: MORT/YYYY/PROVINCE/NNN (e.g., MORT/2025/HARARE/001)
 */
async function allocateMortgageNumber(
  provinceCode: ProvinceCode,
  year?: number
): Promise<{ success: boolean; mortgageNumber?: string; error?: string }> {
  return monitor('allocate_mortgage_number', async () => {
    const supabase = await createClient()
    const allocationYear = year || new Date().getFullYear()

    // Validate province code
    if (!PROVINCE_CODES.includes(provinceCode)) {
      return {
        success: false,
        error: `Invalid province code: ${provinceCode}`,
      }
    }

    try {
      // Get next sequence number for province/year
      const { data: maxMortgage, error: queryError } = await supabase
        .from('mortgages')
        .select('mortgage_number')
        .like('mortgage_number', `MORT/${allocationYear}/${provinceCode}/%`)
        .order('mortgage_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      let sequenceNumber = 1

      if (!queryError && maxMortgage) {
        // Extract sequence number from existing mortgage
        const parts = maxMortgage.mortgage_number.split('/')
        if (parts.length === 4) {
          const lastPart = parts[3]
          sequenceNumber = parseInt(lastPart, 10) + 1
        }
      }

      const mortgageNumber = `MORT/${allocationYear}/${provinceCode}/${String(sequenceNumber).padStart(3, '0')}`

      return {
        success: true,
        mortgageNumber,
      }
    } catch (error) {
      logger.error('Failed to allocate mortgage number', error as Error, {
        provinceCode,
        year: allocationYear,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get mortgage priority for a title
 */
async function getMortgagePriority(
  titleId: string
): Promise<{ success: boolean; priority?: number; error?: string }> {
  const supabase = await createClient()

  try {
    const { data: mortgages, error } = await supabase
      .from('apr.mortgages')
      .select('id, registration_date')
      .eq('title_id', titleId)
      .in('status', ['registered'])
      .order('registration_date', { ascending: true })

    if (error) {
      throw error
    }

    // Priority is based on registration date (first registered = priority 1)
    const priority = mortgages ? mortgages.length + 1 : 1

    return {
      success: true,
      priority,
    }
  } catch (error) {
    logger.error('Failed to get mortgage priority', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Register mortgage
 */
export async function registerMortgage(
  data: MortgageRegistrationData
): Promise<MortgageRegistrationResult> {
  return monitor('register_mortgage', async () => {
    const supabase = await createClient()

    // Validate title exists and is registered
    const { data: title, error: titleError } = await supabase
      .from('sectional_titles')
      .select('id, holder_name, holder_id_number, registration_status, section_id')
      .eq('id', data.titleId)
      .single()

    if (titleError || !title) {
      return {
        success: false,
        error: 'Title not found',
      }
    }

    if (title.registration_status !== 'registered') {
      return {
        success: false,
        error: 'Mortgage can only be registered against registered titles',
      }
    }

    // Get section to get scheme_id
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('scheme_id')
      .eq('id', title.section_id)
      .single()

    if (sectionError || !section) {
      return {
        success: false,
        error: 'Section not found',
      }
    }

    // Get scheme to determine province
    const { data: scheme, error: schemeError } = await supabase
      .from('sectional_schemes')
      .select('scheme_number')
      .eq('id', section.scheme_id)
      .single()

    if (schemeError || !scheme) {
      return {
        success: false,
        error: 'Scheme not found',
      }
    }

    // Extract province code from scheme number (format: SS/YYYY/PROVINCE/NNN)
    const provinceCode = scheme.scheme_number.split('/')[2] as ProvinceCode

    // Allocate mortgage number
    const allocation = await allocateMortgageNumber(provinceCode)
    if (!allocation.success || !allocation.mortgageNumber) {
      return {
        success: false,
        error: allocation.error || 'Failed to allocate mortgage number',
      }
    }

    // Get priority
    const priorityResult = await getMortgagePriority(data.titleId)
    if (!priorityResult.success) {
      return {
        success: false,
        error: priorityResult.error || 'Failed to determine priority',
      }
    }

    // Insert mortgage record
    const { data: mortgage, error: insertError } = await supabase
      .from('mortgages')
      .insert({
        title_id: data.titleId,
        mortgage_number: allocation.mortgageNumber,
        lender_name: data.lenderName,
        lender_type: data.lenderType,
        lender_registration_number: data.lenderRegistrationNumber,
        lender_contact_email: data.lenderContactEmail,
        lender_contact_phone: data.lenderContactPhone,
        borrower_id: title.holder_id_number || null,
        borrower_name: title.holder_name,
        mortgage_amount: data.mortgageAmount,
        mortgage_currency: data.mortgageCurrency || 'USD',
        interest_rate: data.interestRate,
        term_months: data.termMonths,
        mortgage_date: data.mortgageDate,
        registration_date: data.registrationDate,
        effective_date: data.effectiveDate,
        expiry_date: data.expiryDate,
        mortgage_deed_reference: data.mortgageDeedReference,
        mortgage_deed_document_id: data.mortgageDeedDocumentId,
        lender_signature_id: data.lenderSignatureId,
        borrower_signature_id: data.borrowerSignatureId,
        status: 'registered',
      })
      .select('id, mortgage_number')
      .single()

    if (insertError) {
      logger.error('Failed to register mortgage', insertError, {
        titleId: data.titleId,
        mortgageNumber: allocation.mortgageNumber,
      })
      return {
        success: false,
        error: insertError.message,
      }
    }

    logger.info('Mortgage registered successfully', {
      mortgageId: mortgage.id,
      mortgageNumber: mortgage.mortgage_number,
      titleId: data.titleId,
      priority: priorityResult.priority,
    })

    return {
      success: true,
      mortgageId: mortgage.id,
      mortgageNumber: mortgage.mortgage_number,
      priority: priorityResult.priority,
    }
  })
}

/**
 * Discharge mortgage
 */
export async function dischargeMortgage(
  data: MortgageDischargeData
): Promise<MortgageDischargeResult> {
  return monitor('discharge_mortgage', async () => {
    const supabase = await createClient()

    // Verify mortgage exists and is registered
    const { data: mortgage, error: mortgageError } = await supabase
      .from('mortgages')
      .select('id, status, title_id')
      .eq('id', data.mortgageId)
      .single()

    if (mortgageError || !mortgage) {
      return {
        success: false,
        error: 'Mortgage not found',
      }
    }

    if (mortgage.status !== 'registered') {
      return {
        success: false,
        error: `Mortgage is not in registered status (current: ${mortgage.status})`,
      }
    }

    // Update mortgage status
    const { error: updateError } = await supabase
      .from('mortgages')
      .update({
        status: 'discharged',
        discharged_at: new Date().toISOString(),
        discharge_reference: data.dischargeReference,
        discharge_document_id: data.dischargeDocumentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.mortgageId)

    if (updateError) {
      logger.error('Failed to discharge mortgage', updateError, {
        mortgageId: data.mortgageId,
      })
      return {
        success: false,
        error: updateError.message,
      }
    }

    logger.info('Mortgage discharged successfully', {
      mortgageId: data.mortgageId,
      titleId: mortgage.title_id,
    })

    return {
      success: true,
      dischargedAt: new Date().toISOString(),
    }
  })
}

/**
 * Get mortgages for a title
 */
export async function getTitleMortgages(
  titleId: string
): Promise<{
  success: boolean
  mortgages?: MortgagePriority[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: mortgages, error } = await supabase
      .from('mortgages')
      .select('id, mortgage_number, registration_date, mortgage_amount, status')
      .eq('title_id', titleId)
      .order('registration_date', { ascending: true })

    if (error) {
      throw error
    }

    // Calculate priority based on registration date order
    const mortgagesWithPriority: MortgagePriority[] =
      mortgages?.map((mortgage, index) => ({
        mortgageId: mortgage.id,
        mortgageNumber: mortgage.mortgage_number,
        priority: index + 1,
        registrationDate: mortgage.registration_date,
        mortgageAmount: mortgage.mortgage_amount,
        status: mortgage.status,
      })) || []

    return {
      success: true,
      mortgages: mortgagesWithPriority,
    }
  } catch (error) {
    logger.error('Failed to get title mortgages', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if title has active encumbrances
 */
export async function hasActiveEncumbrances(
  titleId: string
): Promise<{
  success: boolean
  hasEncumbrances?: boolean
  mortgageCount?: number
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: mortgages, error } = await supabase
      .from('mortgages')
      .select('id')
      .eq('title_id', titleId)
      .eq('status', 'registered')

    if (error) {
      throw error
    }

    return {
      success: true,
      hasEncumbrances: (mortgages?.length || 0) > 0,
      mortgageCount: mortgages?.length || 0,
    }
  } catch (error) {
    logger.error('Failed to check encumbrances', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get mortgage by ID
 */
export async function getMortgage(
  mortgageId: string
): Promise<{
  success: boolean
  mortgage?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: mortgage, error } = await supabase
      .from('mortgages')
      .select('*')
      .eq('id', mortgageId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Mortgage not found',
        }
      }
      throw error
    }

    return {
      success: true,
      mortgage,
    }
  } catch (error) {
    logger.error('Failed to get mortgage', error as Error, { mortgageId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

