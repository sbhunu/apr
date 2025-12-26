/**
 * Lease Detail Page
 * Interface for viewing and managing a specific lease
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Calendar } from 'lucide-react'

interface LeaseDetails {
  id: string
  leaseNumber: string
  titleId: string
  lessorName: string
  lesseeName: string
  lesseeType: string
  lesseeIdNumber?: string
  lesseeContactEmail?: string
  lesseeContactPhone?: string
  leaseStartDate: string
  leaseEndDate: string
  leaseTermMonths: number
  monthlyRent?: number
  rentCurrency: string
  depositAmount?: number
  renewalOption: boolean
  renewalTermMonths?: number
  earlyTerminationAllowed: boolean
  terminationNoticeDays?: number
  leaseAgreementReference?: string
  status: string
  terminatedAt?: string
  terminationReason?: string
}

export default function LeaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leaseId = params.id as string

  const [lease, setLease] = useState<LeaseDetails | null>(null)
  const [terminationDate, setTerminationDate] = useState('')
  const [terminationReason, setTerminationReason] = useState('')
  const [terminationReference, setTerminationReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [discharging, setDischarging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadLeaseDetails()
  }, [leaseId])

  async function loadLeaseDetails() {
    try {
      const response = await fetch(`/api/operations/leases/${leaseId}`)
      const data = await response.json()

      if (data.success) {
        const l = data.lease as any
        setLease({
          id: l.id,
          leaseNumber: l.lease_number,
          titleId: l.title_id,
          lessorName: l.lessor_name,
          lesseeName: l.lessee_name,
          lesseeType: l.lessee_type,
          lesseeIdNumber: l.lessee_id,
          lesseeContactEmail: l.lessee_contact_email,
          lesseeContactPhone: l.lessee_contact_phone,
          leaseStartDate: l.lease_start_date,
          leaseEndDate: l.lease_end_date,
          leaseTermMonths: l.lease_term_months,
          monthlyRent: l.monthly_rent,
          rentCurrency: l.rent_currency || 'USD',
          depositAmount: l.deposit_amount,
          renewalOption: l.renewal_option || false,
          renewalTermMonths: l.renewal_term_months,
          earlyTerminationAllowed: l.early_termination_allowed || false,
          terminationNoticeDays: l.termination_notice_days,
          leaseAgreementReference: l.lease_agreement_reference,
          status: l.status,
          terminatedAt: l.terminated_at,
          terminationReason: l.termination_reason,
        })
      } else {
        setError(data.error || 'Failed to load lease details')
      }
    } catch (err) {
      setError('Failed to load lease details')
    } finally {
      setLoading(false)
    }
  }

  async function handleDischarge() {
    if (!terminationDate) {
      setError('Please provide a termination date')
      return
    }

    setDischarging(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/leases/${leaseId}/discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminationDate,
          terminationReason: terminationReason || undefined,
          terminationReference: terminationReference || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Lease terminated successfully')
        setTimeout(() => {
          router.push('/operations/leases')
        }, 2000)
      } else {
        setError(data.error || 'Failed to terminate lease')
      }
    } catch (err) {
      setError('Failed to terminate lease')
    } finally {
      setDischarging(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading lease details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !lease) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!lease) {
    return null
  }

  const endDate = new Date(lease.leaseEndDate)
  const today = new Date()
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isExpiringSoon = daysUntilExpiry <= 90 && daysUntilExpiry > 0 && lease.status === 'active'
  const isExpired = daysUntilExpiry < 0 && lease.status === 'active'

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Details</h1>
          <p className="text-muted-foreground mt-2">Lease Number: {lease.leaseNumber}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Expiry Warning */}
      {isExpiringSoon && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>Lease Expiring Soon</AlertTitle>
          <AlertDescription>
            This lease expires in {daysUntilExpiry} day(s) on{' '}
            {endDate.toLocaleDateString()}
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lease Expired</AlertTitle>
          <AlertDescription>
            This lease expired on {endDate.toLocaleDateString()}. Please update the status.
          </AlertDescription>
        </Alert>
      )}

      {/* Lease Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lease Number</Label>
              <p className="font-medium">{lease.leaseNumber}</p>
            </div>
            <div>
              <Label>Status</Label>
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
            </div>
            <div>
              <Label>Title ID</Label>
              <p className="font-medium">{lease.titleId.substring(0, 8)}...</p>
            </div>
            <div>
              <Label>Lease Term</Label>
              <p className="font-medium">{lease.leaseTermMonths} months</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lessor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Lessor Name</Label>
            <p className="font-medium">{lease.lessorName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Lessee Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lessee Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lessee Name</Label>
              <p className="font-medium">{lease.lesseeName}</p>
            </div>
            <div>
              <Label>Lessee Type</Label>
              <p className="font-medium">{lease.lesseeType}</p>
            </div>
            {lease.lesseeIdNumber && (
              <div>
                <Label>ID Number</Label>
                <p className="font-medium">{lease.lesseeIdNumber}</p>
              </div>
            )}
            {lease.lesseeContactEmail && (
              <div>
                <Label>Contact Email</Label>
                <p className="font-medium">{lease.lesseeContactEmail}</p>
              </div>
            )}
            {lease.lesseeContactPhone && (
              <div>
                <Label>Contact Phone</Label>
                <p className="font-medium">{lease.lesseeContactPhone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lease Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <p className="font-medium">
                {new Date(lease.leaseStartDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label>End Date</Label>
              <p className={`font-medium ${isExpiringSoon ? 'text-orange-600' : ''}`}>
                {new Date(lease.leaseEndDate).toLocaleDateString()}
              </p>
            </div>
            {daysUntilExpiry > 0 && lease.status === 'active' && (
              <div>
                <Label>Days Until Expiry</Label>
                <p className={`font-medium ${isExpiringSoon ? 'text-orange-600' : ''}`}>
                  {daysUntilExpiry} days
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rent Information */}
      {(lease.monthlyRent || lease.depositAmount) && (
        <Card>
          <CardHeader>
            <CardTitle>Rent Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {lease.monthlyRent && (
                <div>
                  <Label>Monthly Rent</Label>
                  <p className="font-medium">
                    {lease.rentCurrency} {lease.monthlyRent.toLocaleString()}
                  </p>
                </div>
              )}
              {lease.depositAmount && (
                <div>
                  <Label>Deposit Amount</Label>
                  <p className="font-medium">
                    {lease.rentCurrency} {lease.depositAmount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lease Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Renewal Option</Label>
              <p className="font-medium">{lease.renewalOption ? 'Yes' : 'No'}</p>
            </div>
            {lease.renewalTermMonths && (
              <div>
                <Label>Renewal Term</Label>
                <p className="font-medium">{lease.renewalTermMonths} months</p>
              </div>
            )}
            <div>
              <Label>Early Termination Allowed</Label>
              <p className="font-medium">{lease.earlyTerminationAllowed ? 'Yes' : 'No'}</p>
            </div>
            {lease.terminationNoticeDays && (
              <div>
                <Label>Termination Notice</Label>
                <p className="font-medium">{lease.terminationNoticeDays} days</p>
              </div>
            )}
            {lease.leaseAgreementReference && (
              <div>
                <Label>Agreement Reference</Label>
                <p className="font-medium">{lease.leaseAgreementReference}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Termination Information */}
      {lease.terminatedAt && (
        <Card>
          <CardHeader>
            <CardTitle>Termination Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Termination Date</Label>
                <p className="font-medium">
                  {new Date(lease.terminatedAt).toLocaleDateString()}
                </p>
              </div>
              {lease.terminationReason && (
                <div>
                  <Label>Termination Reason</Label>
                  <p className="font-medium">{lease.terminationReason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terminate Lease */}
      {lease.status === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Terminate Lease</CardTitle>
            <CardDescription>Terminate or discharge this lease</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="terminationDate">Termination Date *</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="terminationReason">Termination Reason</Label>
              <Textarea
                id="terminationReason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="Enter reason for termination..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="terminationReference">Termination Reference</Label>
              <Input
                id="terminationReference"
                value={terminationReference}
                onChange={(e) => setTerminationReference(e.target.value)}
                placeholder="Enter termination reference number"
              />
            </div>
            <Button
              onClick={handleDischarge}
              disabled={discharging || !terminationDate}
              variant="destructive"
            >
              {discharging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Terminating...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Terminate Lease
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

