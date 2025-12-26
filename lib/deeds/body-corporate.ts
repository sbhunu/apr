/**
 * Body Corporate Registration Service
 * Handles Body Corporate creation, trustee management, and governance
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError, ConflictError, SystemError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { PROVINCE_CODES, ProvinceCode } from './constants'

/**
 * Trustee information
 */
export interface Trustee {
  id?: string
  name: string
  idNumber?: string
  email?: string
  phone?: string
  role: 'chairperson' | 'secretary' | 'treasurer' | 'trustee'
  appointedDate: string
  termEndDate?: string
  status: 'active' | 'resigned' | 'removed'
}

/**
 * Body Corporate registration data
 */
export interface BodyCorporateRegistrationData {
  schemeId: string
  schemeName: string
  schemeNumber: string
  provinceCode: ProvinceCode
  initialTrustees?: Trustee[]
  registeredAddress?: string
  contactEmail?: string
  contactPhone?: string
  annualLevyAmount?: number
  levyCurrency?: string
}

/**
 * Body Corporate registration result
 */
export interface BodyCorporateRegistrationResult {
  success: boolean
  bodyCorporateId?: string
  registrationNumber?: string
  error?: string
}

/**
 * Body Corporate ID allocation result
 */
export interface BodyCorporateIdAllocation {
  success: boolean
  registration_number?: string
  allocation_id?: string
  year?: number
  province_code?: string
  sequence_number?: number
  error?: string
}

/**
 * Allocate Body Corporate registration number
 * Format: BC/YYYY/PROVINCE/NNN (e.g., BC/2025/HARARE/001)
 */
