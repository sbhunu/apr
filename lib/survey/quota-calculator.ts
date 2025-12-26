/**
 * Participation Quota Calculator
 * Calculates each unit's share of common property using South African formula
 * Formula: quota = (unit_area / total_unit_area) * 100
 */

import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Unit area data for quota calculation
 */
export interface UnitAreaData {
  id: string
  sectionNumber: string
  area: number // m²
  sectionType?: 'residential' | 'commercial' | 'parking' | 'storage' | 'common' | 'other'
}

/**
 * Calculated quota result
 */
export interface QuotaResult {
  sectionNumber: string
  quota: number // Percentage (e.g., 33.3333)
  area: number // m²
  commonAreaShare: number // m² share of common property
}

/**
 * Quota calculation result
 */
export interface QuotaCalculationResult {
  success: boolean
  quotas: QuotaResult[]
  totalUnitArea: number // m²
  totalQuota: number // Should be 100.0000%
  commonPropertyArea: number // m²
  isValid: boolean
  errors?: string[]
  warnings?: string[]
  adjustmentApplied?: boolean
  adjustmentDetails?: string
}

/**
 * Calculate participation quotas for units
 * Uses South African formula: quota = (unit_area / total_unit_area) * 100
 */
export function calculateParticipationQuotas(
  units: UnitAreaData[],
  commonPropertyArea: number = 0,
  options: {
    excludeCommonUnits?: boolean
    precision?: number
    adjustTo100?: boolean
  } = {}
): QuotaCalculationResult {
  return monitor('calculate_participation_quotas', () => {
    const {
      excludeCommonUnits = true,
      precision = 4,
      adjustTo100 = true,
    } = options

    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Filter out common property units if requested
      const eligibleUnits = excludeCommonUnits
        ? units.filter((u) => u.sectionType !== 'common')
        : units

      if (eligibleUnits.length === 0) {
        return {
          success: false,
          quotas: [],
          totalUnitArea: 0,
          totalQuota: 0,
          commonPropertyArea,
          isValid: false,
          errors: ['No eligible units found for quota calculation'],
        }
      }

      // Calculate total unit area
      const totalUnitArea = eligibleUnits.reduce((sum, unit) => {
        if (unit.area < 0) {
          errors.push(`Unit ${unit.sectionNumber}: Negative area not allowed`)
          return sum
        }
        if (unit.area === 0) {
          warnings.push(`Unit ${unit.sectionNumber}: Zero area unit will have zero quota`)
        }
        return sum + unit.area
      }, 0)

      if (totalUnitArea === 0) {
        return {
          success: false,
          quotas: [],
          totalUnitArea: 0,
          totalQuota: 0,
          commonPropertyArea,
          isValid: false,
          errors: ['Total unit area is zero. Cannot calculate quotas.'],
        }
      }

      // Calculate quotas using South African formula
      const quotas: QuotaResult[] = eligibleUnits.map((unit) => {
        const rawQuota = (unit.area / totalUnitArea) * 100
        const quota = roundToPrecision(rawQuota, precision)

        // Calculate common area share
        const commonAreaShare = (quota / 100) * commonPropertyArea

        return {
          sectionNumber: unit.sectionNumber,
          quota,
          area: unit.area,
          commonAreaShare: roundToPrecision(commonAreaShare, 2),
        }
      })

      // Calculate total quota
      const totalQuota = quotas.reduce((sum, q) => sum + q.quota, 0)
      const roundedTotal = roundToPrecision(totalQuota, precision)

      // Check if quotas sum to 100%
      const targetTotal = 100.0
      const difference = Math.abs(roundedTotal - targetTotal)
      const tolerance = Math.pow(10, -precision) // e.g., 0.0001 for 4 decimals

      let adjustmentApplied = false
      let adjustmentDetails: string | undefined

      // Adjust quotas to sum to exactly 100% if needed
      if (adjustTo100 && difference > tolerance) {
        const adjustment = targetTotal - roundedTotal

        // Distribute adjustment proportionally to largest unit
        // Find unit with largest quota
        const largestQuotaIndex = quotas.reduce(
          (maxIdx, q, idx) => (q.quota > quotas[maxIdx].quota ? idx : maxIdx),
          0
        )

        // Apply adjustment to largest unit
        quotas[largestQuotaIndex].quota = roundToPrecision(
          quotas[largestQuotaIndex].quota + adjustment,
          precision
        )

        // Recalculate common area share
        quotas[largestQuotaIndex].commonAreaShare = roundToPrecision(
          (quotas[largestQuotaIndex].quota / 100) * commonPropertyArea,
          2
        )

        adjustmentApplied = true
        adjustmentDetails = `Adjusted quota for ${quotas[largestQuotaIndex].sectionNumber} by ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(precision)}% to ensure total equals 100.0000%`

        warnings.push(adjustmentDetails)
      }

      // Verify final total
      const finalTotal = quotas.reduce((sum, q) => sum + q.quota, 0)
      const finalRoundedTotal = roundToPrecision(finalTotal, precision)
      const isValid = Math.abs(finalRoundedTotal - targetTotal) <= tolerance

      if (!isValid) {
        errors.push(
          `Quotas do not sum to 100%. Total: ${finalRoundedTotal.toFixed(precision)}%`
        )
      }

      return {
        success: errors.length === 0,
        quotas,
        totalUnitArea,
        totalQuota: finalRoundedTotal,
        commonPropertyArea,
        isValid,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        adjustmentApplied,
        adjustmentDetails,
      }
    } catch (error) {
      logger.error('Quota calculation failed', error as Error, { units })
      return {
        success: false,
        quotas: [],
        totalUnitArea: 0,
        totalQuota: 0,
        commonPropertyArea,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      }
    }
  })
}

