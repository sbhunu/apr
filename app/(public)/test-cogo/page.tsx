'use client'

/**
 * Test page for COGO (Coordinate Geometry) computations
 * Demonstrates surveying calculations, traverse closure, and area computation
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  computeClosure,
  computeArea,
  bearingDistance,
  calculateCoordinates,
  assessAccuracy,
  transformToUTM,
  calculateInteriorAngles,
  validateTraverseAngles,
  type COGOPoint,
} from '@/lib/spatial/cogo'
import { CheckCircle2, XCircle, Calculator } from 'lucide-react'

export default function TestCOGOPage() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const testTraverseClosure = () => {
    try {
      setError('')
      // Create a simple closed traverse (square)
      const traverse: COGOPoint[] = [
        { x: 300000, y: 8000000 },
        { x: 301000, y: 8000000 },
        { x: 301000, y: 8001000 },
        { x: 300000, y: 8001000 },
        { x: 300000, y: 8000000 }, // Closed
      ]

      const closure = computeClosure(traverse)
      const accuracy = assessAccuracy(closure)

      setResult(
        `Traverse Closure:\n` +
          `  Closure Error: ${closure.closureError.toFixed(4)}m\n` +
          `  Closure Ratio: 1:${Math.round(1 / closure.closureErrorRatio)}\n` +
          `  Within Tolerance: ${closure.isWithinTolerance ? 'Yes' : 'No'}\n` +
          `  ${accuracy.message}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testAreaComputation = () => {
    try {
      setError('')
      // Create a polygon
      const polygon: COGOPoint[] = [
        { x: 300000, y: 8000000 },
        { x: 301000, y: 8000000 },
        { x: 301000, y: 8001000 },
        { x: 300000, y: 8001000 },
      ]

      const areaResult = computeArea(polygon, 'square_meters')
      const areaHectares = computeArea(polygon, 'hectares')

      setResult(
        `Area Computation:\n` +
          `  Area: ${areaResult.area.toFixed(2)} m²\n` +
          `  Area: ${areaHectares.area.toFixed(4)} hectares\n` +
          `  Perimeter: ${areaResult.perimeter.toFixed(2)}m`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testBearingDistance = () => {
    try {
      setError('')
      const from: COGOPoint = { x: 300000, y: 8000000 }
      const to: COGOPoint = { x: 301000, y: 8001000 }

      const bd = bearingDistance(from, to)

      setResult(
        `Bearing and Distance:\n` +
          `  From: (${from.x}, ${from.y})\n` +
          `  To: (${to.x}, ${to.y})\n` +
          `  Bearing: ${bd.bearing.toFixed(4)}°\n` +
          `  Distance: ${bd.distance.toFixed(2)}m`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testCoordinateCalculation = () => {
    try {
      setError('')
      const from: COGOPoint = { x: 300000, y: 8000000 }
      const bearing = 45 // degrees
      const distance = 1000 // meters

      const calculated = calculateCoordinates(from, bearing, distance)

      setResult(
        `Coordinate Calculation:\n` +
          `  From: (${from.x}, ${from.y})\n` +
          `  Bearing: ${bearing}°\n` +
          `  Distance: ${distance}m\n` +
          `  Calculated: (${calculated.x.toFixed(2)}, ${calculated.y.toFixed(2)})`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testUTMTransformation = () => {
    try {
      setError('')
      // Harare coordinates in WGS84
      const wgs84Point: COGOPoint = { x: 31.0335, y: -17.8252 }
      const utmPoint = transformToUTM(wgs84Point, 4326, 32735)

      setResult(
        `UTM Transformation:\n` +
          `  WGS84: (${wgs84Point.x}, ${wgs84Point.y})\n` +
          `  UTM 35S: (${utmPoint.x.toFixed(2)}, ${utmPoint.y.toFixed(2)})`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  const testInteriorAngles = () => {
    try {
      setError('')
      const polygon: COGOPoint[] = [
        { x: 300000, y: 8000000 },
        { x: 301000, y: 8000000 },
        { x: 301000, y: 8001000 },
        { x: 300000, y: 8001000 },
      ]

      const angles = calculateInteriorAngles(polygon)
      const validation = validateTraverseAngles(polygon)

      setResult(
        `Interior Angles:\n` +
          `  Angles: ${angles.map((a) => a.toFixed(2)).join('°, ')}°\n` +
          `  Sum: ${validation.actualSum.toFixed(2)}°\n` +
          `  Expected: ${validation.expectedSum.toFixed(2)}°\n` +
          `  Difference: ${validation.difference.toFixed(4)}°\n` +
          `  Valid: ${validation.isValid ? 'Yes' : 'No'}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">COGO Computations Test</h1>
        <p className="text-muted-foreground">
          Test Coordinate Geometry (COGO) surveying computations
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
          <AlertDescription>
            <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Traverse Closure</CardTitle>
            <CardDescription>Calculate closure error for closed traverse</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testTraverseClosure} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Test Traverse Closure
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Area Computation</CardTitle>
            <CardDescription>Calculate area using shoelace formula</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testAreaComputation} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Test Area Computation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bearing & Distance</CardTitle>
            <CardDescription>Calculate bearing and distance between points</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testBearingDistance} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Test Bearing/Distance
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coordinate Calculation</CardTitle>
            <CardDescription>Calculate coordinates from bearing and distance</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCoordinateCalculation} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Test Coordinate Calc
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UTM Transformation</CardTitle>
            <CardDescription>Transform coordinates to UTM Zone 35S</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testUTMTransformation} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Test UTM Transform
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interior Angles</CardTitle>
            <CardDescription>Calculate and validate interior angles</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testInteriorAngles} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Test Interior Angles
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About COGO Computations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Traverse Closure:</strong> Calculates closure error for surveying traverses.
            Meets 1:10,000 accuracy standard.
          </p>
          <p>
            <strong>Area Computation:</strong> Uses shoelace formula (surveyor's formula) for
            accurate area calculation.
          </p>
          <p>
            <strong>Bearing & Distance:</strong> Calculates bearing (0° = North) and distance
            between two points.
          </p>
          <p>
            <strong>Coordinate Calculation:</strong> Computes coordinates from a starting point,
            bearing, and distance.
          </p>
          <p>
            <strong>UTM Transformation:</strong> Transforms coordinates between WGS84 and UTM Zone
            35S (Zimbabwe).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

