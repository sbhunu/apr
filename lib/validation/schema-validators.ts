/**
 * Schema Validators using Zod
 * Runtime validation schemas for APR system data structures
 */

import { z } from 'zod'
import { ValidationError } from '@/lib/errors/base'

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

/**
 * Scheme naming conventions
 */
export const schemeNameSchema = z
  .string()
  .min(3, 'Scheme name must be at least 3 characters')
  .max(200, 'Scheme name must not exceed 200 characters')
  .regex(
    /^[A-Za-z0-9\s\-_.,()]+$/,
    'Scheme name can only contain letters, numbers, spaces, hyphens, underscores, commas, periods, and parentheses'
  )
  .refine(
    (val) => val.trim().length > 0,
    'Scheme name cannot be empty or only whitespace'
  )

/**
 * Plan number format: PLAN-YYYY-NNN
 */
export const planNumberSchema = z
  .string()
  .regex(
    /^PLAN-\d{4}-\d{3}$/,
    'Plan number must be in format PLAN-YYYY-NNN (e.g., PLAN-2025-001)'
  )

/**
 * Survey number format: SURVEY-YYYY-NNN
 */
export const surveyNumberSchema = z
  .string()
  .regex(
    /^SURVEY-\d{4}-\d{3}$/,
    'Survey number must be in format SURVEY-YYYY-NNN (e.g., SURVEY-2025-001)'
  )

/**
 * Scheme number format: SS/YYYY/PROVINCE/NNN
 */
export const schemeNumberSchema = z
  .string()
  .regex(
    /^SS\/\d{4}\/[A-Z_]+\/\d{3}$/,
    'Scheme number must be in format SS/YYYY/PROVINCE/NNN (e.g., SS/2025/HARARE/001)'
  )

/**
 * Title number format: T/YYYY/PROVINCE/NNN
 */
export const titleNumberSchema = z
  .string()
  .regex(
    /^T\/\d{4}\/[A-Z_]+\/\d{3}$/,
    'Title number must be in format T/YYYY/PROVINCE/NNN (e.g., T/2025/HARARE/001)'
  )

/**
 * Area validation (in square meters)
 */
export const areaSchema = z
  .number()
  .positive('Area must be positive')
  .min(0.01, 'Area must be at least 0.01 m²')
  .max(1000000, 'Area must not exceed 1,000,000 m²')
  .refine(
    (val) => {
      // Check decimal places (max 2)
      const decimalPlaces = (val.toString().split('.')[1] || '').length
      return decimalPlaces <= 2
    },
    'Area can have maximum 2 decimal places'
  )

/**
 * Participation quota validation (percentage)
 */
export const participationQuotaSchema = z
  .number()
  .min(0, 'Participation quota cannot be negative')
  .max(100, 'Participation quota cannot exceed 100%')
  .refine(
    (val) => {
      // Check decimal places (max 4)
      const decimalPlaces = (val.toString().split('.')[1] || '').length
      return decimalPlaces <= 4
    },
    'Participation quota can have maximum 4 decimal places'
  )

/**
 * Legal description validation
 */
export const legalDescriptionSchema = z
  .string()
  .min(10, 'Legal description must be at least 10 characters')
  .max(5000, 'Legal description must not exceed 5000 characters')
  .refine(
    (val) => val.trim().length > 0,
    'Legal description cannot be empty or only whitespace'
  )

/**
 * Section number validation
 */
export const sectionNumberSchema = z
  .string()
  .min(1, 'Section number is required')
  .max(50, 'Section number must not exceed 50 characters')
  .regex(
    /^[A-Za-z0-9\s\-_]+$/,
    'Section number can only contain letters, numbers, spaces, hyphens, and underscores'
  )

/**
 * Holder name validation
 */
