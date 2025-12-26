/**
 * Error utility functions
 * Helper functions for error handling and formatting
 */

import { isAppError, AppError } from '../errors/base'

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

/**
 * Extract error code from unknown error type
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code
  }
  if (error instanceof Error && 'code' in error) {
    return String(error.code)
  }
  return 'UNKNOWN_ERROR'
}

/**
 * Extract status code from unknown error type
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode
  }
  if (error instanceof Error && 'statusCode' in error) {
    return Number(error.statusCode)
  }
  return 500
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
  const statusCode = getStatusCode(error)
  return statusCode >= 400 && statusCode < 500
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  const statusCode = getStatusCode(error)
  return statusCode >= 500 && statusCode < 600
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): {
  title: string
  message: string
  canRetry: boolean
} {
  if (isAppError(error)) {
    return {
      title: 'Error',
      message: error.message,
      canRetry: error.isOperational && error.statusCode >= 500,
    }
  }

  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message,
      canRetry: false,
    }
  }

  return {
    title: 'Error',
    message: 'An unexpected error occurred',
    canRetry: false,
  }
}

