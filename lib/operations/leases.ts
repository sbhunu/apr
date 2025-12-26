/**
 * Lease Registration Service
 * Handles lease registration, validation, discharge, and expiry tracking
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { PROVINCE_CODES, ProvinceCode } from '@/lib/deeds/constants'

/**
 * Lease registration data
 */
export interface LeaseRegistrationData {
  titleId: string
  lesseeName: string
  lesseeType: 'individual' | 'company' | 'trust' | 'government' | 'other'
  lesseeIdNumber?: string
  lesseeContactEmail?: string
  lesseeContactPhone?: string
  leaseStartDate: string
  leaseEndDate: string
  monthlyRent?: number
  rentCurrency?: string
  depositAmount?: number
  renewalOption?: boolean
  renewalTermMonths?: number
  earlyTerminationAllowed?: boolean
  terminationNoticeDays?: number
  leaseAgreementReference?: string
  leaseAgreementDocumentId?: string
}

/**
 * Lease validation result
 */
export interface LeaseValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  leaseTermMonths?: number
}

/**
 * Lease registration result
 */
export interface LeaseRegistrationResult {
  success: boolean
  leaseId?: string
  leaseNumber?: string
  error?: string
}

/**
 * Lease discharge data
 */
export interface LeaseDischargeData {
  leaseId: string
  terminationDate: string
  terminationReason?: string
  terminationReference?: string
}

/**
 * Lease discharge result
 */
export interface LeaseDischargeResult {
  success: boolean
  terminatedAt?: string
  error?: string
}

/**
 * Allocate lease number
 * Format: LEASE/YYYY/PROVINCE/NNN (e.g., LEASE/2025/HARARE/001)
 */
