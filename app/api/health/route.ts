/**
 * Health Check API Route
 * Provides system health status for monitoring
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { metricsCollector } from '@/lib/performance/metrics'
import { monitor } from '@/lib/monitoring'

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {}

  // Check database connection
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('apr.user_profiles').select('id').limit(1)

    if (error) {
      checks.database = { status: 'error', message: error.message }
    } else {
      checks.database = { status: 'ok' }
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage()
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100

  if (memoryPercentage > 90) {
    checks.memory = {
      status: 'error',
      message: `High memory usage: ${memoryPercentage.toFixed(2)}%`,
    }
  } else {
    checks.memory = { status: 'ok' }
  }

  // Overall health status
  const allHealthy = Object.values(checks).every((check) => check.status === 'ok')
  const responseTime = Date.now() - startTime

  // Collect metrics
  const metrics = await metricsCollector.collectMetrics()

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        responseTime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: memoryPercentage,
        },
        uptime: process.uptime(),
      },
      alerts: metricsCollector.getAlerts(10),
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  )
}

