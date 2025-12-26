/**
 * Performance monitoring and metrics collection
 * Tracks performance metrics, errors, and system health
 */

import { logger } from './logger'

interface Metric {
  name: string
  value: number
  unit: string
  timestamp: string
  tags?: Record<string, string>
}

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: string
  success: boolean
  metadata?: Record<string, unknown>
}

class Monitor {
  private metrics: Metric[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private readonly maxMetrics = 1000 // Keep last 1000 metrics in memory

  /**
   * Record a performance metric
   */
  recordPerformance(
    operation: string,
    duration: number,
    success: boolean = true,
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      success,
      metadata,
    }

    this.performanceMetrics.push(metric)

    // Keep only last maxMetrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics.shift()
    }

    // Log slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operation} took ${duration}ms`, {
        operation,
        duration,
        ...metadata,
      })
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags?: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
    }

    this.metrics.push(metric)

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * Measure execution time of an async function
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now()
    let success = true

    try {
      const result = await fn()
      return result
    } catch (error) {
      success = false
      throw error
    } finally {
      const duration = Date.now() - start
      this.recordPerformance(operation, duration, success, metadata)
    }
  }

  /**
   * Measure execution time of a sync function
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const start = Date.now()
    let success = true

    try {
      const result = fn()
      return result
    } catch (error) {
      success = false
      throw error
    } finally {
      const duration = Date.now() - start
      this.recordPerformance(operation, duration, success, metadata)
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getPerformanceStats(operation: string): {
    count: number
    avgDuration: number
    minDuration: number
    maxDuration: number
    successRate: number
  } {
    const ops = this.performanceMetrics.filter((m) => m.operation === operation)

    if (ops.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
      }
    }

    const durations = ops.map((m) => m.duration)
    const successes = ops.filter((m) => m.success).length

    return {
      count: ops.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successes / ops.length,
    }
  }

  /**
   * Get all metrics (for debugging/monitoring endpoints)
   */
  getMetrics(): Metric[] {
    return [...this.metrics]
  }

  /**
   * Get all performance metrics (for debugging/monitoring endpoints)
   */
  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics]
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.metrics = []
    this.performanceMetrics = []
  }
}

// Export singleton instance + a callable wrapper for convenience.
// This lets us use either:
// - await monitor('operation_name', async () => { ... })
// - monitor.getPerformanceMetrics()
const monitorInstance = new Monitor()

export const monitor = Object.assign(
  async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> => {
    return monitorInstance.measure(operation, fn, metadata)
  },
  monitorInstance
)

// Export Monitor class for testing
export { Monitor }

