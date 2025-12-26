/**
 * Leases Dashboard
 * Interface for viewing and managing leases
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
import { FileText, AlertTriangle, Plus, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Lease {
  id: string
  leaseNumber: string
  titleId: string
  lessorName: string
  lesseeName: string
  lesseeType: string
  leaseStartDate: string
  leaseEndDate: string
  leaseTermMonths: number
  monthlyRent?: number
  rentCurrency: string
  status: string
}

export default function LeasesPage() {
  const router = useRouter()
  const [leases, setLeases] = useState<Lease[]>([])
  const [expiringLeases, setExpiringLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLeases()
    loadExpiringLeases()
  }, [])

  async function loadLeases() {
    try {
      const response = await fetch('/api/operations/leases')
      const data = await response.json()

      if (data.success) {
        setLeases(data.leases || [])
      } else {
        setError(data.error || 'Failed to load leases')
      }
    } catch (err) {
      setError('Failed to load leases')
    } finally {
      setLoading(false)
    }
  }

  async function loadExpiringLeases() {
    try {
      const response = await fetch('/api/operations/leases/expiring?days=90')
      const data = await response.json()

      if (data.success) {
        setExpiringLeases(data.leases || [])
      }
    } catch (err) {
      // Silently fail - expiring leases is optional
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading leases...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Registration</h1>
          <p className="text-muted-foreground mt-2">
            Register and manage long-term leases on sectional titles
          </p>
        </div>
        <Link href="/operations/leases/register">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Register Lease
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

      {/* Expiring Leases Alert */}
      {expiringLeases.length > 0 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>Expiring Leases</AlertTitle>
          <AlertDescription>
            {expiringLeases.length} lease(s) expiring within the next 90 days
          </AlertDescription>
        </Alert>
      )}

      {leases.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No leases registered</p>
              <Link href="/operations/leases/register">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Register First Lease
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registered Leases ({leases.length})</CardTitle>
            <CardDescription>All leases registered in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lease Number</TableHead>
                  <TableHead>Lessor</TableHead>
                  <TableHead>Lessee</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => {
                  const endDate = new Date(lease.leaseEndDate)
                  const today = new Date()
                  const isExpiringSoon = endDate <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) && lease.status === 'active'

                  return (
                    <TableRow key={lease.id}>
                      <TableCell>
                        <Badge variant="outline">{lease.leaseNumber}</Badge>
                      </TableCell>
                      <TableCell>{lease.lessorName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lease.lesseeName}</p>
                          <p className="text-sm text-muted-foreground">{lease.lesseeType}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(lease.leaseStartDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className={isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                          {new Date(lease.leaseEndDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{lease.leaseTermMonths} months</TableCell>
                      <TableCell>
                        {lease.monthlyRent
                          ? `${lease.rentCurrency} ${lease.monthlyRent.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            lease.status === 'active'
                              ? 'default'
                              : lease.status === 'expired' || lease.status === 'terminated'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {lease.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/operations/leases/${lease.id}`}>
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

