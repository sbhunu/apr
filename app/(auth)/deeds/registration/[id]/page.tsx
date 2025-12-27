/**
 * Title Registration Detail Page
 * Interface for Registrar to register a specific approved title
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertTriangle, FileCheck, Loader2 } from 'lucide-react'

const PROVINCE_CODES = [
  'HARARE',
  'BULAWAYO',
  'MANICALAND',
  'MASHONALAND_CENTRAL',
  'MASHONALAND_EAST',
  'MASHONALAND_WEST',
  'MASVINGO',
  'MATABELELAND_NORTH',
  'MATABELELAND_SOUTH',
  'MIDLANDS',
] as const

export default function TitleRegistrationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const titleId = params.id as string

  const [provinceCode, setProvinceCode] = useState<string>('')
  const [registrarNotes, setRegistrarNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [titleInfo, setTitleInfo] = useState<{
    titleNumber: string
    sectionNumber: string
    holderName: string
    schemeNumber: string
  } | null>(null)

  useEffect(() => {
    loadTitleInfo()
  }, [titleId])

  async function loadTitleInfo() {
    try {
      const response = await fetch(`/api/deeds/titles/${titleId}`)
      const data = await response.json()

      if (data.success && data.title) {
        setTitleInfo({
          titleNumber: data.title.titleNumber || 'DRAFT',
          sectionNumber: data.title.sectionNumber || '',
          holderName: data.title.holderName || '',
          schemeNumber: data.title.schemeNumber || '',
        })
      }
    } catch (err) {
      // Ignore errors for now
    }
  }

  async function handleRegister() {
    if (!provinceCode) {
      setError('Please select a province')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/deeds/registration/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleId,
          provinceCode,
          registrarNotes: registrarNotes.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Title registered successfully: ${data.titleNumber}`)
        setTimeout(() => {
          router.push('/deeds/titles/register')
        }, 3000)
      } else {
        setError(data.error || 'Failed to register title')
      }
    } catch (err) {
      setError('Failed to register title')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Register Title</h1>
          <p className="text-muted-foreground mt-2">
            Title ID: {titleId.substring(0, 8)}...
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Title Information */}
      {titleInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Title Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title Number</Label>
                <p className="font-medium">{titleInfo.titleNumber}</p>
              </div>
              <div>
                <Label>Section</Label>
                <p className="font-medium">{titleInfo.sectionNumber}</p>
              </div>
              <div>
                <Label>Holder</Label>
                <p className="font-medium">{titleInfo.holderName}</p>
              </div>
              <div>
                <Label>Scheme</Label>
                <p className="font-medium">{titleInfo.schemeNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Details</CardTitle>
          <CardDescription>
            Provide registration information for this title
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="province">Province *</Label>
            <Select value={provinceCode} onValueChange={setProvinceCode}>
              <SelectTrigger id="province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCE_CODES.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Registrar Notes</Label>
            <Textarea
              id="notes"
              value={registrarNotes}
              onChange={(e) => setRegistrarNotes(e.target.value)}
              placeholder="Add any notes about this registration..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Registration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Registering this title will:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Allocate a unique title number (T/YYYY/PROVINCE/NNN)</li>
            <li>Create an immutable registration record</li>
            <li>Apply registrar digital signature</li>
            <li>Update status to &quot;registered&quot;</li>
            <li>Generate registration certificate (next step)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Registration Action</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleRegister}
            disabled={loading || !provinceCode}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Register Title
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

