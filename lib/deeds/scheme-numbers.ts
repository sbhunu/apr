/**
 * Scheme Number Allocation Service
 * Handles unique scheme number allocation with provincial and yearly organization
 * Format: SS/YYYY/PROVINCE/NNN (e.g., SS/2025/HARARE/001)
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError, ConflictError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

// Re-export constants for backward compatibility (safe for client components)
export { PROVINCE_CODES, ProvinceCode } from './constants'

/**
 * Scheme number allocation result
 */
export interface SchemeNumberAllocation {
  success: boolean
  scheme_number?: string
  allocation_id?: string
  year?: number
  province_code?: string
  sequence_number?: number
  reservation_expires_at?: string
  error?: string
}

/**
 * Scheme number validation result
 */
export interface SchemeNumberValidation {
  valid: boolean
  error?: string
  components?: {
    prefix: string
    year: number
    province: string
    sequence: number
  }
}

/**
 * Allocate next available scheme number
 */
export async function allocateSchemeNumber(
  provinceCode: ProvinceCode,
  year?: number,
  reserveDurationHours: number = 24
): Promise<SchemeNumberAllocation> {
  return await monitor.measure('scheme_number_allocation', async () => {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new ValidationError('Authentication required', 'scheme_number_allocation')
    }

    // Validate province code
    if (!PROVINCE_CODES.includes(provinceCode)) {
      throw new ValidationError(
        `Invalid province code: ${provinceCode}`,
        'scheme_number_allocation',
        { provinceCode }
      )
    }

    try {
      // Call RPC function for atomic allocation
      const { data, error } = await supabase.rpc('allocate_scheme_number', {
        p_province_code: provinceCode,
        p_year: year || null,
        p_user_id: user.id,
        p_reserve_duration_hours: reserveDurationHours,
      })

      if (error) {
        logger.error('Failed to allocate scheme number', error as Error, {
          provinceCode,
          year,
        })
        throw new ValidationError(
          `Failed to allocate scheme number: ${error.message}`,
          'scheme_number_allocation',
          { provinceCode, year }
        )
      }

      if (!data?.success) {
        throw new ValidationError(
          data?.error || 'Failed to allocate scheme number',
          'scheme_number_allocation',
          { provinceCode, year }
        )
      }

      logger.info('Scheme number allocated', {
        scheme_number: data.scheme_number,
        provinceCode,
        year: data.year,
        sequence: data.sequence_number,
      })

      return {
        success: true,
        scheme_number: data.scheme_number,
        allocation_id: data.allocation_id,
        year: data.year,
        province_code: data.province_code,
        sequence_number: data.sequence_number,
        reservation_expires_at: data.reservation_expires_at,
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      logger.error('Unexpected error allocating scheme number', error as Error, {
        provinceCode,
        year,
      })
      throw new ValidationError(
        'Unexpected error allocating scheme number',
        'scheme_number_allocation',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  })
}

/**
 * Confirm scheme number allocation (link to scheme)
 */
export async function confirmSchemeNumberAllocation(
  allocationId: string,
  schemeId: string
): Promise<{ success: boolean; scheme_number?: string; error?: string }> {
  return await monitor.measure('scheme_number_confirmation', async () => {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase.rpc('confirm_scheme_number_allocation', {
        p_allocation_id: allocationId,
        p_scheme_id: schemeId,
      })

      if (error) {
        logger.error('Failed to confirm scheme number allocation', error as Error, {
          allocationId,
          schemeId,
        })
        throw new ValidationError(
          `Failed to confirm allocation: ${error.message}`,
          'scheme_number_confirmation',
          { allocationId, schemeId }
        )
      }

      if (!data?.success) {
        throw new ValidationError(
          data?.error || 'Failed to confirm allocation',
          'scheme_number_confirmation',
          { allocationId, schemeId }
        )
      }

      logger.info('Scheme number allocation confirmed', {
        scheme_number: data.scheme_number,
        schemeId,
      })

      return {
        success: true,
        scheme_number: data.scheme_number,
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      logger.error('Unexpected error confirming allocation', error as Error, {
        allocationId,
        schemeId,
      })
      throw new ValidationError(
        'Unexpected error confirming allocation',
        'scheme_number_confirmation',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  })
}

/**
 * Cancel scheme number allocation
 */
export async function cancelSchemeNumberAllocation(
  allocationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  return await monitor.measure('scheme_number_cancellation', async () => {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new ValidationError('Authentication required', 'scheme_number_cancellation')
    }

    try {
      const { data, error } = await supabase.rpc('cancel_scheme_number_allocation', {
        p_allocation_id: allocationId,
        p_user_id: user.id,
        p_reason: reason || null,
      })

      if (error) {
        logger.error('Failed to cancel scheme number allocation', error as Error, {
          allocationId,
        })
        throw new ValidationError(
          `Failed to cancel allocation: ${error.message}`,
          'scheme_number_cancellation',
          { allocationId }
        )
      }

      if (!data?.success) {
        throw new ValidationError(
          data?.error || 'Failed to cancel allocation',
          'scheme_number_cancellation',
          { allocationId }
        )
      }

      logger.info('Scheme number allocation cancelled', {
        allocationId,
        reason,
      })

      return {
        success: true,
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      logger.error('Unexpected error cancelling allocation', error as Error, {
        allocationId,
      })
      throw new ValidationError(
        'Unexpected error cancelling allocation',
        'scheme_number_cancellation',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    }
  })
}

/**
 * Validate scheme number format
 */
export async function validateSchemeNumberFormat(
  schemeNumber: string
): Promise<SchemeNumberValidation> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('validate_scheme_number_format', {
      p_scheme_number: schemeNumber,
    })

    if (error) {
      logger.error('Failed to validate scheme number format', error as Error, {
        schemeNumber,
      })
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
      }
    }

    return {
      valid: data?.valid || false,
      error: data?.error,
      components: data?.components,
    }
  } catch (error) {
    logger.error('Unexpected error validating scheme number', error as Error, {
      schemeNumber,
    })
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    }
  }
}

/**
 * Get next available sequence number (for gap filling)
 */
export async function getNextAvailableSequence(
  provinceCode: ProvinceCode,
  year?: number
): Promise<number> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_next_available_sequence', {
      p_province_code: provinceCode,
      p_year: year || null,
    })

    if (error) {
      logger.error('Failed to get next available sequence', error as Error, {
        provinceCode,
        year,
      })
      throw new ValidationError(
        `Failed to get sequence: ${error.message}`,
        'scheme_number_sequence',
        { provinceCode, year }
      )
    }

    return data || 1
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    logger.error('Unexpected error getting sequence', error as Error, {
      provinceCode,
      year,
    })
    throw new ValidationError(
      'Unexpected error getting sequence',
      'scheme_number_sequence',
      { originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Format scheme number from components
 */
export function formatSchemeNumber(
  year: number,
  provinceCode: ProvinceCode,
  sequenceNumber: number
): string {
  return `SS/${year}/${provinceCode}/${String(sequenceNumber).padStart(3, '0')}`
}

/**
 * Parse scheme number into components
 */
export function parseSchemeNumber(schemeNumber: string): {
  prefix: string
  year: number
  province: string
  sequence: number
} | null {
  const parts = schemeNumber.split('/')
  if (parts.length !== 4) {
    return null
  }

  const [prefix, yearStr, province, sequenceStr] = parts
  const year = parseInt(yearStr, 10)
  const sequence = parseInt(sequenceStr, 10)

  if (isNaN(year) || isNaN(sequence)) {
    return null
  }

  return {
    prefix,
    year,
    province,
    sequence,
  }
}

