/**
 * Planning Review Page
 * Detailed review interface for a specific scheme
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle, Save, Send, Clock } from 'lucide-react'
import { DEFAULT_REVIEW_CHECKLIST, validateChecklist } from '@/lib/planning/review-checklist'
import type { ReviewChecklistItem } from '@/lib/planning/review-service'
import type { SchemeValidationReport } from '@/lib/survey/topology-validation-service'

interface Scheme {
  id: string
  plan_number: string
  title: string
  description: string
  planner_name: string
  status: string
  submitted_at: string
}

export default function ReviewSchemePage() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string

  const [scheme, setScheme] = useState<Scheme | null>(null)
  const [checklist, setChecklist] = useState<ReviewChecklistItem[]>(DEFAULT_REVIEW_CHECKLIST)
  const [reviewNotes, setReviewNotes] = useState('')
  const [findings, setFindings] = useState<Array<{
    severity: 'info' | 'warning' | 'error'
    category: string
    description: string
  }>>([])
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'requires_amendment' | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationReport, setValidationReport] = useState<SchemeValidationReport | null>(null)
  const [validationLoading, setValidationLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    loadScheme()
    runValidation()
  }, [planId])
  const runValidation = async () => {
    setValidationLoading(true)
    setValidationError(null)

    try {
      const response = await fetch(`/api/survey/validate/${planId}`)
      const data = await response.json()

      if (data.success) {
        setValidationReport(data.report || null)
      } else {
        throw new Error(data.error || 'Failed to validate survey')
      }
    } catch (err) {
      setValidationReport(null)
      setValidationError(err instanceof Error ? err.message : 'Validation failed')
    } finally {
      setValidationLoading(false)
    }
  }


  const loadScheme = async () => {
    try {
      const response = await fetch(`/api/planning/schemes/${planId}`)
      const data = await response.json()

      if (data.success) {
        setScheme(data.plan)
      }
    } catch (error) {
      console.error('Failed to load scheme:', error)
      setError('Failed to load scheme details')
    } finally {
      setLoading(false)
    }
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    )
  }

  const addFinding = () => {
    setFindings((prev) => [
      ...prev,
      {
        severity: 'warning',
        category: 'General',
        description: '',
      },
    ])
  }

  const removeFinding = (index: number) => {
    setFindings((prev) => prev.filter((_, i) => i !== index))
  }

  const updateFinding = (index: number, field: string, value: string) => {
    setFindings((prev) =>
      prev.map((finding, i) =>
        i === index ? { ...finding, [field]: value } : finding
      )
    )
  }

  const handleSubmit = async () => {
    if (!decision) {
      setError('Please select a decision (Approve, Reject, or Require Amendment)')
      return
    }

    if (decision === 'rejected' && !reason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    if (decision === 'requires_amendment' && !reason.trim()) {
      setError('Please provide amendment requirements')
      return
    }

    // Validate required checklist items
    const validation = validateChecklist(checklist)
    if (!validation.valid && decision === 'approved') {
      setError(`Please complete all required checklist items: ${validation.missingRequired.join(', ')}`)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/planning/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          reviewType: 'initial_review',
          checklist,
          reviewNotes,
          findings,
          decision,
          reason,
        }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/planning/review')
      } else {
        setError(data.error || 'Failed to submit review')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>Scheme not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const categories = Array.from(new Set(checklist.map((item) => item.category)))

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Review Scheme</h1>
        <p className="text-muted-foreground mt-2">
          Plan Number: {scheme.plan_number}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scheme Information */}
        <Card>
          <CardHeader>
            <CardTitle>Scheme Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Scheme Name</Label>
              <p className="font-medium">{scheme.title}</p>
            </div>
            {scheme.description && (
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">{scheme.description}</p>
              </div>
            )}
            <div>
              <Label>Planner</Label>
              <p>{scheme.planner_name || 'N/A'}</p>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">
                <Badge>{scheme.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Review Checklist</CardTitle>
            <CardDescription>Complete all required items before approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="font-semibold mb-2">{category}</h3>
                <div className="space-y-2">
                  {checklist
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="mt-1"
                        />
                        <span className={item.required ? 'font-medium' : ''}>
                          {item.item}
                          {item.required && <span className="text-destructive ml-1">*</span>}
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Survey Validation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Survey Validation</CardTitle>
          <CardDescription>Run topology checks before final decision</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold">{validationReport?.errors.length ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold">{validationReport?.warnings.length ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Validated At</p>
                <p className="text-base">
                  {validationReport?.validationMetadata.validatedAt
                    ? new Date(validationReport.validationMetadata.validatedAt).toLocaleString('en-ZW')
                    : 'Not run'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={runValidation} disabled={validationLoading}>
                {validationLoading ? 'Running...' : 'Re-run Validation'}
              </Button>
            </div>
            {validationReport && validationReport.errorLocations.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Error locations</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationReport.errorLocations.slice(0, 3).map((loc, index) => (
                    <li key={index}>{loc.description}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationReport && validationReport.correctionSuggestions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Suggested Actions</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {validationReport.correctionSuggestions.slice(0, 3).map((suggestion, index) => (
                    <li key={index}>
                      [{suggestion.priority.toUpperCase()}] {suggestion.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Findings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>Document any issues or observations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {findings.map((finding, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded">
                <select
                  value={finding.severity}
                  onChange={(e) =>
                    updateFinding(index, 'severity', e.target.value)
                  }
                  className="border rounded px-2 py-1"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <input
                  type="text"
                  placeholder="Category"
                  value={finding.category}
                  onChange={(e) =>
                    updateFinding(index, 'category', e.target.value)
                  }
                  className="flex-1 border rounded px-2 py-1"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={finding.description}
                  onChange={(e) =>
                    updateFinding(index, 'description', e.target.value)
                  }
                  className="flex-1 border rounded px-2 py-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFinding(index)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addFinding}>
              Add Finding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Review Notes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Review Notes</CardTitle>
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

      {/* Decision */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={decision === 'approved' ? 'default' : 'outline'}
              onClick={() => setDecision('approved')}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant={decision === 'rejected' ? 'destructive' : 'outline'}
              onClick={() => setDecision('rejected')}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant={decision === 'requires_amendment' ? 'default' : 'outline'}
              onClick={() => setDecision('requires_amendment')}
              className="flex-1"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Require Amendment
            </Button>
          </div>

          {(decision === 'rejected' || decision === 'requires_amendment') && (
            <div>
              <Label>
                {decision === 'rejected' ? 'Rejection Reason' : 'Amendment Requirements'} *
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  decision === 'rejected'
                    ? 'Enter reason for rejection...'
                    : 'Enter amendment requirements...'
                }
                rows={4}
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Review
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

