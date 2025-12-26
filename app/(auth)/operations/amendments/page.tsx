/**
 * Amendments Dashboard
 * Interface for viewing and managing scheme amendments
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'

interface Amendment {
  id: string
  schemeNumber: string
  amendmentType: string
  description: string
  affectedSectionCount: number
  submittedAt: string
}

export default function AmendmentsPage() {
  const router = useRouter()
  const [amendments, setAmendments] = useState<Amendment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPendingAmendments()
  }, [])

  async function loadPendingAmendments() {
    try {
      const response = await fetch('/api/operations/amendments/pending')
      const data = await response.json()

      if (data.success) {
        setAmendments(data.amendments || [])
      } else {
        setError(data.error || 'Failed to load amendments')
      }
    } catch (err) {
      setError('Failed to load amendments')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading amendments...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheme Amendments</h1>
          <p className="text-muted-foreground mt-2">
            Manage scheme amendment requests
          </p>
        </div>
        <Link href="/operations/amendments/submit">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Amendment
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {amendments.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending amendments</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Amendments ({amendments.length})</CardTitle>
            <CardDescription>
              Amendments awaiting review and approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheme Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Affected Sections</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {amendments.map((amendment) => (
                  <TableRow key={amendment.id}>
                    <TableCell>
                      <Badge variant="outline">{amendment.schemeNumber}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{amendment.amendmentType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {amendment.description}
                    </TableCell>
                    <TableCell>{amendment.affectedSectionCount}</TableCell>
                    <TableCell>
                      {new Date(amendment.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/operations/amendments/${amendment.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

