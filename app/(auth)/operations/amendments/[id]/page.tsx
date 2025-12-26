/**
 * Amendment Review Page
 * Interface for reviewing and processing scheme amendments
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
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface AmendmentDetails {
  id: string
  schemeNumber: string
  amendmentType: string
  description: string
  reason: string
  affectedSectionIds: string[]
  newSectionCount: number
  status: string
  newSections: Array<{
    sectionNumber: string
    area: number
    sectionType?: string
  }>
  validationWarnings: string[]
}

export default function AmendmentReviewPage() {
  const params = useParams()
  const router = useRouter()
  const amendmentId = params.id as string

  const [amendment, setAmendment] = useState<AmendmentDetails | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadAmendmentDetails()
  }, [amendmentId])

  async function loadAmendmentDetails() {
    try {
      const response = await fetch(`/api/operations/amendments/${amendmentId}`)
      const data = await response.json()

      if (data.success) {
        setAmendment(data.amendment)
      } else {
        setError(data.error || 'Failed to load amendment details')
      }
    } catch (err) {
      setError('Failed to load amendment details')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!reviewNotes.trim()) {
      setError('Please provide review notes')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/amendments/${amendmentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Amendment approved')
        setTimeout(() => {
          router.push('/operations/amendments')
        }, 2000)
      } else {
        setError(data.error || 'Failed to approve amendment')
      }
    } catch (err) {
      setError('Failed to approve amendment')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!reviewNotes.trim()) {
      setError('Please provide a rejection reason')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/amendments/${amendmentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reviewNotes }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Amendment rejected')
        setTimeout(() => {
          router.push('/operations/amendments')
        }, 2000)
      } else {
        setError(data.error || 'Failed to reject amendment')
      }
    } catch (err) {
      setError('Failed to reject amendment')
    } finally {
      setProcessing(false)
    }
  }

  async function handleProcess() {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/amendments/${amendmentId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(
          `Amendment processed successfully. New sections created: ${data.newSectionIds?.length || 0}`
        )
        setTimeout(() => {
          router.push('/operations/amendments')
        }, 3000)
      } else {
        setError(data.error || 'Failed to process amendment')
      }
    } catch (err) {
      setError('Failed to process amendment')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading amendment details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !amendment) {
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

  if (!amendment) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Amendment</h1>
          <p className="text-muted-foreground mt-2">
            Amendment ID: {amendmentId.substring(0, 8)}...
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

      {/* Amendment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Amendment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scheme Number</Label>
              <p className="font-medium">{amendment.schemeNumber}</p>
            </div>
            <div>
              <Label>Amendment Type</Label>
              <Badge>{amendment.amendmentType}</Badge>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <p className="font-medium">{amendment.description}</p>
            </div>
            <div className="col-span-2">
              <Label>Reason</Label>
              <p className="font-medium">{amendment.reason}</p>
            </div>
            <div>
              <Label>Affected Sections</Label>
              <p className="font-medium">{amendment.affectedSectionIds.length}</p>
            </div>
            <div>
              <Label>New Section Count</Label>
              <p className="font-medium">{amendment.newSectionCount}</p>
            </div>
            <div>
              <Label>Status</Label>
              <Badge variant={amendment.status === 'approved' ? 'default' : 'outline'}>
                {amendment.status}
              </Badge>
            </div>
          </div>

          {amendment.newSections && amendment.newSections.length > 0 && (
            <div className="border-t pt-4">
              <Label>New Sections</Label>
              <div className="mt-2 space-y-2">
                {amendment.newSections.map((section, index) => (
                  <div key={index} className="p-2 border rounded">
                    <p className="font-medium">
                      {section.sectionNumber} - {section.area} m² ({section.sectionType || 'residential'})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {amendment.validationWarnings && amendment.validationWarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {amendment.validationWarnings.map((warn, index) => (
                <li key={index} className="text-sm">
                  {warn}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Review Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Review Notes</CardTitle>
          <CardDescription>Add notes or comments about this amendment</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Enter review notes..."
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Amendment Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {amendment.status === 'submitted' && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={processing || !reviewNotes.trim()}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={processing || !reviewNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {amendment.status === 'approved' && (
              <Button onClick={handleProcess} disabled={processing} className="flex-1">
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Process Amendment
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

