'use client'

/**
 * Test page for spatial topology validation
 * Demonstrates overlap detection, containment validation, and gap checking
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  detectOverlaps,
  validateContainment,
  checkGaps,
  validateTopology,
  type TopologyValidationReport,
} from '@/lib/spatial/validation'
import { createClient } from '@/lib/supabase/client'
import { createPolygonFromCoordinates } from '@/lib/spatial/geometry'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function TestTopologyPage() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const testOverlapDetection = async () => {
    try {
      setError('')
      setLoading(true)
      setResult('')

      // Create overlapping polygons
      const polygon1 = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [301000, 8000000],
          [301000, 8001000],
          [300000, 8001000],
        ],
        32735
      )

      const polygon2 = createPolygonFromCoordinates(
        [
          [300500, 8000500],
          [301500, 8000500],
          [301500, 8001500],
          [300500, 8001500],
        ],
        32735
      )

      const overlaps = await detectOverlaps([polygon1, polygon2], supabase)

      if (overlaps.length > 0) {
        setResult(
          `Overlap Detection:\n` +
            `  Found ${overlaps.length} overlap(s)\n` +
            overlaps
              .map(
                (o, i) =>
                  `  ${i + 1}. ${o.description}${o.area ? ` (${o.area.toFixed(2)} m²)` : ''}`
              )
              .join('\n')
        )
      } else {
        setResult('Overlap Detection: No overlaps found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  const testContainment = async () => {
    try {
      setError('')
      setLoading(true)
      setResult('')

      // Create parent parcel
      const parent = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [302000, 8000000],
          [302000, 8002000],
          [300000, 8002000],
        ],
        32735
      )

      // Create section inside parent
      const section1 = createPolygonFromCoordinates(
        [
          [300500, 8000500],
          [301000, 8000500],
          [301000, 8001000],
          [300500, 8001000],
        ],
        32735
      )

      // Create section outside parent
      const section2 = createPolygonFromCoordinates(
        [
          [302500, 8000500],
          [303000, 8000500],
          [303000, 8001000],
          [302500, 8001000],
        ],
        32735
      )

      const errors = await validateContainment([section1, section2], parent, supabase)

      setResult(
        `Containment Validation:\n` +
          `  Found ${errors.length} error(s)\n` +
          errors.map((e, i) => `  ${i + 1}. ${e.description}`).join('\n')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  const testGapDetection = async () => {
    try {
      setError('')
      setLoading(true)
      setResult('')

      // Create parent parcel
      const parent = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [302000, 8000000],
          [302000, 8002000],
          [300000, 8002000],
        ],
        32735
      )

      // Create sections that don't cover entire parent (leaving gaps)
      const section1 = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [301000, 8000000],
          [301000, 8001000],
          [300000, 8001000],
        ],
        32735
      )

      const section2 = createPolygonFromCoordinates(
        [
          [301500, 8001500],
          [302000, 8001500],
          [302000, 8002000],
          [301500, 8002000],
        ],
        32735
      )

      const gaps = await checkGaps([section1, section2], parent, supabase, 1.0)

      if (gaps.length > 0) {
        setResult(
          `Gap Detection:\n` +
            `  Found ${gaps.length} gap(s)\n` +
            gaps
              .map(
                (g, i) =>
                  `  ${i + 1}. ${g.description}${g.area ? ` (${g.area.toFixed(2)} m²)` : ''}`
              )
              .join('\n')
        )
      } else {
        setResult('Gap Detection: No gaps found (or gaps too small)')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  const testFullValidation = async () => {
    try {
      setError('')
      setLoading(true)
      setResult('')

      // Create parent parcel
      const parent = createPolygonFromCoordinates(
        [
          [300000, 8000000],
          [302000, 8000000],
          [302000, 8002000],
          [300000, 8002000],
        ],
        32735
      )

      // Create sections
      const sections = [
        createPolygonFromCoordinates(
          [
            [300000, 8000000],
            [301000, 8000000],
            [301000, 8001000],
            [300000, 8001000],
          ],
          32735
        ),
        createPolygonFromCoordinates(
          [
            [301000, 8001000],
            [302000, 8001000],
            [302000, 8002000],
            [301000, 8002000],
          ],
          32735
        ),
      ]

      const report: TopologyValidationReport = await validateTopology(
        sections,
        parent,
        supabase,
        {
          checkOverlaps: true,
          checkContainment: true,
          checkGaps: true,
          checkGeometry: true,
        }
      )

      setResult(
        `Topology Validation Report:\n` +
          `  Valid: ${report.isValid ? 'Yes' : 'No'}\n` +
          `  Errors: ${report.summary.totalErrors}\n` +
          `  Warnings: ${report.summary.totalWarnings}\n` +
          `  Geometries: ${report.summary.totalGeometries}\n` +
          `\nErrors:\n` +
          (report.errors.length > 0
            ? report.errors.map((e, i) => `  ${i + 1}. ${e.description}`).join('\n')
            : '  None') +
          `\n\nWarnings:\n` +
          (report.warnings.length > 0
            ? report.warnings.map((w, i) => `  ${i + 1}. ${w.description}`).join('\n')
            : '  None')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Spatial Topology Validation Test</h1>
        <p className="text-muted-foreground">
          Test topology validation for sectional schemes (overlaps, gaps, containment)
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
            <CardTitle>Overlap Detection</CardTitle>
            <CardDescription>Detect overlapping geometries</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testOverlapDetection} disabled={loading} className="w-full">
              {loading ? 'Testing...' : 'Test Overlap Detection'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Containment Validation</CardTitle>
            <CardDescription>Ensure sections are within parent parcel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testContainment} disabled={loading} className="w-full">
              {loading ? 'Testing...' : 'Test Containment'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gap Detection</CardTitle>
            <CardDescription>Find missing areas between sections</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testGapDetection} disabled={loading} className="w-full">
              {loading ? 'Testing...' : 'Test Gap Detection'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Full Topology Validation</CardTitle>
            <CardDescription>Comprehensive validation report</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testFullValidation} disabled={loading} className="w-full">
              {loading ? 'Validating...' : 'Run Full Validation'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Topology Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Overlap Detection:</strong> Uses PostGIS ST_Overlaps to detect overlapping
            geometries in sectional schemes.
          </p>
          <p>
            <strong>Containment Validation:</strong> Ensures all sections are fully contained
            within the parent parcel using ST_Contains.
          </p>
          <p>
            <strong>Gap Detection:</strong> Finds missing areas between sections using ST_Difference
            to identify gaps.
          </p>
          <p>
            <strong>Full Validation:</strong> Comprehensive topology validation including geometry
            validity, overlaps, containment, and gaps.
          </p>
          <p className="pt-2 text-xs">
            <strong>Note:</strong> These functions require PostGIS RPC functions to be created in
            the database. Run migration 007_create_topology_validation_functions.sql first.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

