/**
 * Mortgage Certificate Encumbrance Notation
 * Adds encumbrance notation to title certificates when mortgages exist
 */

import { hasActiveEncumbrances, getTitleMortgages } from './mortgages'
import { logger } from '@/lib/logger'

/**
 * Encumbrance information for certificate
 */
export interface EncumbranceInfo {
  hasEncumbrances: boolean
  mortgages: Array<{
    mortgageNumber: string
    lenderName: string
    mortgageAmount: number
    mortgageCurrency: string
    registrationDate: string
    priority: number
  }>
}

/**
 * Get encumbrance information for a title
 */
export async function getTitleEncumbrances(
  titleId: string
): Promise<EncumbranceInfo> {
  try {
    const encumbranceCheck = await hasActiveEncumbrances(titleId)
    
    if (!encumbranceCheck.success || !encumbranceCheck.hasEncumbrances) {
      return {
        hasEncumbrances: false,
        mortgages: [],
      }
    }

    const mortgagesResult = await getTitleMortgages(titleId)
    
    if (!mortgagesResult.success || !mortgagesResult.mortgages) {
      return {
        hasEncumbrances: false,
        mortgages: [],
      }
    }

    // Get full mortgage details
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const mortgageIds = mortgagesResult.mortgages
      .filter((m) => m.status === 'registered')
      .map((m) => m.mortgageId)

    if (mortgageIds.length === 0) {
      return {
        hasEncumbrances: false,
        mortgages: [],
      }
    }

    const { data: mortgages, error } = await supabase
      .from('apr.mortgages')
      .select('mortgage_number, lender_name, mortgage_amount, mortgage_currency, registration_date')
      .in('id', mortgageIds)
      .eq('status', 'registered')
      .order('registration_date', { ascending: true })

    if (error) {
      logger.error('Failed to get mortgage details for encumbrances', error, {
        titleId,
      })
      return {
        hasEncumbrances: false,
        mortgages: [],
      }
    }

    const encumbrances = mortgages?.map((mortgage, index) => ({
      mortgageNumber: mortgage.mortgage_number,
      lenderName: mortgage.lender_name,
      mortgageAmount: mortgage.mortgage_amount,
      mortgageCurrency: mortgage.mortgage_currency || 'USD',
      registrationDate: mortgage.registration_date,
      priority: index + 1,
    })) || []

    return {
      hasEncumbrances: encumbrances.length > 0,
      mortgages: encumbrances,
    }
  } catch (error) {
    logger.error('Failed to get title encumbrances', error as Error, {
      titleId,
    })
    return {
      hasEncumbrances: false,
      mortgages: [],
    }
  }
}

/**
 * Format encumbrance notation for certificate display
 */
export function formatEncumbranceNotation(encumbrances: EncumbranceInfo): string {
  if (!encumbrances.hasEncumbrances || encumbrances.mortgages.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push('ENCUMBRANCES:')
  
  encumbrances.mortgages.forEach((mortgage) => {
    lines.push(
      `  ${mortgage.priority}. Mortgage ${mortgage.mortgageNumber} - ${mortgage.lenderName}`
    )
    lines.push(
      `     Amount: ${mortgage.mortgageAmount.toLocaleString('en-ZW', {
        style: 'currency',
        currency: mortgage.mortgageCurrency,
      })}`
    )
    lines.push(`     Registered: ${new Date(mortgage.registrationDate).toLocaleDateString('en-ZW')}`)
  })

  return lines.join('\n')
}

