/**
 * API Route Error Handler
 * Provides consistent error handling for API routes
 */

import { NextResponse } from 'next/server'
import {
  AppError,
  isAppError,
  ValidationError,
  AuthorizationError,
  AuthenticationError,
  NotFoundError,
  SystemError,
} from './errors/base'
import { logger } from './logger'

/**
 * Handle errors in API routes and return appropriate responses
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error
  logger.error('API error occurred', error instanceof Error ? error : new Error(String(error)), {
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  })

  // Handle AppError instances
  if (isAppError(error)) {
    const safeError = error.toSafeJSON()

    return NextResponse.json(
      {
        error: {
          ...safeError,
          message: error.message,
        },
      },
      { status: error.statusCode }
    )
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json(
      {
        error: {
          name: 'InternalServerError',
          message: isDevelopment
            ? error.message
            : 'An internal server error occurred',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
          timestamp: new Date().toISOString(),
          ...(isDevelopment && { stack: error.stack }),
        },
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  return NextResponse.json(
    {
      error: {
        name: 'UnknownError',
        message: 'An unknown error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 500 }
  )
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Create error response helpers
 */
export const apiErrors = {
  validation: (message: string, field?: string, value?: unknown) =>
    handleApiError(new ValidationError(message, field, value)),

  unauthorized: (message?: string) =>
    handleApiError(new AuthenticationError(message)),

  forbidden: (message?: string, resource?: string, action?: string) =>
    handleApiError(new AuthorizationError(message, resource, action)),

  notFound: (resource: string, identifier?: string | number) =>
    handleApiError(new NotFoundError(resource, identifier)),

  internal: (message: string, originalError?: Error) =>
    handleApiError(new SystemError(message, originalError)),
}

