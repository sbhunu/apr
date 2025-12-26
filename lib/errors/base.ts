/**
 * Base error classes for the APR system
 * Provides structured error handling with proper classification
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, unknown>
  public readonly timestamp: string

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    this.timestamp = new Date().toISOString()

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }

  /**
   * Sanitize error for client response (removes sensitive data)
   */
  toSafeJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Validation error - user input validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      true,
      {
        field,
        value: value !== undefined ? String(value) : undefined,
        ...context,
      }
    )
  }
}

/**
 * Authorization error - user lacks required permissions
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'You do not have permission to perform this action',
    resource?: string,
    action?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      true,
      {
        resource,
        action,
        ...context,
      }
    )
  }
}

/**
 * Authentication error - user not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      true,
      context
    )
  }
}

/**
 * Not found error - resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string | number,
    context?: Record<string, unknown>
  ) {
    super(
      `Resource not found: ${resource}${identifier ? ` (${identifier})` : ''}`,
      'NOT_FOUND_ERROR',
      404,
      true,
      {
        resource,
        identifier,
        ...context,
      }
    )
  }
}

/**
 * Conflict error - resource conflict (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    resource?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'CONFLICT_ERROR',
      409,
      true,
      {
        resource,
        ...context,
      }
    )
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      429,
      true,
      {
        retryAfter,
        ...context,
      }
    )
  }
}

/**
 * System error - internal server errors
 */
export class SystemError extends AppError {
  constructor(
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'SYSTEM_ERROR',
      500,
      false, // Not operational - indicates bug
      {
        originalError: originalError?.message,
        originalErrorName: originalError?.name,
        ...context,
      }
    )
  }
}

/**
 * Database error - database operation failures
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    operation?: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      false,
      {
        operation,
        originalError: originalError?.message,
        originalErrorName: originalError?.name,
        ...context,
      }
    )
  }
}

/**
 * Network error - external API/network failures
 */
export class NetworkError extends AppError {
  public readonly isRetryable: boolean

  constructor(
    message: string,
    isRetryable: boolean = true,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'NETWORK_ERROR',
      statusCode || 503,
      true,
      context
    )
    this.isRetryable = isRetryable
  }
}

/**
 * External service error - third-party service failures
 */
export class ExternalServiceError extends AppError {
  public readonly service: string
  public readonly isRetryable: boolean

  constructor(
    service: string,
    message: string,
    isRetryable: boolean = true,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'EXTERNAL_SERVICE_ERROR',
      statusCode || 502,
      true,
      {
        service,
        ...context,
      }
    )
    this.service = service
    this.isRetryable = isRetryable
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    if (error instanceof NetworkError || error instanceof ExternalServiceError) {
      return error.isRetryable
    }
    // Operational errors are generally retryable
    return error.isOperational && error.statusCode >= 500
  }
  return false
}