export async function allocateBodyCorporateNumber(
  provinceCode: ProvinceCode,
  year?: number
): Promise<BodyCorporateIdAllocation> {
  return monitor('allocate_body_corporate_number', async () => {
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
      // Call RPC function for atomic allocation
      const { data, error } = await supabase.rpc('apr.allocate_body_corporate_number', {
        p_province_code: provinceCode,
        p_year: allocationYear,
      })

      if (error) {
        logger.error('Failed to allocate Body Corporate number', error, {
          provinceCode,
          year: allocationYear,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      if (!data || !data.registration_number) {
        return {
          success: false,
          error: 'Allocation returned no registration number',
        }
      }

      logger.info('Body Corporate number allocated', {
        registrationNumber: data.registration_number,
        provinceCode,
        year: allocationYear,
      })

      return {
        success: true,
        registration_number: data.registration_number,
        allocation_id: data.allocation_id,
        year: allocationYear,
        province_code: provinceCode,
        sequence_number: data.sequence_number,
      }
    } catch (error) {
      logger.error('Exception allocating Body Corporate number', error as Error, {
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
 * Create Body Corporate automatically when scheme is registered
 */
export async function createBodyCorporate(
  registrationData: BodyCorporateRegistrationData
): Promise<BodyCorporateRegistrationResult> {
  return monitor('create_body_corporate', async () => {
    const supabase = await createClient()

    // Validate required fields
    if (!registrationData.schemeId) {
      return {
        success: false,
        error: 'Scheme ID is required',
      }
    }

    if (!registrationData.schemeName) {
      return {
        success: false,
        error: 'Scheme name is required',
      }
    }

    // Check if Body Corporate already exists for this scheme
    const { data: existing, error: checkError } = await supabase
      .from('apr.body_corporates')
      .select('id, registration_number')
      .eq('scheme_id', registrationData.schemeId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected
      logger.error('Error checking existing Body Corporate', checkError, {
        schemeId: registrationData.schemeId,
      })
      return {
        success: false,
        error: checkError.message,
      }
    }

    if (existing) {
      logger.warn('Body Corporate already exists for scheme', {
        schemeId: registrationData.schemeId,
        bodyCorporateId: existing.id,
        registrationNumber: existing.registration_number,
      })
      return {
        success: false,
        error: 'Body Corporate already exists for this scheme',
      }
    }

    // Allocate registration number
    const allocation = await allocateBodyCorporateNumber(
      registrationData.provinceCode,
      new Date().getFullYear()
    )

    if (!allocation.success || !allocation.registration_number) {
      return {
        success: false,
        error: allocation.error || 'Failed to allocate registration number',
      }
    }

    // Prepare Body Corporate name
    const bodyCorporateName = `${registrationData.schemeName} Body Corporate`

    // Prepare initial trustees data
    const initialTrustees = registrationData.initialTrustees || []
    const trusteeCount = initialTrustees.length

    // Insert Body Corporate record
    const { data: bodyCorporate, error: insertError } = await supabase
      .from('apr.body_corporates')
      .insert({
        scheme_id: registrationData.schemeId,
        registration_number: allocation.registration_number,
        name: bodyCorporateName,
        registration_date: new Date().toISOString(),
        initial_trustees: initialTrustees as unknown as Record<string, unknown>[],
        trustee_count: trusteeCount,
        registered_address: registrationData.registeredAddress,
        contact_email: registrationData.contactEmail,
        contact_phone: registrationData.contactPhone,
        annual_levy_amount: registrationData.annualLevyAmount,
        levy_currency: registrationData.levyCurrency || 'USD',
        status: 'active',
      })
      .select('id, registration_number')
      .single()

    if (insertError) {
      logger.error('Failed to create Body Corporate', insertError, {
        schemeId: registrationData.schemeId,
        registrationNumber: allocation.registration_number,
      })
      return {
        success: false,
        error: insertError.message,
      }
    }

    // Update scheme with Body Corporate reference
    const { error: updateError } = await supabase
      .from('apr.sectional_schemes')
      .update({ body_corporate_id: bodyCorporate.id })
      .eq('id', registrationData.schemeId)

    if (updateError) {
      logger.error('Failed to link Body Corporate to scheme', updateError, {
        schemeId: registrationData.schemeId,
        bodyCorporateId: bodyCorporate.id,
      })
      // Don't fail the whole operation, but log the error
    }

    logger.info('Body Corporate created successfully', {
      bodyCorporateId: bodyCorporate.id,
      registrationNumber: bodyCorporate.registration_number,
      schemeId: registrationData.schemeId,
      trusteeCount,
    })

    return {
      success: true,
      bodyCorporateId: bodyCorporate.id,
      registrationNumber: bodyCorporate.registration_number,
    }
  })
}

/**
 * Get Body Corporate by scheme ID
 */
export async function getBodyCorporateBySchemeId(
  schemeId: string
): Promise<{
  success: boolean
  bodyCorporate?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('apr.body_corporates')
    .select('*')
    .eq('scheme_id', schemeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return {
        success: false,
        error: 'Body Corporate not found',
      }
    }
    logger.error('Failed to get Body Corporate', error, { schemeId })
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    bodyCorporate: data,
  }
}

/**
 * Update Body Corporate trustees
 */
export async function updateBodyCorporateTrustees(
  bodyCorporateId: string,
  trustees: Trustee[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('apr.body_corporates')
    .update({
      initial_trustees: trustees as unknown as Record<string, unknown>[],
      trustee_count: trustees.length,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bodyCorporateId)

  if (error) {
    logger.error('Failed to update Body Corporate trustees', error, {
      bodyCorporateId,
    })
    return {
      success: false,
      error: error.message,
    }
  }

  logger.info('Body Corporate trustees updated', {
    bodyCorporateId,
    trusteeCount: trustees.length,
  })

  return { success: true }
}

/**
 * Dissolve Body Corporate
 */
export async function dissolveBodyCorporate(
  bodyCorporateId: string,
  dissolutionDate: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('apr.body_corporates')
    .update({
      status: 'dissolved',
      updated_at: new Date().toISOString(),
      metadata: {
        dissolution_date: dissolutionDate,
        dissolution_reason: reason,
      },
    })
    .eq('id', bodyCorporateId)

  if (error) {
    logger.error('Failed to dissolve Body Corporate', error, {
      bodyCorporateId,
    })
    return {
      success: false,
      error: error.message,
    }
  }

  logger.info('Body Corporate dissolved', {
    bodyCorporateId,
    dissolutionDate,
  })

  return { success: true }
}

