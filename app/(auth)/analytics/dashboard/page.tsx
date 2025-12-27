/**
 * Analytics Dashboard
 * Main dashboard for analytics and reporting
 */

'use client'

import { useEffect, useState } from 'react'
import ReportingLayout from '@/components/layouts/ReportingLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Download, AlertTriangle, TrendingUp, FileText, Map } from 'lucide-react'
import Link from 'next/link'

interface Statistics {
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

export default function AnalyticsDashboardPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [province, setProvince] = useState<string>('all')

  useEffect(() => {
    loadStatistics()
  }, [])

  async function loadStatistics() {
    try {
      const params = new URLSearchParams()
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      if (province !== 'all') params.append('province', province)

      const response = await fetch(`/api/analytics/statistics?${params.toString()}`)
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

  async function handleExport(format: 'pdf' | 'csv' | 'excel') {
    try {
      const params = new URLSearchParams()
      params.append('format', format)
      params.append('reportType', 'summary')
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      if (province !== 'all') params.append('province', province)

      const response = await fetch(`/api/analytics/reports/generate?${params.toString()}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `apr-report-${Date.now()}.${format === 'pdf' ? 'pdf' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to export report')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading analytics...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ReportingLayout
      currentPage="analytics"
      heroTitle="Analytics Dashboard"
      heroDescription="Comprehensive analytics and reporting for APR system. View performance metrics, trends, provincial breakdowns, and export detailed reports.">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
          <Button onClick={() => handleExport('pdf')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          </div>
        </div>

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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="province">Province</Label>
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
          </div>
          <Button onClick={loadStatistics} className="mt-4">
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Schemes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalSchemes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Titles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalTitles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Transfers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalTransfers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Amendments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalAmendments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Mortgages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalMortgages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Leases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalLeases}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {statistics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Schemes, Titles, and Transfers by Month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={statistics.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="schemes" stroke="#228B22" name="Schemes" />
                  <Line type="monotone" dataKey="titles" stroke="#1E90FF" name="Titles" />
                  <Line type="monotone" dataKey="transfers" stroke="#FF6347" name="Transfers" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Provincial Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Provincial Distribution</CardTitle>
              <CardDescription>Schemes by Province</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics.byProvince}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="province" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="schemes" fill="#228B22" name="Schemes" />
                  <Bar dataKey="titles" fill="#1E90FF" name="Titles" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Planning Status</CardTitle>
              <CardDescription>Planning Applications by Status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'Submitted',
                        value: statistics.byStatus.planning.submitted,
                      },
                      {
                        name: 'Approved',
                        value: statistics.byStatus.planning.approved,
                      },
                      {
                        name: 'Rejected',
                        value: statistics.byStatus.planning.rejected,
                      },
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
                      { name: 'Submitted', value: statistics.byStatus.planning.submitted },
                      { name: 'Approved', value: statistics.byStatus.planning.approved },
                      { name: 'Rejected', value: statistics.byStatus.planning.rejected },
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
              <CardDescription>Survey Plans by Status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Draft', value: statistics.byStatus.survey.draft },
                      { name: 'Sealed', value: statistics.byStatus.survey.sealed },
                      { name: 'Rejected', value: statistics.byStatus.survey.rejected },
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
                      { name: 'Draft', value: statistics.byStatus.survey.draft },
                      { name: 'Sealed', value: statistics.byStatus.survey.sealed },
                      { name: 'Rejected', value: statistics.byStatus.survey.rejected },
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
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/analytics/spatial">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Spatial Analytics
              </CardTitle>
              <CardDescription>GIS-based spatial analysis</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/analytics/reports">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Custom Reports
              </CardTitle>
              <CardDescription>Generate custom reports</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/analytics/performance">
          <Card className="cursor-pointer hover:bg-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>System performance analysis</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
      </div>
    </ReportingLayout>
  )
}

