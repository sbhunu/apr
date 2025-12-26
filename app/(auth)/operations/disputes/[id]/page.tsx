/**
 * Dispute Detail Page
 * Interface for reviewing and resolving disputes
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertTriangle, Loader2, Calendar, Scale } from 'lucide-react'

interface DisputeDetails {
  id: string
  disputeType: string
  titleId?: string
  schemeId?: string
  amendmentId?: string
  complainantName: string
  complainantIdNumber?: string
  complainantContactEmail?: string
  complainantContactPhone?: string
  complainantAddress?: string
  respondentName?: string
  respondentIdNumber?: string
  respondentContactEmail?: string
  respondentContactPhone?: string
  description: string
  requestedResolution?: string
  status: string
  assignedTo?: string
  assignedAuthority?: string
  hearingDate?: string
  hearingLocation?: string
  resolvedAt?: string
  resolution?: string
  resolutionType?: string
}

export default function DisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const disputeId = params.id as string

  const [dispute, setDispute] = useState<DisputeDetails | null>(null)
  const [assignedTo, setAssignedTo] = useState('')
  const [assignedAuthority, setAssignedAuthority] = useState<
    'scheme_body' | 'district_admin' | 'provincial_admin' | 'land_commission' | 'ministry' | 'courts'
  >('scheme_body')
  const [hearingDate, setHearingDate] = useState('')
  const [hearingLocation, setHearingLocation] = useState('')
  const [resolution, setResolution] = useState('')
  const [resolutionType, setResolutionType] = useState<'upheld' | 'dismissed' | 'compromise' | 'referred'>('upheld')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadDisputeDetails()
  }, [disputeId])

  async function loadDisputeDetails() {
    try {
      const response = await fetch(`/api/operations/disputes/${disputeId}`)
      const data = await response.json()

      if (data.success) {
        const d = data.dispute as any
        setDispute({
          id: d.id,
          disputeType: d.dispute_type,
          titleId: d.title_id,
          schemeId: d.scheme_id,
          amendmentId: d.amendment_id,
          complainantName: d.complainant_name,
          complainantIdNumber: d.complainant_id_number,
          complainantContactEmail: d.complainant_contact_email,
          complainantContactPhone: d.complainant_contact_phone,
          complainantAddress: d.complainant_address,
          respondentName: d.respondent_name,
          respondentIdNumber: d.respondent_id_number,
          respondentContactEmail: d.respondent_contact_email,
          respondentContactPhone: d.respondent_contact_phone,
          description: d.description,
          requestedResolution: d.requested_resolution,
          status: d.status,
          assignedTo: d.assigned_to,
          assignedAuthority: d.assigned_authority,
          hearingDate: d.hearing_date,
          hearingLocation: d.hearing_location,
          resolvedAt: d.resolved_at,
          resolution: d.resolution,
          resolutionType: d.resolution_type,
        })
      } else {
        setError(data.error || 'Failed to load dispute details')
      }
    } catch (err) {
      setError('Failed to load dispute details')
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign() {
    if (!assignedTo || !assignedAuthority) {
      setError('Please provide assigned user and authority')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/disputes/${disputeId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo,
          assignedAuthority,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Dispute assigned successfully')
        setTimeout(() => {
          loadDisputeDetails()
        }, 1000)
      } else {
        setError(data.error || 'Failed to assign dispute')
      }
    } catch (err) {
      setError('Failed to assign dispute')
    } finally {
      setProcessing(false)
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
      const response = await fetch(`/api/operations/disputes/${disputeId}/schedule-hearing`, {
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
          loadDisputeDetails()
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
      const response = await fetch(`/api/operations/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution,
          resolutionType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Dispute resolved successfully')
        setTimeout(() => {
          router.push('/operations/disputes')
        }, 2000)
      } else {
        setError(data.error || 'Failed to resolve dispute')
      }
    } catch (err) {
      setError('Failed to resolve dispute')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading dispute details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !dispute) {
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

  if (!dispute) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dispute Details</h1>
          <p className="text-muted-foreground mt-2">Dispute ID: {disputeId.substring(0, 8)}...</p>
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

      {/* Dispute Information */}
      <Card>
        <CardHeader>
          <CardTitle>Dispute Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dispute Type</Label>
              <Badge variant="secondary">{dispute.disputeType}</Badge>
            </div>
            <div>
              <Label>Status</Label>
              <Badge
                variant={
                  dispute.status === 'resolved'
                    ? 'default'
                    : dispute.status === 'dismissed'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {dispute.status}
              </Badge>
            </div>
            {dispute.titleId && (
              <div>
                <Label>Title ID</Label>
                <p className="font-medium">{dispute.titleId.substring(0, 8)}...</p>
              </div>
            )}
            {dispute.schemeId && (
              <div>
                <Label>Scheme ID</Label>
                <p className="font-medium">{dispute.schemeId.substring(0, 8)}...</p>
              </div>
            )}
            {dispute.amendmentId && (
              <div>
                <Label>Amendment ID</Label>
                <p className="font-medium">{dispute.amendmentId.substring(0, 8)}...</p>
              </div>
            )}
            {dispute.assignedAuthority && (
              <div>
                <Label>Assigned Authority</Label>
                <Badge variant="outline">{dispute.assignedAuthority}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complainant Information */}
      <Card>
        <CardHeader>
          <CardTitle>Complainant Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Complainant Name</Label>
              <p className="font-medium">{dispute.complainantName}</p>
            </div>
            {dispute.complainantIdNumber && (
              <div>
                <Label>ID Number</Label>
                <p className="font-medium">{dispute.complainantIdNumber}</p>
              </div>
            )}
            {dispute.complainantContactEmail && (
              <div>
                <Label>Contact Email</Label>
                <p className="font-medium">{dispute.complainantContactEmail}</p>
              </div>
            )}
            {dispute.complainantContactPhone && (
              <div>
                <Label>Contact Phone</Label>
                <p className="font-medium">{dispute.complainantContactPhone}</p>
              </div>
            )}
            {dispute.complainantAddress && (
              <div className="col-span-2">
                <Label>Address</Label>
                <p className="font-medium">{dispute.complainantAddress}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Respondent Information */}
      {dispute.respondentName && (
        <Card>
          <CardHeader>
            <CardTitle>Respondent Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Respondent Name</Label>
                <p className="font-medium">{dispute.respondentName}</p>
              </div>
              {dispute.respondentIdNumber && (
                <div>
                  <Label>ID Number</Label>
                  <p className="font-medium">{dispute.respondentIdNumber}</p>
                </div>
              )}
              {dispute.respondentContactEmail && (
                <div>
                  <Label>Contact Email</Label>
                  <p className="font-medium">{dispute.respondentContactEmail}</p>
                </div>
              )}
              {dispute.respondentContactPhone && (
                <div>
                  <Label>Contact Phone</Label>
                  <p className="font-medium">{dispute.respondentContactPhone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute Description */}
      <Card>
        <CardHeader>
          <CardTitle>Dispute Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{dispute.description}</p>
          {dispute.requestedResolution && (
            <div className="mt-4 pt-4 border-t">
              <Label>Requested Resolution</Label>
              <p className="whitespace-pre-wrap mt-2">{dispute.requestedResolution}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hearing Information */}
      {dispute.hearingDate && (
        <Card>
          <CardHeader>
            <CardTitle>Hearing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hearing Date</Label>
                <p className="font-medium">
                  {new Date(dispute.hearingDate).toLocaleDateString()}
                </p>
              </div>
              {dispute.hearingLocation && (
                <div>
                  <Label>Hearing Location</Label>
                  <p className="font-medium">{dispute.hearingLocation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution Information */}
      {dispute.resolution && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dispute.resolutionType && (
                <div>
                  <Label>Resolution Type</Label>
                  <Badge variant="default">{dispute.resolutionType}</Badge>
                </div>
              )}
              <p className="whitespace-pre-wrap">{dispute.resolution}</p>
              {dispute.resolvedAt && (
                <p className="text-sm text-muted-foreground mt-2">
                  Resolved on {new Date(dispute.resolvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Dispute */}
      {dispute.status === 'submitted' && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Dispute</CardTitle>
            <CardDescription>Assign this dispute to an authority for review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="assignedTo">Assigned To (User ID) *</Label>
              <Input
                id="assignedTo"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Enter user ID"
                required
              />
            </div>
            <div>
              <Label htmlFor="assignedAuthority">Assigned Authority *</Label>
              <Select
                value={assignedAuthority}
                onValueChange={(val) =>
                  setAssignedAuthority(
                    val as 'scheme_body' | 'district_admin' | 'provincial_admin' | 'land_commission' | 'ministry' | 'courts'
                  )
                }
              >
                <SelectTrigger id="assignedAuthority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheme_body">Scheme Body</SelectItem>
                  <SelectItem value="district_admin">District Administration</SelectItem>
                  <SelectItem value="provincial_admin">Provincial Administration</SelectItem>
                  <SelectItem value="land_commission">Land Commission</SelectItem>
                  <SelectItem value="ministry">Ministry</SelectItem>
                  <SelectItem value="courts">Courts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssign} disabled={processing || !assignedTo || !assignedAuthority}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Assign Dispute
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Schedule Hearing */}
      {(dispute.status === 'assigned' || dispute.status === 'under_review') && !dispute.hearingDate && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Hearing</CardTitle>
            <CardDescription>Schedule a hearing for this dispute</CardDescription>
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

      {/* Resolve Dispute */}
      {(dispute.status === 'hearing_scheduled' || dispute.status === 'under_review') && (
        <Card>
          <CardHeader>
            <CardTitle>Resolve Dispute</CardTitle>
            <CardDescription>Provide resolution for this dispute</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="resolutionType">Resolution Type *</Label>
              <Select
                value={resolutionType}
                onValueChange={(val) =>
                  setResolutionType(val as 'upheld' | 'dismissed' | 'compromise' | 'referred')
                }
              >
                <SelectTrigger id="resolutionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upheld">Upheld</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="compromise">Compromise</SelectItem>
                  <SelectItem value="referred">Referred</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  Resolve Dispute
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

