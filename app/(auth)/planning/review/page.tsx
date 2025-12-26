/**
 * Planning Review Dashboard
 * Review interface for Planning Authority
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Eye, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface Scheme {
  id: string
  plan_number: string
  title: string
  planner_name: string
  status: string
  submitted_at: string
  created_at: string
}

export default function PlanningReviewPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)

  useEffect(() => {
    loadPendingSchemes()
  }, [])

  const loadPendingSchemes = async () => {
    try {
      const response = await fetch('/api/planning/review/pending')
      const data = await response.json()

      if (data.success) {
        setSchemes(data.schemes || [])
      }
    } catch (error) {
      console.error('Failed to load schemes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>
      case 'under_review_planning_authority':
        return <Badge variant="default">Under Review</Badge>
      case 'returned_for_amendment':
        return <Badge variant="destructive">Amendment Required</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-ZW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Planning Review Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve/reject sectional scheme submissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
          <CardDescription>
            {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : schemes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending schemes for review
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Number</TableHead>
                  <TableHead>Scheme Name</TableHead>
                  <TableHead>Planner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.map((scheme) => (
                  <TableRow key={scheme.id}>
                    <TableCell className="font-medium">{scheme.plan_number}</TableCell>
                    <TableCell>{scheme.title}</TableCell>
                    <TableCell>{scheme.planner_name || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(scheme.status)}</TableCell>
                    <TableCell>{formatDate(scheme.submitted_at || scheme.created_at)}</TableCell>
                    <TableCell>
                      <Link href={`/planning/review/${scheme.id}`}>
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
    </div>
  )
}