async function allocateLeaseNumber(
  provinceCode: ProvinceCode,
  year?: number
): Promise<{ success: boolean; leaseNumber?: string; error?: string }> {
  return monitor('allocate_lease_number', async () => {
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
      const { data: maxLease, error: queryError } = await supabase
        .from('leases')
        .select('lease_number')
        .like('lease_number', `LEASE/${allocationYear}/${provinceCode}/%`)
        .order('lease_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      let sequenceNumber = 1

      if (!queryError && maxLease) {
        // Extract sequence number from existing lease
        const parts = maxLease.lease_number.split('/')
        if (parts.length === 4) {
          const lastPart = parts[3]
          sequenceNumber = parseInt(lastPart, 10) + 1
        }
      }

      const leaseNumber = `LEASE/${allocationYear}/${provinceCode}/${String(sequenceNumber).padStart(3, '0')}`

      return {
        success: true,
        leaseNumber,
      }
    } catch (error) {
      logger.error('Failed to allocate lease number', error as Error, {
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
 * Calculate lease term in months
 */
function calculateLeaseTermMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  return months
}

/**
 * Validate lease registration
 */
export async function validateLeaseRegistration(
  data: LeaseRegistrationData
): Promise<LeaseValidationResult> {
  return monitor('validate_lease_registration', async () => {
    const supabase = await createClient()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate title exists and is registered
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('id, holder_name, registration_status, section_id')
        .eq('id', data.titleId)
        .single()

      if (titleError || !title) {
        return {
          isValid: false,
          errors: ['Title not found'],
          warnings: [],
        }
      }

      if (title.registration_status !== 'registered') {
        errors.push('Lease can only be registered against registered titles')
      }

      // Validate dates
      const startDate = new Date(data.leaseStartDate)
      const endDate = new Date(data.leaseEndDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (endDate <= startDate) {
        errors.push('Lease end date must be after start date')
      }

      if (startDate < today) {
        warnings.push('Lease start date is in the past')
      }

      const leaseTermMonths = calculateLeaseTermMonths(data.leaseStartDate, data.leaseEndDate)
      if (leaseTermMonths <= 0) {
        errors.push('Lease term must be at least 1 month')
      }

      if (leaseTermMonths > 99 * 12) {
        warnings.push('Lease term exceeds 99 years - verify this is correct')
      }

      // Validate lessee information
      if (!data.lesseeName.trim()) {
        errors.push('Lessee name is required')
      }

      if (data.lesseeType === 'individual' && !data.lesseeIdNumber) {
        warnings.push('National ID number recommended for individual lessees')
      }

      if (data.lesseeType === 'company' && !data.lesseeIdNumber) {
        warnings.push('Company registration number recommended')
      }

      // Validate rent if provided
      if (data.monthlyRent !== undefined && data.monthlyRent < 0) {
        errors.push('Monthly rent cannot be negative')
      }

      // Check for overlapping active leases
      const { data: existingLeases, error: leasesError } = await supabase
        .from('leases')
        .select('id, lease_start_date, lease_end_date, status')
        .eq('title_id', data.titleId)
        .in('status', ['active', 'renewed'])

      if (!leasesError && existingLeases) {
        for (const lease of existingLeases) {
          const existingStart = new Date(lease.lease_start_date)
          const existingEnd = new Date(lease.lease_end_date)

          // Check for overlap
          if (
            (startDate >= existingStart && startDate <= existingEnd) ||
            (endDate >= existingStart && endDate <= existingEnd) ||
            (startDate <= existingStart && endDate >= existingEnd)
          ) {
            warnings.push(
              `Potential overlap with existing lease ${lease.id.substring(0, 8)}... (${existingStart.toLocaleDateString()} - ${existingEnd.toLocaleDateString()})`
            )
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        leaseTermMonths,
      }
    } catch (error) {
      logger.error('Exception validating lease', error as Error, { data })
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      }
    }
  })
}

/**
 * Register lease
 */
export async function registerLease(
  data: LeaseRegistrationData
): Promise<LeaseRegistrationResult> {
  return monitor('register_lease', async () => {
    const supabase = await createClient()

    // Validate lease
    const validation = await validateLeaseRegistration(data)
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join('; ')}`,
      }
    }

    // Get title to find scheme for province
    const { data: title, error: titleError } = await supabase
      .from('sectional_titles')
      .select('id, holder_name, section_id')
      .eq('id', data.titleId)
      .single()

    if (titleError || !title) {
      return {
        success: false,
        error: 'Title not found',
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

    // Allocate lease number
    const allocation = await allocateLeaseNumber(provinceCode)
    if (!allocation.success || !allocation.leaseNumber) {
      return {
        success: false,
        error: allocation.error || 'Failed to allocate lease number',
      }
    }

    // Calculate lease term
    const leaseTermMonths = validation.leaseTermMonths || calculateLeaseTermMonths(data.leaseStartDate, data.leaseEndDate)

    // Insert lease record
    const { data: lease, error: insertError } = await supabase
      .from('leases')
      .insert({
        title_id: data.titleId,
        lease_number: allocation.leaseNumber,
        lessor_name: title.holder_name,
        lessor_id: null, // Would need to get from title holder_id if available
        lessee_name: data.lesseeName,
        lessee_type: data.lesseeType,
        lessee_id: data.lesseeIdNumber || null,
        lessee_contact_email: data.lesseeContactEmail || null,
        lessee_contact_phone: data.lesseeContactPhone || null,
        lease_start_date: data.leaseStartDate,
        lease_end_date: data.leaseEndDate,
        lease_term_months: leaseTermMonths,
        monthly_rent: data.monthlyRent || null,
        rent_currency: data.rentCurrency || 'USD',
        deposit_amount: data.depositAmount || null,
        renewal_option: data.renewalOption || false,
        renewal_term_months: data.renewalTermMonths || null,
        early_termination_allowed: data.earlyTerminationAllowed || false,
        termination_notice_days: data.terminationNoticeDays || null,
        lease_agreement_reference: data.leaseAgreementReference || null,
        lease_agreement_document_id: data.leaseAgreementDocumentId || null,
        status: 'active',
      })
      .select('id, lease_number')
      .single()

    if (insertError) {
      logger.error('Failed to register lease', insertError, {
        titleId: data.titleId,
        leaseNumber: allocation.leaseNumber,
      })
      return {
        success: false,
        error: insertError.message,
      }
    }

    logger.info('Lease registered successfully', {
      leaseId: lease.id,
      leaseNumber: lease.lease_number,
      titleId: data.titleId,
    })

    return {
      success: true,
      leaseId: lease.id,
      leaseNumber: lease.lease_number,
    }
  })
}

/**
 * Discharge/terminate lease
 */
export async function dischargeLease(
  data: LeaseDischargeData
): Promise<LeaseDischargeResult> {
  return monitor('discharge_lease', async () => {
    const supabase = await createClient()

    // Verify lease exists and is active
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('id, status, title_id')
      .eq('id', data.leaseId)
      .single()

    if (leaseError || !lease) {
      return {
        success: false,
        error: 'Lease not found',
      }
    }

    if (lease.status !== 'active') {
      return {
        success: false,
        error: `Lease is not in active status (current: ${lease.status})`,
      }
    }

    // Update lease status
    const { error: updateError } = await supabase
      .from('leases')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: data.terminationReason || null,
        updated_at: new Date().toISOString(),
        metadata: {
          termination_reference: data.terminationReference,
        },
      })
      .eq('id', data.leaseId)

    if (updateError) {
      logger.error('Failed to discharge lease', updateError, {
        leaseId: data.leaseId,
      })
      return {
        success: false,
        error: updateError.message,
      }
    }

    logger.info('Lease discharged successfully', {
      leaseId: data.leaseId,
      titleId: lease.title_id,
    })

    return {
      success: true,
      terminatedAt: new Date().toISOString(),
    }
  })
}

/**
 * Get leases for a title
 */
export async function getTitleLeases(
  titleId: string
): Promise<{
  success: boolean
  leases?: Array<{
    id: string
    leaseNumber: string
    lesseeName: string
    leaseStartDate: string
    leaseEndDate: string
    monthlyRent?: number
    rentCurrency: string
    status: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: leases, error } = await supabase
      .from('leases')
      .select('id, lease_number, lessee_name, lease_start_date, lease_end_date, monthly_rent, rent_currency, status')
      .eq('title_id', titleId)
      .order('lease_start_date', { ascending: false })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      leases:
        leases?.map((lease) => ({
          id: lease.id,
          leaseNumber: lease.lease_number,
          lesseeName: lease.lessee_name,
          leaseStartDate: lease.lease_start_date,
          leaseEndDate: lease.lease_end_date,
          monthlyRent: lease.monthly_rent || undefined,
          rentCurrency: lease.rent_currency || 'USD',
          status: lease.status,
        })) || [],
    }
  } catch (error) {
    logger.error('Failed to get title leases', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get expiring leases (within specified days)
 */
export async function getExpiringLeases(
  daysAhead: number = 90
): Promise<{
  success: boolean
  leases?: Array<{
    id: string
    leaseNumber: string
    titleId: string
    lesseeName: string
    leaseEndDate: string
    daysUntilExpiry: number
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + daysAhead)

    const { data: leases, error } = await supabase
      .from('leases')
      .select('id, lease_number, title_id, lessee_name, lease_end_date')
      .eq('status', 'active')
      .gte('lease_end_date', today.toISOString().split('T')[0])
      .lte('lease_end_date', futureDate.toISOString().split('T')[0])
      .order('lease_end_date', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const leasesWithDays = leases?.map((lease) => {
      const endDate = new Date(lease.lease_end_date)
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      return {
        id: lease.id,
        leaseNumber: lease.lease_number,
        titleId: lease.title_id,
        lesseeName: lease.lessee_name,
        leaseEndDate: lease.lease_end_date,
        daysUntilExpiry,
      }
    })

    return {
      success: true,
      leases: leasesWithDays || [],
    }
  } catch (error) {
    logger.error('Failed to get expiring leases', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get lease by ID
 */
export async function getLease(
  leaseId: string
): Promise<{
  success: boolean
  lease?: Record<string, unknown>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: lease, error } = await supabase
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Lease not found',
        }
      }
      throw error
    }

    return {
      success: true,
      lease,
    }
  } catch (error) {
    logger.error('Failed to get lease', error as Error, { leaseId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

