/**
 * Planner Scheme Detail Page
 * Allows planners to view, edit, and submit individual scheme applications.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PlanningMap } from '@/components/maps/PlanningMap'
import { PlanDocumentList, type PlanDocument } from '@/components/planning/PlanDocumentList'
import { toGeoJsonFeature } from '@/lib/planning/plan-utils'
import { Save, Send, Clock } from 'lucide-react'

type SchemeStatus =
  | 'draft'
  | 'submitted'
  | 'under_review_planning_authority'
  | 'approved_planning_authority'
  | 'rejected_planning_authority'
  | 'returned_for_amendment'
  | 'finalized'
  | 'withdrawn'

interface SchemeDetail {
  id: string
  plan_number: string
  title: string
  description?: string | null
  location_name?: string | null
  planner_name?: string | null
  planner_registration_number?: string | null
  status: SchemeStatus
  created_at?: string | null
  updated_at?: string | null
  boundary_geometry?: unknown
  metadata?: Record<string, unknown>
}

const statusLabelMap: Record<SchemeStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review_planning_authority: 'Under review',
  approved_planning_authority: 'Approved',
  rejected_planning_authority: 'Rejected',
  returned_for_amendment: 'Returned',
  finalized: 'Finalized',
  withdrawn: 'Withdrawn',
}

const statusBadgeVariant: Record<SchemeStatus, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  draft: 'outline',
  submitted: 'secondary',
  under_review_planning_authority: 'secondary',
  approved_planning_authority: 'default',
  rejected_planning_authority: 'destructive',
  returned_for_amendment: 'outline',
  finalized: 'default',
  withdrawn: 'destructive',
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-ZW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SchemeDetailPage() {
  const params = useParams()
  const planId = params.id

  const [plan, setPlan] = useState<SchemeDetail | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationName: '',
    plannerName: '',
  })
  const [documents, setDocuments] = useState<PlanDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [docsLoading, setDocsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    if (!planId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/planning/schemes/${planId}`)
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load plan')
      }
      setPlan(data.plan)
      setFormData({
        title: data.plan?.title || '',
        description: data.plan?.description || '',
        locationName: data.plan?.location_name || '',
        plannerName: data.plan?.planner_name || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  useEffect(() => {
    if (!planId) return
    setDocsLoading(true)
    fetch(`/api/planning/schemes/${planId}/documents`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load documents')
        }
        setDocuments(data.documents || [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load documents')
      })
      .finally(() => {
        setDocsLoading(false)
      })
  }, [planId])

  const parentFeature = useMemo(() => (plan ? toGeoJsonFeature(plan.boundary_geometry) : null), [plan])
  const canSubmit =
    plan &&
    (plan.status === 'draft' ||
      plan.status === 'returned_for_amendment' ||
      plan.status === 'rejected_planning_authority')

  const handleSave = async () => {
    if (!planId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/planning/schemes/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          locationName: formData.locationName,
          plannerName: formData.plannerName,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save plan')
      }

      setSuccess('Plan updated')
      fetchPlan()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!planId) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/planning/schemes/${planId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Submitted via planner dashboard' }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit plan')
      }
      setSuccess('Plan submitted for review')
      fetchPlan()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">Loading plan details…</CardContent>
        </Card>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Plan not found</AlertTitle>
          <AlertDescription>This plan could not be loaded or does not belong to you.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Planning submission</p>
            <h1 className="text-3xl font-bold text-slate-900">{plan.plan_number}</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant={statusBadgeVariant[plan.status]}>{statusLabelMap[plan.status]}</Badge>
            <Link href="/planning/schemes">
              <Button variant="outline" size="sm">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Created {formatDate(plan.created_at)}</span>
          <span>Last updated {formatDate(plan.updated_at)}</span>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Spatial preview & documents</CardTitle>
          <CardDescription>Boundary geometry and supporting files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="aspect-video rounded-2xl border border-slate-200 bg-slate-900">
              <PlanningMap
                parentLand={parentFeature ?? undefined}
                proposedSections={parentFeature ? [parentFeature] : undefined}
                className="h-full w-full"
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">{plan.description || 'No description yet.'}</p>
              <div className="text-xs text-slate-500">
                <p>Location: {plan.location_name || 'Pending'}</p>
                <p>Planner: {plan.planner_name || 'Unknown'}</p>
              </div>
              {docsLoading ? (
                <p className="text-sm text-slate-500">Loading documents…</p>
              ) : (
                <PlanDocumentList documents={documents} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan details</CardTitle>
          <CardDescription>Edit metadata before submitting the plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="title">Scheme title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.locationName}
                onChange={(event) => setFormData({ ...formData, locationName: event.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="plannerName">Planner name</Label>
            <Input
              id="plannerName"
              value={formData.plannerName}
              onChange={(event) => setFormData({ ...formData, plannerName: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSave} variant="outline" disabled={saving}>
              {saving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
            {canSubmit && (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for review
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

