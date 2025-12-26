/**
 * Retry logic for transient failures
 * Implements exponential backoff and retry strategies
 */

import { logger } from './logger'
import { isRetryableError } from './errors/base'

interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryable?: (error: unknown) => boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryable: isRetryableError,
}

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1)
  return Math.min(delay, maxDelay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      if (!opts.retryable(error)) {
        logger.debug('Error is not retryable', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        })
        throw error
      }

      // Don't retry on last attempt
      if (attempt >= opts.maxAttempts) {
        logger.warn('Max retry attempts reached', {
          attempts: attempt,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      )

      logger.debug(`Retrying after ${delay}ms`, {
        attempt,
        maxAttempts: opts.maxAttempts,
        delay,
        error: error instanceof Error ? error.message : String(error),
      })

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Retry with custom retry condition
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  options: Omit<RetryOptions, 'retryable'> = {}
): Promise<T> {
  let attempt = 0
  return retry(fn, {
    ...options,
    retryable: (error: unknown) => {
      attempt++
      return shouldRetry(error, attempt)
    },
  })
}

/**
 * Retry specific number of times regardless of error type
 */
export async function retryNTimes<T>(
  fn: () => Promise<T>,
  times: number,
  options: Omit<RetryOptions, 'maxAttempts' | 'retryable'> = {}
): Promise<T> {
  return retry(fn, {
    ...options,
    maxAttempts: times,
    retryable: () => true, // Retry all errors
  })
}

