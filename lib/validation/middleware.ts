/**
 * Validation Middleware for API Routes
 * Provides request validation using Zod schemas and business rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ValidationError } from '@/lib/errors/base'
import { validateSchema, formatValidationErrors } from './schema-validators'
import { BusinessRuleResult, validateCrossFieldConsistency } from './business-rules'
import { logger } from '@/lib/logger'

/**
 * Validation middleware options
 */
export interface ValidationMiddlewareOptions<T> {
  schema: z.ZodSchema<T>
  businessRules?: (data: T) => BusinessRuleResult | BusinessRuleResult[]
  onError?: (errors: ValidationError[]) => NextResponse
  onBusinessRuleError?: (result: BusinessRuleResult) => NextResponse
}

/**
 * Validation context passed to handler
 */
export interface ValidationContext<T> {
  validatedData: T
  request: NextRequest
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware<T>(
  options: ValidationMiddlewareOptions<T>
) {
  return async (
    request: NextRequest,
    handler: (context: ValidationContext<T>) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // Parse request body
      let body: unknown
      try {
        body = await request.json()
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid JSON in request body',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 400 }
        )
      }

      // Validate schema
      const schemaResult = validateSchema(options.schema, body)
      if (!schemaResult.success || !schemaResult.data) {
        const formattedErrors = formatValidationErrors(schemaResult.errors || [])
        
        if (options.onError) {
          return options.onError(schemaResult.errors || [])
        }

        logger.warn('Schema validation failed', {
          errors: formattedErrors,
          path: request.nextUrl.pathname,
        })

        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            errors: formattedErrors,
          },
          { status: 400 }
        )
      }

      const validatedData = schemaResult.data

      // Apply business rules if provided
      if (options.businessRules) {
        const businessRuleResult = options.businessRules(validatedData)
        const results = Array.isArray(businessRuleResult)
          ? businessRuleResult
          : [businessRuleResult]

        const aggregated = results.reduce(
          (acc, result) => {
            if (!result.valid) {
              acc.valid = false
              acc.errors.push(...result.errors)
            }
            if (result.warnings) {
              acc.warnings.push(...result.warnings)
            }
            return acc
          },
          { valid: true, errors: [] as string[], warnings: [] as string[] }
        )

        if (!aggregated.valid) {
          if (options.onBusinessRuleError) {
            return options.onBusinessRuleError({
              valid: false,
              errors: aggregated.errors,
              warnings: aggregated.warnings.length > 0 ? aggregated.warnings : undefined,
            })
          }

          logger.warn('Business rule validation failed', {
            errors: aggregated.errors,
            warnings: aggregated.warnings,
            path: request.nextUrl.pathname,
          })

          return NextResponse.json(
            {
              success: false,
              error: 'Business rule validation failed',
              errors: aggregated.errors,
              warnings: aggregated.warnings.length > 0 ? aggregated.warnings : undefined,
            },
            { status: 422 } // 422 Unprocessable Entity
          )
        }
      }

      // Call handler with validated data
      return await handler({
        validatedData,
        request,
      })
    } catch (error) {
      logger.error('Validation middleware error', error as Error, {
        path: request.nextUrl.pathname,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Validate request body with schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: boolean; data?: T; errors?: ValidationError[] }> {
  try {
    const body = await request.json()
    return validateSchema(schema, body)
  } catch (error) {
    return {
      success: false,
      errors: [
        new ValidationError(
          'Invalid request body',
          'body',
          undefined,
          { originalError: error instanceof Error ? error.message : String(error) }
        ),
      ],
    }
  }
}

/**
 * Format validation errors for API response
 */
export function formatApiValidationErrors(errors: ValidationError[]): {
  field: string
  message: string
  code?: string
}[] {
  return errors.map((error) => ({
    field: error.context?.field || 'unknown',
    message: error.message,
    code: error.code,
  }))
}

