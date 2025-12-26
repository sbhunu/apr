'use client'

/*
 * Surveyor-General Dashboard
 * Combines sealing and pending review workflows on one page.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react'

interface ApprovedSurvey {
  id: string
  plan_number: string
  planner_name: string
  status: string
  approved_at?: string
  sealed_at?: string
  seal_hash?: string
}

interface PendingSurvey {
  id: string
  surveyNumber: string
  title: string
  surveyorName: string
  submittedAt: string
  sectionCount: number
}

export default function SurveyApprovalPage() {
  const [approvedSurveys, setApprovedSurveys] = useState<ApprovedSurvey[]>([])
  const [approvedLoading, setApprovedLoading] = useState(true)
  const [approvedSealing, setApprovedSealing] = useState<string | null>(null)

  const [pendingSurveys, setPendingSurveys] = useState<PendingSurvey[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([loadApprovedSurveys(), loadPendingSurveys()])
  }, [])

  const loadApprovedSurveys = async () => {
    setApprovedLoading(true)
    try {
      const response = await fetch('/api/survey/pending')
      const data = await response.json()

      if (data.success) {
        setApprovedSurveys(data.surveys || [])
      }
    } catch (error) {
      console.error('Failed to load approved surveys:', error)
    } finally {
      setApprovedLoading(false)
    }
  }

  const loadPendingSurveys = async () => {
    setPendingLoading(true)
    setPendingError(null)
    try {
      const response = await fetch('/api/survey/review/pending')
      const data = await response.json()

      if (data.success) {
        setPendingSurveys(data.surveys || [])
      } else {
        setPendingError(data.error || 'Failed to load pending surveys')
      }
    } catch (error) {
      console.error('Failed to load pending surveys', error)
      setPendingError('Failed to load pending surveys')
    } finally {
      setPendingLoading(false)
    }
  }

  const handleSeal = async (planId: string) => {
    setApprovedSealing(planId)
    try {
      const response = await fetch(`/api/survey/seal/${planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sealNotes: 'Sealed by Surveyor-General' }),
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Survey sealed',
          description: `Seal hash: ${data.sealHash}`,
        })
        loadApprovedSurveys()
      } else {
        throw new Error(data.error || 'Seal failed')
      }
    } catch (error) {
      toast({
        title: 'Seal failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setApprovedSealing(null)
    }
  }

  const formatDate = (value?: string) => {
    if (!value) return 'N/A'
    return new Date(value).toLocaleString('en-ZW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-10">
      <section>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Surveyor-General Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Seal approved surveys and monitor pending reviews.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Approved Surveys Ready for Sealing</CardTitle>
            <CardDescription>
              Seal official plans and capture the digital hash.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {approvedLoading ? (
              <div className="text-center py-8">Loading surveys...</div>
            ) : approvedSurveys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approved surveys awaiting sealing.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Number</TableHead>
                    <TableHead>Planner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Sealed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedSurveys.map((survey) => (
                    <TableRow key={survey.id}>
                      <TableCell className="font-medium">{survey.plan_number}</TableCell>
                      <TableCell>{survey.planner_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={survey.status === 'approved' ? 'secondary' : 'outline'}>
                          {survey.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(survey.approved_at)}</TableCell>
                      <TableCell>{formatDate(survey.sealed_at)}</TableCell>
                      <TableCell className="space-x-2">
                        <Link href={`/planning/review/${survey.id}`}>
                          <Button variant="ghost" size="sm">
                            Review
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSeal(survey.id)}
                          disabled={approvedSealing === survey.id}
                        >
                          {approvedSealing === survey.id ? 'Sealing…' : 'Seal Survey'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Survey Review & Approval</h2>
            <p className="text-muted-foreground mt-2">
              Review incoming submissions prior to sealing.
            </p>
          </div>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Pending Surveys ({pendingSurveys.length})</CardTitle>
            <CardDescription>
              Surveys awaiting Surveyor-General review and approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="text-center py-8">Loading pending surveys...</div>
            ) : pendingError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{pendingError}</AlertDescription>
              </Alert>
            ) : pendingSurveys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                No pending surveys for review.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Survey Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Surveyor</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSurveys.map((survey) => (
                    <TableRow key={survey.id}>
                      <TableCell>
                        <Badge variant="outline">{survey.surveyNumber}</Badge>
                      </TableCell>
                      <TableCell>{survey.title}</TableCell>
                      <TableCell>{survey.surveyorName}</TableCell>
                      <TableCell>{survey.sectionCount}</TableCell>
                      <TableCell>{new Date(survey.submittedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Link href={`/survey/approval/${survey.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
