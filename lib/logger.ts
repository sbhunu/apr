/**
 * Logging infrastructure for APR system
 * Provides structured logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  metadata?: Record<string, unknown>
}

class Logger {
  private isDevelopment: boolean
  private logLevel: LogLevel

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    // Set log level from environment or default to 'info'
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }
    return levels[level] >= levels[this.logLevel]
  }

  /**
   * Sanitize sensitive data from log entries
   */
  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'credit',
      'card',
      'ssn',
      'api_key',
      'apiKey',
      'access_token',
      'refresh_token',
    ]

    const sanitized = { ...data }

    for (const key in sanitized) {
      const lowerKey = key.toLowerCase()
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]'
      }
      // Recursively sanitize nested objects
      if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null &&
        !Array.isArray(sanitized[key])
      ) {
        sanitized[key] = this.sanitize(
          sanitized[key] as Record<string, unknown>
        )
      }
    }

    return sanitized
  }

  /**
   * Format log entry for output
   */
  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      const parts = [
        `[${entry.timestamp}]`,
        entry.level.toUpperCase().padEnd(5),
        entry.message,
      ]

      if (entry.context) {
        parts.push('\n  Context:', JSON.stringify(entry.context, null, 2))
      }

      if (entry.error) {
        parts.push(
          '\n  Error:',
          entry.error.name,
          '-',
          entry.error.message
        )
        if (entry.error.stack && this.logLevel === 'debug') {
          parts.push('\n  Stack:', entry.error.stack)
        }
      }

      if (entry.metadata) {
        parts.push('\n  Metadata:', JSON.stringify(entry.metadata, null, 2))
      }

      return parts.join(' ')
    } else {
      // JSON format for production
      return JSON.stringify(entry)
    }
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    if (context) {
      entry.context = this.sanitize(context)
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }

      // Add error code if it's an AppError
      if ('code' in error && typeof error.code === 'string') {
        entry.error.code = error.code
      }
    }

    return entry
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return
    }

    const formatted = this.formatLog(entry)

    switch (entry.level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  /**
   * Debug log - detailed information for debugging
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.writeLog(this.createLogEntry('debug', message, context))
  }

  /**
   * Info log - general information
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.writeLog(this.createLogEntry('info', message, context))
  }

  /**
   * Warning log - warnings that don't stop execution
   */
  warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.writeLog(this.createLogEntry('warn', message, context, error))
  }

  /**
   * Error log - errors that need attention
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.writeLog(this.createLogEntry('error', message, context, error))
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    context?: Record<string, unknown>
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this.writeLog(
      this.createLogEntry(
        level,
        `${method} ${path} ${statusCode}${duration ? ` (${duration}ms)` : ''}`,
        {
          method,
          path,
          statusCode,
          duration,
          ...context,
        }
      )
    )
  }

  /**
   * Log database operation
   */
  logDatabase(
    operation: string,
    table: string,
    duration?: number,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    const level = error ? 'error' : 'debug'
    this.writeLog(
      this.createLogEntry(
        level,
        `DB ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`,
        {
          operation,
          table,
          duration,
          ...context,
        },
        error
      )
    )
  }
}

// Export singleton instance
export const logger = new Logger()

// Export Logger class for testing
export { Logger }

