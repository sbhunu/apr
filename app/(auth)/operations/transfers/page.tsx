/**
 * Transfers Dashboard
 * Interface for viewing and managing ownership transfers
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

interface Transfer {
  id: string
  titleNumber: string
  currentHolder: string
  newHolder: string
  transferType: string
  transferDate: string
  considerationAmount?: number
  submittedAt: string
}

export default function TransfersPage() {
  const router = useRouter()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPendingTransfers()
  }, [])

  async function loadPendingTransfers() {
    try {
      const response = await fetch('/api/operations/transfers/pending')
      const data = await response.json()

      if (data.success) {
        setTransfers(data.transfers || [])
      } else {
        setError(data.error || 'Failed to load transfers')
      }
    } catch (err) {
      setError('Failed to load transfers')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading transfers...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ownership Transfers</h1>
          <p className="text-muted-foreground mt-2">
            Manage ownership transfer requests
          </p>
        </div>
        <Link href="/operations/transfers/submit">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Transfer
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

      {transfers.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending transfers</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pending Transfers ({transfers.length})</CardTitle>
            <CardDescription>
              Transfers awaiting review and approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title Number</TableHead>
                  <TableHead>Current Holder</TableHead>
                  <TableHead>New Holder</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Consideration</TableHead>
                  <TableHead>Transfer Date</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      <Badge variant="outline">{transfer.titleNumber}</Badge>
                    </TableCell>
                    <TableCell>{transfer.currentHolder}</TableCell>
                    <TableCell>{transfer.newHolder}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transfer.transferType}</Badge>
                    </TableCell>
                    <TableCell>
                      {transfer.considerationAmount
                        ? `$${transfer.considerationAmount.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(transfer.transferDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(transfer.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/operations/transfers/${transfer.id}`}>
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

