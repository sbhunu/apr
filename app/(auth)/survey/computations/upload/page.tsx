/**
 * Parent Parcel Geometry Upload Page
 * Allows surveyors to upload coordinate files and validate geometry
 */

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CoordinatePreviewTable } from '@/components/survey/coordinate-preview-table'
import { GeometryMapPreview } from '@/components/survey/geometry-map-preview'
import {
  ParsedCoordinate,
  CoordinateParseResult,
  validateCoordinateFile,
  parseCSVCoordinates,
  transformCoordinatesToUTM,
} from '@/lib/survey/coordinate-parser'
import { Upload, FileText, Map, AlertCircle, CheckCircle2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import map component to avoid SSR issues
const GeometryMapPreviewDynamic = dynamic(
  () => import('@/components/survey/geometry-map-preview').then((mod) => ({ default: mod.GeometryMapPreview })),
  { ssr: false }
)

export default function ParentParcelUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [coordinateFormat, setCoordinateFormat] = useState<'decimal' | 'utm' | 'dms'>('decimal')
  const [sourceSRID, setSourceSRID] = useState<string>('4326')
  const [parsedResult, setParsedResult] = useState<CoordinateParseResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Validate file
    const validation = validateCoordinateFile(selectedFile)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file format')
      setFile(null)
      setParsedResult(null)
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(null)
    setParsedResult(null)
  }, [])

  const handleParse = useCallback(async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const fileContent = await file.text()
      
      // Parse CSV
      const parseResult = parseCSVCoordinates(fileContent, {
        coordinateFormat,
        hasHeader: true,
      })

      // Transform to UTM if needed
      if (parseResult.success && sourceSRID !== '32735') {
        const transformed = await transformCoordinatesToUTM(
          parseResult.coordinates,
          parseInt(sourceSRID)
        )
        parseResult.coordinates = transformed
        parseResult.projection = 'UTM Zone 35S'
        parseResult.datum = 'WGS84'
      }

      setParsedResult(parseResult)

      if (!parseResult.success) {
        setError(parseResult.errors?.join('\n') || 'Parsing failed')
      } else if (parseResult.warnings && parseResult.warnings.length > 0) {
        setError(parseResult.warnings.join('\n'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setParsedResult(null)
    } finally {
      setIsUploading(false)
    }
  }, [file, coordinateFormat, sourceSRID])

  const handleUpload = useCallback(async () => {
    if (!parsedResult || !parsedResult.success || !parsedResult.coordinates.length) {
      setError('Please parse coordinates first')
      return
    }

    // Get survey plan ID from URL or context
    // For now, we'll need to get it from a form field or route param
    const surveyPlanId = prompt('Enter Survey Plan ID:')
    if (!surveyPlanId) {
      setError('Survey Plan ID is required')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/survey/parent-parcel/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyPlanId,
          coordinates: parsedResult.coordinates.map((c) => ({
            x: c.x,
            y: c.y,
            z: c.z,
          })),
          datum: parsedResult.datum || 'WGS84',
          projection: parsedResult.projection || 'UTM Zone 35S',
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      setSuccess('Parent parcel geometry uploaded successfully')
      
      // Redirect to survey plan page after 2 seconds
      setTimeout(() => {
        router.push(`/survey/plans/${surveyPlanId}`)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload geometry')
    } finally {
      setIsUploading(false)
    }
  }, [parsedResult, router])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Parent Parcel Geometry</h1>
        <p className="text-muted-foreground mt-2">
          Upload coordinate files to create parent parcel boundary geometry
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File Upload
            </CardTitle>
            <CardDescription>
              Upload coordinate file (CSV format supported)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Coordinate File</Label>
              <Input
                id="file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Coordinate Format</Label>
              <Select
                value={coordinateFormat}
                onValueChange={(value) => setCoordinateFormat(value as 'decimal' | 'utm' | 'dms')}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="decimal">Decimal Degrees (Lat/Lon)</SelectItem>
                  <SelectItem value="utm">UTM Coordinates</SelectItem>
                  <SelectItem value="dms">Degrees Minutes Seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="srid">Source Coordinate System (SRID)</Label>
              <Select
                value={sourceSRID}
                onValueChange={setSourceSRID}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4326">WGS84 (4326)</SelectItem>
                  <SelectItem value="32735">UTM Zone 35S (32735)</SelectItem>
                  <SelectItem value="32736">UTM Zone 36S (32736)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleParse}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading ? 'Parsing...' : 'Parse Coordinates'}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              Review parsed coordinates and geometry
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsedResult && parsedResult.success ? (
              <div className="space-y-4">
                <GeometryMapPreviewDynamic coordinates={parsedResult.coordinates} />
                <CoordinatePreviewTable
                  coordinates={parsedResult.coordinates}
                  showClosure={true}
                  closureError={parsedResult.closureResult?.closureError}
                  closureErrorRatio={parsedResult.closureResult?.closureErrorRatio}
                  isWithinTolerance={parsedResult.closureResult?.isWithinTolerance}
                />
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !parsedResult.closureResult?.isWithinTolerance}
                  className="w-full"
                >
                  {isUploading ? 'Uploading...' : 'Upload Geometry'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Parse coordinates to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

