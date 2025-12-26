/**
 * Spatial Analytics Page
 * GIS-based spatial analysis and visualization
 */

'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
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
import { Map, AlertTriangle, Download } from 'lucide-react'

// Dynamically import map component to avoid SSR issues
const PlanningMap = dynamic(
  () => import('@/components/maps/PlanningMap').then((m) => m.PlanningMap),
  {
  ssr: false,
  loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />,
  }
)

interface SpatialAnalysis {
  totalArea: number
  schemeCount: number
  averageSchemeArea: number
  density: number
  distribution: Array<{
    province: string
    schemeCount: number
    totalArea: number
    averageArea: number
  }>
  heatmapData: Array<{
    lat: number
    lng: number
    weight: number
  }>
}

export default function SpatialAnalyticsPage() {
  const [analysis, setAnalysis] = useState<SpatialAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [province, setProvince] = useState<string>('all')

  useEffect(() => {
    loadSpatialAnalysis()
  }, [])

  async function loadSpatialAnalysis() {
    try {
      const params = new URLSearchParams()
      if (province !== 'all') params.append('province', province)

      const response = await fetch(`/api/analytics/spatial?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setAnalysis(data.analysis)
      } else {
        setError(data.error || 'Failed to load spatial analysis')
      }
    } catch (err) {
      setError('Failed to load spatial analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading spatial analysis...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Spatial Analytics</h1>
          <p className="text-muted-foreground mt-2">
            GIS-based spatial analysis and visualization
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="w-48">
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
          <Button onClick={loadSpatialAnalysis}>Refresh</Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analysis.totalArea / 1000000).toFixed(2)} km²
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Scheme Count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.schemeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Average Area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysis.averageSchemeArea.toFixed(2)} m²
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Density</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysis.density.toFixed(2)} schemes/km²
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Scheme Distribution Map</CardTitle>
          <CardDescription>Visual representation of scheme locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden">
            <PlanningMap />
          </div>
        </CardContent>
      </Card>

      {/* Provincial Distribution Chart */}
      {analysis && analysis.distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provincial Distribution</CardTitle>
            <CardDescription>Schemes and areas by province</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analysis.distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="province" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="schemeCount"
                  fill="#228B22"
                  name="Scheme Count"
                />
                <Bar
                  yAxisId="right"
                  dataKey="totalArea"
                  fill="#1E90FF"
                  name="Total Area (m²)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Distribution Table */}
      {analysis && analysis.distribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Provincial Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.distribution.map((prov, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <Badge variant="outline">{prov.province}</Badge>
                    <span className="ml-4 text-sm text-muted-foreground">
                      {prov.schemeCount} schemes
                    </span>
                  </div>
                  <div className="text-sm">
                    {(prov.totalArea / 1000000).toFixed(2)} km²
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

