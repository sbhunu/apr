/**
 * Objection Detail Page
 * Interface for reviewing and resolving objections
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, AlertTriangle, Loader2, Calendar } from 'lucide-react'

interface ObjectionDetails {
  id: string
  planningPlanId: string
  objectorName: string
  objectorIdNumber?: string
  objectorContactEmail?: string
  objectorContactPhone?: string
  objectorAddress?: string
  objectionType: string
  description: string
  status: string
  submittedAt: string
  hearingDate?: string
  hearingLocation?: string
  resolvedAt?: string
  resolution?: string
}

export default function ObjectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const objectionId = params.id as string

  const [objection, setObjection] = useState<ObjectionDetails | null>(null)
  const [hearingDate, setHearingDate] = useState('')
  const [hearingLocation, setHearingLocation] = useState('')
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadObjectionDetails()
  }, [objectionId])

  async function loadObjectionDetails() {
    try {
      const response = await fetch(`/api/operations/objections/${objectionId}`)
      const data = await response.json()

      if (data.success) {
        const o = data.objection as any
        setObjection({
          id: o.id,
          planningPlanId: o.planning_plan_id,
          objectorName: o.objector_name,
          objectorIdNumber: o.objector_id_number,
          objectorContactEmail: o.objector_contact_email,
          objectorContactPhone: o.objector_contact_phone,
          objectorAddress: o.objector_address,
          objectionType: o.objection_type,
          description: o.description,
          status: o.status,
          submittedAt: o.created_at,
          hearingDate: o.hearing_date,
          hearingLocation: o.hearing_location,
          resolvedAt: o.resolved_at,
          resolution: o.resolution,
        })
      } else {
        setError(data.error || 'Failed to load objection details')
      }
    } catch (err) {
      setError('Failed to load objection details')
    } finally {
      setLoading(false)
    }
  }

  async function handleScheduleHearing() {
    if (!hearingDate || !hearingLocation) {
      setError('Please provide hearing date and location')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/objections/${objectionId}/schedule-hearing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hearingDate,
          hearingLocation,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Hearing scheduled successfully')
        setTimeout(() => {
          loadObjectionDetails()
        }, 1000)
      } else {
        setError(data.error || 'Failed to schedule hearing')
      }
    } catch (err) {
      setError('Failed to schedule hearing')
    } finally {
      setProcessing(false)
    }
  }

  async function handleResolve() {
    if (!resolution.trim()) {
      setError('Please provide a resolution')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/objections/${objectionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Objection resolved successfully')
        setTimeout(() => {
          router.push('/operations/objections')
        }, 2000)
      } else {
        setError(data.error || 'Failed to resolve objection')
      }
    } catch (err) {
      setError('Failed to resolve objection')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading objection details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !objection) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!objection) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Objection Details</h1>
          <p className="text-muted-foreground mt-2">Objection ID: {objectionId.substring(0, 8)}...</p>
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

      {/* Objection Information */}
      <Card>
        <CardHeader>
          <CardTitle>Objection Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Planning Plan ID</Label>
              <p className="font-medium">{objection.planningPlanId.substring(0, 8)}...</p>
            </div>
            <div>
              <Label>Status</Label>
              <Badge
                variant={
                  objection.status === 'resolved'
                    ? 'default'
                    : objection.status === 'dismissed'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {objection.status}
              </Badge>
            </div>
            <div>
              <Label>Objection Type</Label>
              <Badge variant="secondary">{objection.objectionType}</Badge>
            </div>
            <div>
              <Label>Submitted</Label>
              <p className="font-medium">
                {new Date(objection.submittedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objector Information */}
      <Card>
        <CardHeader>
          <CardTitle>Objector Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Objector Name</Label>
              <p className="font-medium">{objection.objectorName}</p>
            </div>
            {objection.objectorIdNumber && (
              <div>
                <Label>ID Number</Label>
                <p className="font-medium">{objection.objectorIdNumber}</p>
              </div>
            )}
            {objection.objectorContactEmail && (
              <div>
                <Label>Contact Email</Label>
                <p className="font-medium">{objection.objectorContactEmail}</p>
              </div>
            )}
            {objection.objectorContactPhone && (
              <div>
                <Label>Contact Phone</Label>
                <p className="font-medium">{objection.objectorContactPhone}</p>
              </div>
            )}
            {objection.objectorAddress && (
              <div className="col-span-2">
                <Label>Address</Label>
                <p className="font-medium">{objection.objectorAddress}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Objection Description */}
      <Card>
        <CardHeader>
          <CardTitle>Objection Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{objection.description}</p>
        </CardContent>
      </Card>

      {/* Hearing Information */}
      {objection.hearingDate && (
        <Card>
          <CardHeader>
            <CardTitle>Hearing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hearing Date</Label>
                <p className="font-medium">
                  {new Date(objection.hearingDate).toLocaleDateString()}
                </p>
              </div>
              {objection.hearingLocation && (
                <div>
                  <Label>Hearing Location</Label>
                  <p className="font-medium">{objection.hearingLocation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Information */}
      {objection.resolution && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{objection.resolution}</p>
            {objection.resolvedAt && (
              <p className="text-sm text-muted-foreground mt-2">
                Resolved on {new Date(objection.resolvedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Hearing */}
      {objection.status === 'submitted' && !objection.hearingDate && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Hearing</CardTitle>
            <CardDescription>Schedule a hearing for this objection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hearingDate">Hearing Date *</Label>
                <Input
                  id="hearingDate"
                  type="datetime-local"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="hearingLocation">Hearing Location *</Label>
                <Input
                  id="hearingLocation"
                  value={hearingLocation}
                  onChange={(e) => setHearingLocation(e.target.value)}
                  placeholder="Enter hearing location"
                  required
                />
              </div>
            </div>
            <Button onClick={handleScheduleHearing} disabled={processing || !hearingDate || !hearingLocation}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Hearing
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resolve Objection */}
      {(objection.status === 'scheduled' || objection.status === 'under_review') && (
        <Card>
          <CardHeader>
            <CardTitle>Resolve Objection</CardTitle>
            <CardDescription>Provide resolution for this objection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="resolution">Resolution *</Label>
              <Textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Enter resolution details..."
                rows={6}
                required
              />
            </div>
            <Button onClick={handleResolve} disabled={processing || !resolution.trim()}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resolve Objection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

