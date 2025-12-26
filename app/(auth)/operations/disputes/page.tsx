/**
 * Disputes Dashboard
 * Interface for viewing and managing disputes
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
import { FileText, AlertTriangle, Plus, Scale } from 'lucide-react'
import Link from 'next/link'

interface Dispute {
  id: string
  disputeType: string
  complainantName: string
  description: string
  submittedAt: string
  assignedAuthority?: string
}

export default function DisputesPage() {
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPendingDisputes()
  }, [])

  async function loadPendingDisputes() {
    try {
      const response = await fetch('/api/operations/disputes/pending')
      const data = await response.json()

      if (data.success) {
        setDisputes(data.disputes || [])
      } else {
        setError(data.error || 'Failed to load disputes')
      }
    } catch (err) {
      setError('Failed to load disputes')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading disputes...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-muted-foreground mt-2">
            Manage disputes involving titles, schemes, and amendments
          </p>
        </div>
        <Link href="/operations/disputes/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Dispute
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

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No pending disputes</p>
              <Link href="/operations/disputes/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Dispute
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Disputes ({disputes.length})</CardTitle>
            <CardDescription>Disputes awaiting assignment and resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Complainant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell>
                      <Badge variant="secondary">{dispute.disputeType}</Badge>
                    </TableCell>
                    <TableCell>{dispute.complainantName}</TableCell>
                    <TableCell className="max-w-md truncate">{dispute.description}</TableCell>
                    <TableCell>
                      {dispute.assignedAuthority ? (
                        <Badge variant="outline">{dispute.assignedAuthority}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(dispute.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/operations/disputes/${dispute.id}`}>
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

