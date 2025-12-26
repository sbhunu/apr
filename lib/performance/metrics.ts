/**
 * Metrics Collection Service
 * Collects and aggregates system metrics
 */

import { monitor } from '@/lib/monitoring'
import { logger } from '@/lib/logger'

/**
 * System metrics
 */
export interface SystemMetrics {
  timestamp: string
  cpu?: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: {
    connections: number
    activeQueries: number
    slowQueries: number
  }
  api: {
    requestsPerMinute: number
    averageResponseTime: number
    errorRate: number
  }
  cache: {
    hitRate: number
    size: number
    evictions: number
  }
}

/**
 * Alert thresholds
 */
export interface AlertThresholds {
  cpuUsage?: number // Percentage
  memoryUsage?: number // Percentage
  responseTime?: number // Milliseconds
  errorRate?: number // Percentage
  databaseConnections?: number
}

/**
 * Default alert thresholds
 */
export const defaultAlertThresholds: AlertThresholds = {
  cpuUsage: 80,
  memoryUsage: 85,
  responseTime: 2000, // 2 seconds
  errorRate: 5, // 5%
  databaseConnections: 80,
}

/**
 * Alert
 */
export interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metric: string
  value: number
  threshold: number
  timestamp: string
}

class MetricsCollector {
  private alerts: Alert[] = []
  private readonly maxAlerts = 1000
  private thresholds: AlertThresholds = defaultAlertThresholds

  /**
   * Set alert thresholds
   */
  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Collect system metrics
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date().toISOString()

    // Collect memory metrics
    const memoryUsage = process.memoryUsage()
    const memory = {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    }

    // Collect performance metrics
    const performanceMetrics = monitor.getPerformanceMetrics()
    const recentMetrics = performanceMetrics.slice(-100) // Last 100 operations

    const api = {
      requestsPerMinute: recentMetrics.length,
      averageResponseTime:
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length || 0,
      errorRate:
        (recentMetrics.filter((m) => !m.success).length / recentMetrics.length) * 100 || 0,
    }

    const metrics: SystemMetrics = {
      timestamp,
      memory,
      database: {
        connections: 0, // Would need database connection pool metrics
        activeQueries: 0,
        slowQueries: recentMetrics.filter((m) => m.duration > 1000).length,
      },
      api,
      cache: {
        hitRate: 0, // Would need cache hit/miss tracking
        size: 0,
        evictions: 0,
      },
    }

    // Check thresholds and generate alerts
    this.checkThresholds(metrics)

    return metrics
  }

  /**
   * Check metrics against thresholds
   */
  private checkThresholds(metrics: SystemMetrics): void {
    // Memory usage alert
    if (this.thresholds.memoryUsage && metrics.memory.percentage > this.thresholds.memoryUsage) {
      this.addAlert({
        severity: metrics.memory.percentage > 95 ? 'critical' : 'high',
        message: `High memory usage: ${metrics.memory.percentage.toFixed(2)}%`,
        metric: 'memory.percentage',
        value: metrics.memory.percentage,
        threshold: this.thresholds.memoryUsage,
      })
    }

    // Response time alert
    if (
      this.thresholds.responseTime &&
      metrics.api.averageResponseTime > this.thresholds.responseTime
    ) {
      this.addAlert({
        severity: metrics.api.averageResponseTime > 5000 ? 'critical' : 'medium',
        message: `High average response time: ${metrics.api.averageResponseTime.toFixed(2)}ms`,
        metric: 'api.averageResponseTime',
        value: metrics.api.averageResponseTime,
        threshold: this.thresholds.responseTime,
      })
    }

    // Error rate alert
    if (this.thresholds.errorRate && metrics.api.errorRate > this.thresholds.errorRate) {
      this.addAlert({
        severity: metrics.api.errorRate > 10 ? 'critical' : 'high',
        message: `High error rate: ${metrics.api.errorRate.toFixed(2)}%`,
        metric: 'api.errorRate',
        value: metrics.api.errorRate,
        threshold: this.thresholds.errorRate,
      })
    }
  }

  /**
   * Add alert
   */
  private addAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    this.alerts.push(newAlert)

    // Keep only last maxAlerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift()
    }

    // Log alert
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.error('System alert triggered', new Error(alert.message), {
        severity: alert.severity,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
      })
    } else {
      logger.warn('System alert triggered', {
        severity: alert.severity,
        message: alert.message,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
      })
    }
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit).reverse()
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.alerts.filter((a) => a.severity === severity)
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }
}

export const metricsCollector = new MetricsCollector()

