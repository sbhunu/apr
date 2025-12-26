'use client'

/**
 * Test page for spatial geometry utilities
 * Demonstrates coordinate parsing, validation, and transformations
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  parseDecimalCoordinates,
  parseUTMCoordinates,
  transformProjection,
  parseCoordinatesFromCSV,
  parseWKTGeometry,
  validateGeometryBasic,
  createPointFromCoordinates,
  createPolygonFromCoordinates,
  isPoint,
  isPolygon,
} from '@/lib/spatial/geometry'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function TestSpatialPage() {
  const [lat, setLat] = useState('-17.8252')
  const [lon, setLon] = useState('31.0335')
  const [easting, setEasting] = useState('300000')
  const [northing, setNorthing] = useState('8000000')
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const testDecimalParsing = () => {
    try {
      setError('')
      const [parsedLat, parsedLon] = parseDecimalCoordinates(lat, lon)
      setResult(`Parsed: ${parsedLat}, ${parsedLon}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testUTMParsing = () => {
    try {
      setError('')
      const [parsedEasting, parsedNorthing] = parseUTMCoordinates(easting, northing)
      setResult(`Parsed UTM: ${parsedEasting}, ${parsedNorthing}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testTransformation = () => {
    try {
      setError('')
      const latNum = parseFloat(lat)
      const lonNum = parseFloat(lon)
      const [utmX, utmY] = transformProjection(lonNum, latNum, 4326, 32735)
      setResult(`WGS84 (${lonNum}, ${latNum}) → UTM: (${utmX.toFixed(4)}, ${utmY.toFixed(4)})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testCSVParsing = () => {
    try {
      setError('')
      const csv = `-17.8252,31.0335
-17.8260,31.0340
-17.8270,31.0350`
      const coords = parseCoordinatesFromCSV(csv)
      setResult(`Parsed ${coords.length} coordinates from CSV`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testWKT = () => {
    try {
      setError('')
      const wkt = 'POINT(31.0335 -17.8252)'
      const geometry = parseWKTGeometry(wkt)
      setResult(`Parsed WKT: ${geometry.type} - Valid: ${validateGeometryBasic(geometry)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testCreatePoint = () => {
    try {
      setError('')
      const point = createPointFromCoordinates(300000, 8000000, 32735)
      setResult(
        `Created Point: ${point.type} at (${point.coordinates[0]}, ${point.coordinates[1]}) SRID: ${point.crs?.properties.name}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testCreatePolygon = () => {
    try {
      setError('')
      const polygon = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [301000, 8000000],
          [301000, 8001000],
          [300000, 8001000],
        ],
        32735
      )
      setResult(
        `Created Polygon: ${polygon.type} with ${polygon.coordinates[0].length} points`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Spatial Geometry Utilities Test</h1>
        <p className="text-muted-foreground">
          Test coordinate parsing, validation, and transformations
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Result</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Decimal Coordinates</CardTitle>
          <CardDescription>Parse WGS84 decimal degree coordinates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-17.8252"
              />
            </div>
            <div>
              <Label htmlFor="lon">Longitude</Label>
              <Input
                id="lon"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="31.0335"
              />
            </div>
          </div>
          <Button onClick={testDecimalParsing}>Parse Decimal Coordinates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UTM Coordinates</CardTitle>
          <CardDescription>Parse UTM Zone 35S coordinates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="easting">Easting</Label>
              <Input
                id="easting"
                value={easting}
                onChange={(e) => setEasting(e.target.value)}
                placeholder="300000"
              />
            </div>
            <div>
              <Label htmlFor="northing">Northing</Label>
              <Input
                id="northing"
                value={northing}
                onChange={(e) => setNorthing(e.target.value)}
                placeholder="8000000"
              />
            </div>
          </div>
          <Button onClick={testUTMParsing}>Parse UTM Coordinates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coordinate Transformation</CardTitle>
          <CardDescription>Transform WGS84 to UTM Zone 35S</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testTransformation}>Transform Coordinates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV Parsing</CardTitle>
          <CardDescription>Parse coordinates from CSV format</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testCSVParsing}>Parse CSV Coordinates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WKT Parsing</CardTitle>
          <CardDescription>Parse Well-Known Text geometry</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testWKT}>Parse WKT</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geometry Creation</CardTitle>
          <CardDescription>Create Point and Polygon geometries</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={testCreatePoint} variant="secondary">
            Create Point
          </Button>
          <Button onClick={testCreatePolygon} variant="secondary">
            Create Polygon
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

