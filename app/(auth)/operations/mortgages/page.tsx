/**
 * Mortgages Dashboard
 * Interface for viewing and managing mortgages/charges
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
import { FileText, AlertTriangle, Plus, Shield } from 'lucide-react'
import Link from 'next/link'

interface Mortgage {
  id: string
  mortgageNumber: string
  titleId: string
  lenderName: string
  borrowerName: string
  mortgageAmount: number
  mortgageCurrency: string
  registrationDate: string
  status: string
  priority: number
}

export default function MortgagesPage() {
  const router = useRouter()
  const [mortgages, setMortgages] = useState<Mortgage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMortgages()
  }, [])

  async function loadMortgages() {
    try {
      const response = await fetch('/api/operations/mortgages')
      const data = await response.json()

      if (data.success) {
        setMortgages(data.mortgages || [])
      } else {
        setError(data.error || 'Failed to load mortgages')
      }
    } catch (err) {
      setError('Failed to load mortgages')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading mortgages...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mortgage Registration</h1>
          <p className="text-muted-foreground mt-2">
            Register and manage charges and mortgages on sectional titles
          </p>
        </div>
        <Link href="/operations/mortgages/register">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register Mortgage
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

      {mortgages.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {error ? 'Unable to load mortgages' : 'No mortgages registered'}
              </p>
              <Link href="/operations/mortgages/register">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Register First Mortgage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registered Mortgages ({mortgages.length})</CardTitle>
            <CardDescription>All mortgages and charges registered in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mortgage Number</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mortgages.map((mortgage) => (
                  <TableRow key={mortgage.id}>
                    <TableCell>
                      <Badge variant="outline">{mortgage.mortgageNumber}</Badge>
                    </TableCell>
                    <TableCell>{mortgage.lenderName}</TableCell>
                    <TableCell>{mortgage.borrowerName}</TableCell>
                    <TableCell>
                      {mortgage.mortgageCurrency} {mortgage.mortgageAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Priority {mortgage.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(mortgage.registrationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          mortgage.status === 'registered'
                            ? 'default'
                            : mortgage.status === 'discharged'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {mortgage.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/operations/mortgages/${mortgage.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View
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
