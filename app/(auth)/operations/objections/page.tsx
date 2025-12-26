/**
 * Objections Dashboard
 * Interface for viewing and managing objections
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
import { FileText, AlertTriangle, Plus, Gavel } from 'lucide-react'
import Link from 'next/link'

interface Objection {
  id: string
  planningPlanId: string
  objectorName: string
  objectionType: string
  description: string
  submittedAt: string
}

export default function ObjectionsPage() {
  const router = useRouter()
  const [objections, setObjections] = useState<Objection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPendingObjections()
  }, [])

  async function loadPendingObjections() {
    try {
      const response = await fetch('/api/operations/objections/pending')
      const data = await response.json()

      if (data.success) {
        setObjections(data.objections || [])
      } else {
        setError(data.error || 'Failed to load objections')
      }
    } catch (err) {
      setError('Failed to load objections')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading objections...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Objections</h1>
          <p className="text-muted-foreground mt-2">
            Manage objections submitted during the objection window
          </p>
        </div>
        <Link href="/operations/objections/submit">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Objection
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

      {objections.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No pending objections</p>
              <Link href="/operations/objections/submit">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit First Objection
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Objections ({objections.length})</CardTitle>
            <CardDescription>Objections awaiting review and resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Planning Plan ID</TableHead>
                  <TableHead>Objector</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objections.map((objection) => (
                  <TableRow key={objection.id}>
                    <TableCell>
                      <Badge variant="outline">{objection.planningPlanId.substring(0, 8)}...</Badge>
                    </TableCell>
                    <TableCell>{objection.objectorName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{objection.objectionType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{objection.description}</TableCell>
                    <TableCell>
                      {new Date(objection.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/operations/objections/${objection.id}`}>
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