export const holderNameSchema = z
  .string()
  .min(2, 'Holder name must be at least 2 characters')
  .max(200, 'Holder name must not exceed 200 characters')
  .regex(
    /^[A-Za-z\s\-'.,]+$/,
    'Holder name can only contain letters, spaces, hyphens, apostrophes, commas, and periods'
  )

/**
 * Holder ID validation (National ID, company registration, etc.)
 */
export const holderIdSchema = z
  .string()
  .min(5, 'Holder ID must be at least 5 characters')
  .max(50, 'Holder ID must not exceed 50 characters')
  .regex(/^[A-Za-z0-9\-_]+$/, 'Holder ID contains invalid characters')

/**
 * Location name validation
 */
export const locationNameSchema = z
  .string()
  .min(2, 'Location name must be at least 2 characters')
  .max(200, 'Location name must not exceed 200 characters')
  .regex(
    /^[A-Za-z0-9\s\-_.,()]+$/,
    'Location name contains invalid characters'
  )

/**
 * Planning plan schema
 */
export const planningPlanSchema = z.object({
  plan_number: planNumberSchema,
  title: schemeNameSchema,
  description: z.string().max(2000).optional(),
  location_name: locationNameSchema.optional(),
  planner_id: z.string().uuid('Invalid planner ID format'),
  planner_name: z.string().min(2).max(200).optional(),
  planner_registration_number: z.string().max(50).optional(),
})

/**
 * Survey plan schema
 */
export const surveyPlanSchema = z.object({
  survey_number: surveyNumberSchema,
  title: schemeNameSchema,
  description: z.string().max(2000).optional(),
  planning_plan_id: z.string().uuid('Invalid planning plan ID format'),
  surveyor_id: z.string().uuid('Invalid surveyor ID format'),
  surveyor_name: z.string().min(2).max(200).optional(),
  surveyor_registration_number: z.string().max(50).optional(),
  parent_parcel_area: areaSchema.optional(),
  closure_error: z.number().optional(),
  accuracy_ratio: z.number().positive().optional(),
})

/**
 * Section schema
 */
export const sectionSchema = z.object({
  section_number: sectionNumberSchema,
  section_type: z.enum(['residential', 'commercial', 'parking', 'storage', 'common', 'other']).optional(),
  area: areaSchema,
  participation_quota: participationQuotaSchema,
  common_area_share: areaSchema.optional(),
  legal_description: legalDescriptionSchema.optional(),
  rights_and_conditions: z.string().max(2000).optional(),
  restrictions: z.string().max(2000).optional(),
})

/**
 * Sectional scheme schema
 */
export const sectionalSchemeSchema = z.object({
  scheme_number: schemeNumberSchema,
  scheme_name: schemeNameSchema,
  description: z.string().max(2000).optional(),
  survey_plan_id: z.string().uuid('Invalid survey plan ID format'),
  planning_plan_id: z.string().uuid('Invalid planning plan ID format'),
  communal_land_id: z.string().max(100).optional(),
})

/**
 * Sectional title schema
 */
export const sectionalTitleSchema = z.object({
  title_number: titleNumberSchema,
  section_id: z.string().uuid('Invalid section ID format'),
  holder_name: holderNameSchema,
  holder_id: holderIdSchema.optional(),
  holder_type: z.enum(['individual', 'company', 'trust', 'government', 'other']).optional(),
  conditions: z.string().max(2000).optional(),
  restrictions: z.string().max(2000).optional(),
})

/**
 * Validate data against schema
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map((err) => {
        return new ValidationError(
          err.message,
          err.path.join('.') || 'root',
          undefined,
          {
            code: err.code,
            path: err.path,
          }
        )
      })

      return {
        success: false,
        errors: validationErrors,
      }
    }

    return {
      success: false,
      errors: [
        new ValidationError(
          'Validation failed',
          'unknown',
          undefined,
          { originalError: error instanceof Error ? error.message : String(error) }
        ),
      ],
    }
  }
}

/**
 * Safe parse (doesn't throw)
 */
export function safeParseSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  return validateSchema(schema, data)
}

/**
 * Format validation errors for UI display
 */
export function formatValidationErrors(errors: ValidationError[]): {
  field: string
  message: string
}[] {
  return errors.map((error) => ({
    field: error.context?.field || 'unknown',
    message: error.message,
  }))
}

