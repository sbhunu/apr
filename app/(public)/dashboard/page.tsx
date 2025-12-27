/**
 * Public Dashboard Page
 * Read-only statistics dashboard for public access
 */

'use client'

import { useEffect, useState } from 'react'
import ReportingLayout from '@/components/layouts/ReportingLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  TrendingUp,
  Building2,
  FileText,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

interface PublicStatistics {
  totalSchemes: number
  totalTitles: number
  totalTransfers: number
  totalAmendments: number
  totalMortgages: number
  totalLeases: number
  byProvince: Array<{
    province: string
    schemes: number
    titles: number
    transfers: number
  }>
  byMonth: Array<{
    month: string
    schemes: number
    titles: number
    transfers: number
  }>
  byStatus: {
    planning: {
      submitted: number
      approved: number
      rejected: number
    }
    survey: {
      draft: number
      sealed: number
      rejected: number
    }
    deeds: {
      draft: number
      registered: number
      rejected: number
    }
  }
}

const COLORS = ['#228B22', '#FFD700', '#1E90FF', '#FF6347', '#9370DB', '#20B2AA']

export default function PublicDashboardPage() {
  const [statistics, setStatistics] = useState<PublicStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [province, setProvince] = useState<string>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLastUpdated(new Date())
    loadStatistics()
    // Auto-refresh every 15 minutes
    const interval = setInterval(() => {
      loadStatistics()
      setLastUpdated(new Date())
    }, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadStatistics() {
    try {
      const params = new URLSearchParams()
      if (province !== 'all') params.append('province', province)

      const response = await fetch(`/api/public/statistics?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setStatistics(data.statistics)
      } else {
        setError(data.error || 'Failed to load statistics')
      }
    } catch (err) {
      setError('Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ReportingLayout
      currentPage="dashboard"
      heroTitle="Public Dashboard"
      heroDescription="Public-facing dashboard displaying national statistics and registration metrics. View aggregated data on schemes, titles, transfers, and more.">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Refresh Controls */}
        <div className="flex items-center justify-end gap-4">
          {mounted && lastUpdated && (
            <Badge variant="outline" className="text-xs">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
          <Button onClick={loadStatistics} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="province" className="text-sm font-medium mb-2 block">
                  Province
                </label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger id="province">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    <SelectItem value="HARARE">Harare</SelectItem>
                    <SelectItem value="BULAWAYO">Bulawayo</SelectItem>
                    <SelectItem value="MANICALAND">Manicaland</SelectItem>
                    <SelectItem value="MASHONALAND_EAST">Mashonaland East</SelectItem>
                    <SelectItem value="MASHONALAND_WEST">Mashonaland West</SelectItem>
                    <SelectItem value="MASHONALAND_CENTRAL">Mashonaland Central</SelectItem>
                    <SelectItem value="MASVINGO">Masvingo</SelectItem>
                    <SelectItem value="MATABELELAND_NORTH">Matabeleland North</SelectItem>
                    <SelectItem value="MATABELELAND_SOUTH">Matabeleland South</SelectItem>
                    <SelectItem value="MIDLANDS">Midlands</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadStatistics} disabled={loading}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        {statistics && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Schemes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(statistics.totalSchemes ?? 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Titles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(statistics.totalTitles ?? 0).toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Transfers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(statistics.totalTransfers ?? 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Amendments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(statistics.totalAmendments ?? 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Mortgages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(statistics.totalMortgages ?? 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Leases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(statistics.totalLeases ?? 0).toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                  <CardDescription>Registration activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={statistics.byMonth ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="schemes"
                        stroke="#228B22"
                        name="Schemes"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="titles"
                        stroke="#1E90FF"
                        name="Titles"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="transfers"
                        stroke="#FF6347"
                        name="Transfers"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Provincial Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Provincial Distribution</CardTitle>
                  <CardDescription>Schemes and titles by province</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statistics.byProvince ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="province" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="schemes" fill="#228B22" name="Schemes" />
                      <Bar dataKey="titles" fill="#1E90FF" name="Titles" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Planning Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Planning Status</CardTitle>
                  <CardDescription>Planning applications by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Submitted', value: statistics.byStatus?.planning?.submitted ?? 0 },
                          { name: 'Approved', value: statistics.byStatus?.planning?.approved ?? 0 },
                          { name: 'Rejected', value: statistics.byStatus?.planning?.rejected ?? 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(((percent ?? 0) * 100)).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Submitted', value: statistics.byStatus?.planning?.submitted ?? 0 },
                          { name: 'Approved', value: statistics.byStatus?.planning?.approved ?? 0 },
                          { name: 'Rejected', value: statistics.byStatus?.planning?.rejected ?? 0 },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Survey Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Survey Status</CardTitle>
                  <CardDescription>Survey plans by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Draft', value: statistics.byStatus?.survey?.draft ?? 0 },
                          { name: 'Sealed', value: statistics.byStatus?.survey?.sealed ?? 0 },
                          { name: 'Rejected', value: statistics.byStatus?.survey?.rejected ?? 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(((percent ?? 0) * 100)).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Draft', value: statistics.byStatus?.survey?.draft ?? 0 },
                          { name: 'Sealed', value: statistics.byStatus?.survey?.sealed ?? 0 },
                          { name: 'Rejected', value: statistics.byStatus?.survey?.rejected ?? 0 },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Loading State */}
        {loading && !statistics && (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading statistics...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ReportingLayout>
  )
}

