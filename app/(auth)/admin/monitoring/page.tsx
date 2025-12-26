/**
 * Performance Monitoring Dashboard
 * Admin dashboard for system performance monitoring
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  Zap,
  TrendingUp,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

interface SystemMetrics {
  timestamp: string
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

interface Alert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metric: string
  value: number
  threshold: number
  timestamp: string
}

export default function MonitoringDashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [performance, setPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadMetrics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadMetrics()
      setLastUpdated(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadMetrics() {
    try {
      const response = await fetch('/api/metrics', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Check if response has content
      const text = await response.text()
      if (!text || text.trim() === '') {
        throw new Error('Empty response from server')
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        console.error('Response text:', text)
        throw new Error('Invalid JSON response')
      }

      if (data.metrics) {
        setMetrics(data.metrics)
      } else {
        // Set default metrics if not provided
        setMetrics({
          timestamp: new Date().toISOString(),
          memory: {
            used: 0,
            total: 0,
            percentage: 0,
          },
          database: {
            connections: 0,
            activeQueries: 0,
            slowQueries: 0,
          },
          api: {
            requestsPerMinute: 0,
            averageResponseTime: 0,
            errorRate: 0,
          },
          cache: {
            hitRate: 0,
            size: 0,
            evictions: 0,
          },
        })
      }

      if (data.alerts) {
        setAlerts(data.alerts)
      } else {
        setAlerts([])
      }

      if (data.performance) {
        setPerformance(data.performance)
      } else {
        setPerformance({
          operations: {},
          recent: [],
        })
      }
    } catch (error) {
      console.error('Failed to load metrics', error)
      // Set default values on error
      setMetrics({
        timestamp: new Date().toISOString(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
        database: {
          connections: 0,
          activeQueries: 0,
          slowQueries: 0,
        },
        api: {
          requestsPerMinute: 0,
          averageResponseTime: 0,
          errorRate: 0,
        },
        cache: {
          hitRate: 0,
          size: 0,
          evictions: 0,
        },
      })
      setAlerts([])
      setPerformance({
        operations: {},
        recent: [],
      })
    } finally {
      setLoading(false)
    }
  }

  function getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-orange-600'
      case 'medium':
        return 'bg-yellow-600'
      case 'low':
        return 'bg-blue-600'
      default:
        return 'bg-gray-600'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
          <p className="text-muted-foreground">System metrics and health monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Link href="/admin/security">
              <Button variant="outline" size="sm">Security & PKI</Button>
            </Link>
            <Link href="/admin/jobs">
              <Button variant="outline" size="sm">Job Queue</Button>
            </Link>
          </div>
          <Badge variant="outline" className="text-xs">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button onClick={loadMetrics} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Active Alerts</h2>
          {alerts.slice(0, 5).map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                {alert.message}
              </AlertTitle>
              <AlertDescription>
                {alert.metric}: {alert.value.toFixed(2)} (threshold: {alert.threshold})
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Memory Usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.memory.percentage.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {(metrics.memory.used / 1024 / 1024).toFixed(0)} MB /{' '}
                {(metrics.memory.total / 1024 / 1024).toFixed(0)} MB
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>API Response Time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.api.averageResponseTime.toFixed(0)}ms
              </div>
              <p className="text-sm text-muted-foreground">
                {metrics.api.requestsPerMinute} req/min
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Error Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.api.errorRate.toFixed(2)}%
              </div>
              <p className="text-sm text-muted-foreground">Last minute</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Database</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.database.slowQueries}</div>
              <p className="text-sm text-muted-foreground">Slow queries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Charts */}
      {performance && performance.operations && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Operation Performance</CardTitle>
              <CardDescription>Average duration by operation</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(performance.operations).map(([name, stats]: [string, any]) => ({
                    name: name.substring(0, 20),
                    duration: stats.avgDuration,
                    count: stats.count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="duration" fill="#228B22" name="Avg Duration (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Rate</CardTitle>
              <CardDescription>Success rate by operation</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(performance.operations).map(([name, stats]: [string, any]) => ({
                    name: name.substring(0, 20),
                    successRate: stats.successRate * 100,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successRate" fill="#1E90FF" name="Success Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && !metrics && (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading metrics...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