/**
 * Round number to specified precision
 */
function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

/**
 * Adjust quota for a specific unit
 * Recalculates all quotas to maintain 100% total
 */
export function adjustQuota(
  units: UnitAreaData[],
  adjustedUnitId: string,
  newQuota: number,
  commonPropertyArea: number = 0,
  precision: number = 4
): QuotaCalculationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Find the unit to adjust
    const unitIndex = units.findIndex((u) => u.id === adjustedUnitId)
    if (unitIndex === -1) {
      return {
        success: false,
        quotas: [],
        totalUnitArea: 0,
        totalQuota: 0,
        commonPropertyArea,
        isValid: false,
        errors: [`Unit with ID ${adjustedUnitId} not found`],
      }
    }

    // Validate new quota
    if (newQuota < 0 || newQuota > 100) {
      return {
        success: false,
        quotas: [],
        totalUnitArea: 0,
        totalQuota: 0,
        commonPropertyArea,
        isValid: false,
        errors: ['Quota must be between 0 and 100'],
      }
    }

    // Calculate remaining quota to distribute
    const remainingUnits = units.filter((u) => u.id !== adjustedUnitId)
    const remainingQuota = 100 - newQuota

    if (remainingQuota < 0) {
      return {
        success: false,
        quotas: [],
        totalUnitArea: 0,
        totalQuota: 0,
        commonPropertyArea,
        isValid: false,
        errors: ['Adjusted quota exceeds 100%'],
      }
    }

    // Calculate total area of remaining units
    const totalRemainingArea = remainingUnits.reduce((sum, u) => sum + u.area, 0)

    if (totalRemainingArea === 0) {
      return {
        success: false,
        quotas: [],
        totalUnitArea: 0,
        totalQuota: 0,
        commonPropertyArea,
        isValid: false,
        errors: ['Remaining units have zero total area'],
      }
    }

    // Calculate quotas for remaining units proportionally
    const quotas: QuotaResult[] = remainingUnits.map((unit) => {
      const rawQuota = (unit.area / totalRemainingArea) * remainingQuota
      const quota = roundToPrecision(rawQuota, precision)
      const commonAreaShare = roundToPrecision(
        (quota / 100) * commonPropertyArea,
        2
      )

      return {
        sectionNumber: unit.sectionNumber,
        quota,
        area: unit.area,
        commonAreaShare,
      }
    })

    // Add adjusted unit
    const adjustedUnit = units[unitIndex]
    quotas.push({
      sectionNumber: adjustedUnit.sectionNumber,
      quota: roundToPrecision(newQuota, precision),
      area: adjustedUnit.area,
      commonAreaShare: roundToPrecision(
        (newQuota / 100) * commonPropertyArea,
        2
      ),
    })

    // Verify total
    const totalQuota = quotas.reduce((sum, q) => sum + q.quota, 0)
    const roundedTotal = roundToPrecision(totalQuota, precision)
    const isValid = Math.abs(roundedTotal - 100.0) <= Math.pow(10, -precision)

    if (!isValid) {
      warnings.push(
        `Quotas sum to ${roundedTotal.toFixed(precision)}% instead of 100.0000%`
      )
    }

    return {
      success: true,
      quotas,
      totalUnitArea: units.reduce((sum, u) => sum + u.area, 0),
      totalQuota: roundedTotal,
      commonPropertyArea,
      isValid,
      warnings: warnings.length > 0 ? warnings : undefined,
      adjustmentApplied: true,
      adjustmentDetails: `Manually adjusted quota for ${adjustedUnit.sectionNumber} to ${newQuota.toFixed(precision)}%`,
    }
  } catch (error) {
    logger.error('Quota adjustment failed', error as Error, {
      units,
      adjustedUnitId,
      newQuota,
    })
    return {
      success: false,
      quotas: [],
      totalUnitArea: 0,
      totalQuota: 0,
      commonPropertyArea,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Validate quota sum
 */
export function validateQuotaSum(quotas: QuotaResult[], precision: number = 4): {
  isValid: boolean
  total: number
  difference: number
  message: string
} {
  const total = quotas.reduce((sum, q) => sum + q.quota, 0)
  const roundedTotal = roundToPrecision(total, precision)
  const targetTotal = 100.0
  const difference = Math.abs(roundedTotal - targetTotal)
  const tolerance = Math.pow(10, -precision)

  return {
    isValid: difference <= tolerance,
    total: roundedTotal,
    difference,
    message: difference <= tolerance
      ? `Quotas sum to exactly ${roundedTotal.toFixed(precision)}%`
      : `Quotas sum to ${roundedTotal.toFixed(precision)}% (difference: ${difference.toFixed(precision)}%)`,
  }
}

