/**
 * Planner Scheme Dashboard
 * Lists all planner submissions, provides quick metrics, map preview, and document teasers.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PlanningMap } from '@/components/maps/PlanningMap'
import { PlanDocumentList, type PlanDocument } from '@/components/planning/PlanDocumentList'
import { toGeoJsonFeature } from '@/lib/planning/plan-utils'
import { ArrowRightCircle } from 'lucide-react'
import type { Geometry } from 'geojson'

type SchemeStatus =
  | 'draft'
  | 'submitted'
  | 'under_review_planning_authority'
  | 'approved_planning_authority'
  | 'rejected_planning_authority'
  | 'returned_for_amendment'
  | 'finalized'
  | 'withdrawn'

interface Scheme {
  id: string
  plan_number: string
  title: string
  description?: string | null
  location_name?: string | null
  planner_name?: string | null
  status: SchemeStatus
  created_at?: string | null
  updated_at?: string | null
  metadata?: Record<string, unknown>
  boundary_geometry?: Geometry | string | null
}

const statusFilters = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under review', value: 'under_review_planning_authority' },
  { label: 'Approved', value: 'approved_planning_authority' },
  { label: 'Rejected', value: 'rejected_planning_authority' },
  { label: 'Returned', value: 'returned_for_amendment' },
]

const formatStatus = (status: SchemeStatus) => {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'submitted':
      return 'Submitted'
    case 'under_review_planning_authority':
      return 'Under Review'
    case 'approved_planning_authority':
      return 'Approved'
    case 'rejected_planning_authority':
      return 'Rejected'
    case 'returned_for_amendment':
      return 'Returned'
    case 'finalized':
      return 'Finalized'
    case 'withdrawn':
      return 'Withdrawn'
    default:
      return status
  }
}

const statusBadgeVariants: Record<SchemeStatus, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  draft: 'outline',
  submitted: 'secondary',
  under_review_planning_authority: 'secondary',
  approved_planning_authority: 'default',
  rejected_planning_authority: 'destructive',
  returned_for_amendment: 'outline',
  finalized: 'default',
  withdrawn: 'destructive',
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-ZW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function PlannerSchemeDashboard() {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<PlanDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)

  const fetchSchemes = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = statusFilter === 'all' ? '' : `?status=${encodeURIComponent(statusFilter)}`
      const response = await fetch(`/api/planning/schemes${params}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plans')
      }
      setSchemes(data.schemes || [])
      const nextId =
        data.schemes?.find((scheme: Scheme) => scheme.id === selectedPlanId)?.id ||
        data.schemes?.[0]?.id ||
        null
      setSelectedPlanId(nextId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchemes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    if (!selectedPlanId) {
      setDocuments([])
      return
    }

    setDocsLoading(true)
    setDocuments([])
    setError(null)

    fetch(`/api/planning/schemes/${selectedPlanId}/documents`)
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
  }, [selectedPlanId])

  const selectedPlan = useMemo(() => schemes.find((scheme) => scheme.id === selectedPlanId) ?? null, [
    schemes,
    selectedPlanId,
  ])

  const parentFeature = selectedPlan ? toGeoJsonFeature(selectedPlan.boundary_geometry) : null
  const proposedFeatures = parentFeature ? [parentFeature] : []

  const totalByStatus = useMemo(() => {
    return schemes.reduce((acc, scheme) => {
      acc[scheme.status] = (acc[scheme.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [schemes])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-slate-500">Planning Workbench</p>
            <h1 className="text-3xl font-bold text-slate-900">My Scheme Submissions</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/planning/schemes/new">
              <Button variant="outline">
                <ArrowRightCircle className="h-4 w-4 text-emerald-600" />
                New Submission
              </Button>
            </Link>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statusFilters
            .filter((option) => option.value !== 'all')
            .map((option) => (
              <Card key={option.value} className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-sm uppercase">{option.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold text-slate-900">
                  {totalByStatus[option.value] ?? 0}
                </CardContent>
              </Card>
            ))}
        </div>
      </header>

      {error && (
        <Card className="border-destructive">
          <CardContent className="text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheme catalogue</CardTitle>
              <CardDescription>Tap any row to preview it in the right column.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[480px]">
                <div className="min-w-full space-y-2">
                  {schemes.length === 0 && !loading ? (
                    <div className="text-sm text-muted-foreground">No submissions yet.</div>
                  ) : (
                    schemes.map((scheme) => (
                      <div
                        key={scheme.id}
                        className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 transition ${
                          scheme.id === selectedPlanId
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-slate-200 hover:border-emerald-200'
                        }`}
                        onClick={() => setSelectedPlanId(scheme.id)}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-base font-semibold text-slate-900">
                            {scheme.plan_number}
                          </p>
                          <Badge variant={statusBadgeVariants[scheme.status] ?? 'outline'}>
                            {formatStatus(scheme.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{scheme.title}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>{scheme.location_name || 'Location pending'}</span>
                          <span>Created {formatDate(scheme.created_at)}</span>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <span>Planner: {scheme.planner_name || 'Unknown'}</span>
                          <span>{scheme.description ? 'Description provided' : 'No description yet'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                          <Link href={`/planning/schemes/${scheme.id}`}>
                            <Button variant="ghost" size="sm">
                              Manage
                            </Button>
                          </Link>
                          <Link href={`/planning/review/${scheme.id}`}>
                            <Button variant="outline" size="sm">
                              Review view
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                  {loading && (
                    <div className="text-sm text-slate-500">Loading schemes…</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview panel</CardTitle>
              <CardDescription>
                Live map of the selected plan plus recent documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPlan ? (
                <>
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                    <PlanningMap
                      proposedSections={proposedFeatures}
                      parentLand={parentFeature ?? undefined}
                      className="h-full w-full"
                    />
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{selectedPlan.title}</p>
                    <p>{selectedPlan.description || 'Plan description pending.'}</p>
                    <p className="text-xs text-slate-500">
                      Last updated {formatDate(selectedPlan.updated_at)}
                    </p>
                  </div>

                  <PlanDocumentList documents={documents} />
                  {!docsLoading && documents.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No documents uploaded yet. You can attach planning drawings via the plan
                      document upload flow.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a plan to see the preview.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

