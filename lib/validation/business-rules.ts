/**
 * Business Rules Validation
 * Domain-specific validation rules for APR system
 */

import { ValidationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

/**
 * Business rule validation result
 */
export interface BusinessRuleResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Section data for quota validation
 */
export interface SectionData {
  sectionNumber: string
  area: number
  participationQuota: number
}

/**
 * Validate participation quotas sum to 100%
 */
export function validateQuotaSum(
  sections: SectionData[],
  tolerance: number = 0.0001
): BusinessRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (sections.length === 0) {
    errors.push('At least one section is required')
    return { valid: false, errors, warnings }
  }

  const quotaSum = sections.reduce((sum, section) => sum + section.participationQuota, 0)
  const difference = Math.abs(quotaSum - 100.0)

  if (difference > tolerance) {
    errors.push(
      `Participation quotas must sum to 100%. Current sum: ${quotaSum.toFixed(4)}% (difference: ${difference.toFixed(4)}%)`
    )
  }

  // Check for negative quotas
  const negativeQuotas = sections.filter((s) => s.participationQuota < 0)
  if (negativeQuotas.length > 0) {
    errors.push(
      `Negative participation quotas found for sections: ${negativeQuotas.map((s) => s.sectionNumber).join(', ')}`
    )
  }

  // Check for quotas exceeding 100%
  const excessiveQuotas = sections.filter((s) => s.participationQuota > 100)
  if (excessiveQuotas.length > 0) {
    errors.push(
      `Participation quotas exceeding 100% found for sections: ${excessiveQuotas.map((s) => s.sectionNumber).join(', ')}`
    )
  }

  // Warning for very small quotas
  const smallQuotas = sections.filter((s) => s.participationQuota > 0 && s.participationQuota < 0.01)
  if (smallQuotas.length > 0) {
    warnings.push(
      `Very small participation quotas (<0.01%) found for sections: ${smallQuotas.map((s) => s.sectionNumber).join(', ')}`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate area consistency
 */
export function validateAreaConsistency(
  totalSectionArea: number,
  commonArea: number,
  parentParcelArea: number,
  tolerance: number = 0.01
): BusinessRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  const totalUsedArea = totalSectionArea + commonArea
  const difference = Math.abs(totalUsedArea - parentParcelArea)

  if (difference > tolerance) {
    errors.push(
      `Area inconsistency detected. Total section area (${totalSectionArea.toFixed(2)} m²) + common area (${commonArea.toFixed(2)} m²) = ${totalUsedArea.toFixed(2)} m², but parent parcel area is ${parentParcelArea.toFixed(2)} m². Difference: ${difference.toFixed(2)} m²`
    )
  }

  // Check for negative areas
  if (totalSectionArea < 0) {
    errors.push('Total section area cannot be negative')
  }
  if (commonArea < 0) {
    errors.push('Common area cannot be negative')
  }
  if (parentParcelArea < 0) {
    errors.push('Parent parcel area cannot be negative')
  }

  // Warning if common area is very large relative to sections
  if (totalSectionArea > 0) {
    const commonAreaRatio = (commonArea / totalSectionArea) * 100
    if (commonAreaRatio > 50) {
      warnings.push(
        `Common area (${commonAreaRatio.toFixed(1)}% of section area) seems unusually large. Please verify.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate scheme naming conventions
 */
export function validateSchemeNaming(schemeName: string): BusinessRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check length
  if (schemeName.length < 3) {
    errors.push('Scheme name must be at least 3 characters')
  }
  if (schemeName.length > 200) {
    errors.push('Scheme name must not exceed 200 characters')
  }

  // Check for reserved words
  const reservedWords = ['TEST', 'DUMMY', 'EXAMPLE', 'SAMPLE']
  const upperName = schemeName.toUpperCase()
  if (reservedWords.some((word) => upperName.includes(word))) {
    warnings.push(
      `Scheme name contains reserved word. Please use a more descriptive name.`
    )
  }

  // Check for proper capitalization (first letter should be uppercase)
  if (schemeName.length > 0 && schemeName[0] !== schemeName[0].toUpperCase()) {
    warnings.push('Scheme name should start with an uppercase letter')
  }

  // Check for excessive special characters
  const specialCharCount = (schemeName.match(/[^A-Za-z0-9\s]/g) || []).length
  if (specialCharCount > schemeName.length * 0.2) {
    warnings.push('Scheme name contains many special characters. Consider simplifying.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate legal description format
 */
export function validateLegalDescription(description: string): BusinessRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (description.length < 10) {
    errors.push('Legal description must be at least 10 characters')
  }
  if (description.length > 5000) {
    errors.push('Legal description must not exceed 5000 characters')
  }

  // Check for required legal terms
  const requiredTerms = ['section', 'scheme', 'unit']
  const lowerDescription = description.toLowerCase()
  const missingTerms = requiredTerms.filter((term) => !lowerDescription.includes(term))

  if (missingTerms.length > 0) {
    warnings.push(
      `Legal description may be missing standard terms: ${missingTerms.join(', ')}`
    )
  }

  // Check for proper sentence structure
  if (!description.match(/[.!?]$/)) {
    warnings.push('Legal description should end with proper punctuation')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate closure error and accuracy
 */
export function validateSurveyAccuracy(
  closureError: number,
  accuracyRatio: number,
  maxClosureError: number = 0.01,
  minAccuracyRatio: number = 10000
): BusinessRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (Math.abs(closureError) > maxClosureError) {
    errors.push(
      `Closure error (${closureError.toFixed(6)}) exceeds maximum allowed (${maxClosureError})`
    )
  }

  if (accuracyRatio < minAccuracyRatio) {
    errors.push(
      `Accuracy ratio (1:${accuracyRatio.toFixed(0)}) is below minimum required (1:${minAccuracyRatio})`
    )
  }

  // Warning for borderline accuracy
  if (accuracyRatio >= minAccuracyRatio && accuracyRatio < minAccuracyRatio * 1.2) {
    warnings.push(
      `Accuracy ratio (1:${accuracyRatio.toFixed(0)}) is close to minimum requirement. Consider improving survey precision.`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate section numbering uniqueness
 */
export function validateSectionNumbering(sections: SectionData[]): BusinessRuleResult {
  const errors: string[] = []
  const seen = new Set<string>()

  for (const section of sections) {
    const normalized = section.sectionNumber.toLowerCase().trim()
    if (seen.has(normalized)) {
      errors.push(`Duplicate section number: ${section.sectionNumber}`)
    }
    seen.add(normalized)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate cross-field consistency
 */
export function validateCrossFieldConsistency(data: {
  sections: SectionData[]
  totalArea: number
  commonArea: number
  parentParcelArea: number
}): BusinessRuleResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate quota sum
  const quotaResult = validateQuotaSum(data.sections)
  if (!quotaResult.valid) {
    errors.push(...quotaResult.errors)
  }
  if (quotaResult.warnings) {
    warnings.push(...quotaResult.warnings)
  }

  // Validate area consistency
  const areaResult = validateAreaConsistency(
    data.totalArea,
    data.commonArea,
    data.parentParcelArea
  )
  if (!areaResult.valid) {
    errors.push(...areaResult.errors)
  }
  if (areaResult.warnings) {
    warnings.push(...areaResult.warnings)
  }

  // Validate section numbering
  const numberingResult = validateSectionNumbering(data.sections)
  if (!numberingResult.valid) {
    errors.push(...numberingResult.errors)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Aggregate validation results
 */
export function aggregateValidationResults(
  results: BusinessRuleResult[]
): BusinessRuleResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  results.forEach((result) => {
    if (result.errors) {
      allErrors.push(...result.errors)
    }
    if (result.warnings) {
      allWarnings.push(...result.warnings)
    }
  })

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  }
}

