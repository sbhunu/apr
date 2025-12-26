/**
 * Performance Metrics Page
 * System performance analysis and metrics
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

interface PerformanceMetrics {
  averageProcessingTime: {
    planning: number
    survey: number
    deeds: number
  }
  completionRate: {
    planning: number
    survey: number
    deeds: number
  }
  backlog: {
    planning: number
    survey: number
    deeds: number
  }
}

export default function PerformanceMetricsPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPerformanceMetrics()
  }, [])

  async function loadPerformanceMetrics() {
    try {
      const response = await fetch('/api/analytics/performance')
      const data = await response.json()

      if (data.success) {
        setMetrics(data.metrics)
      } else {
        setError(data.error || 'Failed to load performance metrics')
      }
    } catch (err) {
      setError('Failed to load performance metrics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading performance metrics...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Metrics</h1>
          <p className="text-muted-foreground mt-2">
            System performance analysis and processing times
          </p>
        </div>
        <Button onClick={loadPerformanceMetrics}>Refresh</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Performance Cards */}
      {metrics && (
        <>
          {/* Average Processing Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Planning Average Time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.averageProcessingTime.planning.toFixed(1)} days
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Survey Average Time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.averageProcessingTime.survey.toFixed(1)} days
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Deeds Average Time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.averageProcessingTime.deeds.toFixed(1)} days
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Completion Rates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Planning Completion Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.completionRate.planning.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Survey Completion Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.completionRate.survey.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Deeds Completion Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.completionRate.deeds.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Backlog */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Planning Backlog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.backlog.planning}</div>
                <p className="text-sm text-muted-foreground mt-1">pending items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Survey Backlog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.backlog.survey}</div>
                <p className="text-sm text-muted-foreground mt-1">pending items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Deeds Backlog
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.backlog.deeds}</div>
                <p className="text-sm text-muted-foreground mt-1">pending items</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Times Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Average Processing Times</CardTitle>
                <CardDescription>Days to complete each stage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        stage: 'Planning',
                        days: metrics.averageProcessingTime.planning,
                      },
                      {
                        stage: 'Survey',
                        days: metrics.averageProcessingTime.survey,
                      },
                      {
                        stage: 'Deeds',
                        days: metrics.averageProcessingTime.deeds,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="days" fill="#228B22" name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion Rates Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rates</CardTitle>
                <CardDescription>Percentage of completed items</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        stage: 'Planning',
                        rate: metrics.completionRate.planning,
                      },
                      {
                        stage: 'Survey',
                        rate: metrics.completionRate.survey,
                      },
                      {
                        stage: 'Deeds',
                        rate: metrics.completionRate.deeds,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#1E90FF" name="Completion %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

