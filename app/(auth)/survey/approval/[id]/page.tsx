/**
 * Survey Review Detail Page
 * Detailed review interface for a specific survey plan
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  SURVEY_REVIEW_CHECKLIST,
  ChecklistItem,
  validateChecklist,
} from '@/lib/survey/review-checklist'
import { CheckCircle2, XCircle, AlertTriangle, FileText, BadgeCheck } from 'lucide-react'

export default function SurveyReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const surveyPlanId = params.id as string

  const [checklist, setChecklist] = useState<ChecklistItem[]>(SURVEY_REVIEW_CHECKLIST)
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    )
  }

  const handleNotesChange = (id: string, notes: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    )
  }

  const handleApprove = async () => {
    const validation = validateChecklist(checklist)
    if (!validation.isValid) {
      setError(
        `Please complete all required checklist items: ${validation.missingRequired.map((item) => item.description).join(', ')}`
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/survey/review/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyPlanId,
          decision: 'approve',
          notes: reviewNotes,
          checklist,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Survey approved and sealed successfully')
        setTimeout(() => {
          router.push('/survey/approval')
        }, 2000)
      } else {
        setError(data.error || 'Failed to approve survey')
      }
    } catch (err) {
      setError('Failed to approve survey')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      setError('Please provide a rejection reason')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/survey/review/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyPlanId,
          decision: 'reject',
          notes: reviewNotes,
          checklist,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Survey rejected')
        setTimeout(() => {
          router.push('/survey/approval')
        }, 2000)
      } else {
        setError(data.error || 'Failed to reject survey')
      }
    } catch (err) {
      setError('Failed to reject survey')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestRevision = async () => {
    if (!reviewNotes.trim()) {
      setError('Please provide revision notes')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/survey/review/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyPlanId,
          decision: 'request_revision',
          notes: reviewNotes,
          checklist,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Revision requested')
        setTimeout(() => {
          router.push('/survey/approval')
        }, 2000)
      } else {
        setError(data.error || 'Failed to request revision')
      }
    } catch (err) {
      setError('Failed to request revision')
    } finally {
      setLoading(false)
    }
  }

  const validation = validateChecklist(checklist)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Survey Plan</h1>
          <p className="text-muted-foreground mt-2">
            Survey Plan ID: {surveyPlanId.substring(0, 8)}...
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

      {/* Review Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Checklist</CardTitle>
          <CardDescription>
            Review all items before approving or sealing the survey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['geometry', 'compliance', 'documentation', 'legal'].map((category) => (
            <div key={category} className="space-y-2">
              <h3 className="font-semibold capitalize">{category} Checks</h3>
              {checklist
                .filter((item) => item.category === category)
                .map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-2 border rounded">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        handleChecklistChange(item.id, checked === true)
                      }
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={item.id}
                        className={`cursor-pointer ${item.required ? 'font-medium' : ''}`}
                      >
                        {item.description}
                        {item.required && (
                          <Badge variant="destructive" className="ml-2">
                            Required
                          </Badge>
                        )}
                      </Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={item.notes || ''}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        className="mt-2"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ))}

          {!validation.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Incomplete Checklist</AlertTitle>
              <AlertDescription>
                {validation.missingRequired.length} required items are unchecked
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Review Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Review Notes</CardTitle>
          <CardDescription>Add general notes or comments about this review</CardDescription>
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
          <CardTitle>Review Decision</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={handleApprove}
              disabled={loading || !validation.isValid}
              className="flex-1"
            >
              <BadgeCheck className="h-4 w-4 mr-2" />
              Approve & Seal
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={loading || !reviewNotes.trim()}
              variant="outline"
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Revision
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading || !reviewNotes.trim()}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

