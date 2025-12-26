/**
 * Mortgage Detail Page
 * Interface for viewing and managing a specific mortgage
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
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Shield } from 'lucide-react'

interface MortgageDetails {
  id: string
  mortgageNumber: string
  titleId: string
  lenderName: string
  lenderType: string
  lenderRegistrationNumber?: string
  lenderContactEmail?: string
  lenderContactPhone?: string
  borrowerName: string
  mortgageAmount: number
  mortgageCurrency: string
  interestRate?: number
  termMonths?: number
  mortgageDate: string
  registrationDate: string
  effectiveDate: string
  expiryDate?: string
  status: string
  priority: number
  dischargeDate?: string
  dischargeReference?: string
}

export default function MortgageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mortgageId = params.id as string

  const [mortgage, setMortgage] = useState<MortgageDetails | null>(null)
  const [dischargeDate, setDischargeDate] = useState('')
  const [dischargeReference, setDischargeReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [discharging, setDischarging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadMortgageDetails()
  }, [mortgageId])

  async function loadMortgageDetails() {
    try {
      const response = await fetch(`/api/operations/mortgages/${mortgageId}`)
      const data = await response.json()

      if (data.success) {
        const m = data.mortgage as any
        setMortgage({
          id: m.id,
          mortgageNumber: m.mortgage_number,
          titleId: m.title_id,
          lenderName: m.lender_name,
          lenderType: m.lender_type,
          lenderRegistrationNumber: m.lender_registration_number,
          lenderContactEmail: m.lender_contact_email,
          lenderContactPhone: m.lender_contact_phone,
          borrowerName: m.borrower_name,
          mortgageAmount: m.mortgage_amount,
          mortgageCurrency: m.mortgage_currency || 'USD',
          interestRate: m.interest_rate,
          termMonths: m.term_months,
          mortgageDate: m.mortgage_date,
          registrationDate: m.registration_date,
          effectiveDate: m.effective_date,
          expiryDate: m.expiry_date,
          status: m.status,
          priority: 0, // Would need to calculate from API
          dischargeDate: m.discharged_at,
          dischargeReference: m.discharge_reference,
        })
      } else {
        setError(data.error || 'Failed to load mortgage details')
      }
    } catch (err) {
      setError('Failed to load mortgage details')
    } finally {
      setLoading(false)
    }
  }

  async function handleDischarge() {
    if (!dischargeDate) {
      setError('Please provide a discharge date')
      return
    }

    setDischarging(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/mortgages/${mortgageId}/discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dischargeDate,
          dischargeReference: dischargeReference || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Mortgage discharged successfully')
        setTimeout(() => {
          router.push('/operations/mortgages')
        }, 2000)
      } else {
        setError(data.error || 'Failed to discharge mortgage')
      }
    } catch (err) {
      setError('Failed to discharge mortgage')
    } finally {
      setDischarging(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading mortgage details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !mortgage) {
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

  if (!mortgage) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mortgage Details</h1>
          <p className="text-muted-foreground mt-2">
            Mortgage Number: {mortgage.mortgageNumber}
          </p>
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

      {/* Mortgage Information */}
      <Card>
        <CardHeader>
          <CardTitle>Mortgage Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mortgage Number</Label>
              <p className="font-medium">{mortgage.mortgageNumber}</p>
            </div>
            <div>
              <Label>Status</Label>
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
            </div>
            <div>
              <Label>Title ID</Label>
              <p className="font-medium">{mortgage.titleId.substring(0, 8)}...</p>
            </div>
            {mortgage.priority > 0 && (
              <div>
                <Label>Priority</Label>
                <Badge variant="secondary">Priority {mortgage.priority}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lender Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lender Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lender Name</Label>
              <p className="font-medium">{mortgage.lenderName}</p>
            </div>
            <div>
              <Label>Lender Type</Label>
              <p className="font-medium">{mortgage.lenderType}</p>
            </div>
            {mortgage.lenderRegistrationNumber && (
              <div>
                <Label>Registration Number</Label>
                <p className="font-medium">{mortgage.lenderRegistrationNumber}</p>
              </div>
            )}
            {mortgage.lenderContactEmail && (
              <div>
                <Label>Contact Email</Label>
                <p className="font-medium">{mortgage.lenderContactEmail}</p>
              </div>
            )}
            {mortgage.lenderContactPhone && (
              <div>
                <Label>Contact Phone</Label>
                <p className="font-medium">{mortgage.lenderContactPhone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Borrower Information */}
      <Card>
        <CardHeader>
          <CardTitle>Borrower Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Borrower Name</Label>
            <p className="font-medium">{mortgage.borrowerName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Mortgage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Mortgage Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mortgage Amount</Label>
              <p className="font-medium">
                {mortgage.mortgageCurrency} {mortgage.mortgageAmount.toLocaleString()}
              </p>
            </div>
            {mortgage.interestRate && (
              <div>
                <Label>Interest Rate</Label>
                <p className="font-medium">{mortgage.interestRate}%</p>
              </div>
            )}
            {mortgage.termMonths && (
              <div>
                <Label>Term</Label>
                <p className="font-medium">{mortgage.termMonths} months</p>
              </div>
            )}
            <div>
              <Label>Mortgage Date</Label>
              <p className="font-medium">
                {new Date(mortgage.mortgageDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label>Registration Date</Label>
              <p className="font-medium">
                {new Date(mortgage.registrationDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label>Effective Date</Label>
              <p className="font-medium">
                {new Date(mortgage.effectiveDate).toLocaleDateString()}
              </p>
            </div>
            {mortgage.expiryDate && (
              <div>
                <Label>Expiry Date</Label>
                <p className="font-medium">
                  {new Date(mortgage.expiryDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {mortgage.dischargeDate && (
              <div>
                <Label>Discharge Date</Label>
                <p className="font-medium">
                  {new Date(mortgage.dischargeDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {mortgage.dischargeReference && (
              <div>
                <Label>Discharge Reference</Label>
                <p className="font-medium">{mortgage.dischargeReference}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discharge Mortgage */}
      {mortgage.status === 'registered' && (
        <Card>
          <CardHeader>
            <CardTitle>Discharge Mortgage</CardTitle>
            <CardDescription>Discharge or terminate this mortgage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dischargeDate">Discharge Date *</Label>
              <Input
                id="dischargeDate"
                type="date"
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="dischargeReference">Discharge Reference</Label>
              <Input
                id="dischargeReference"
                value={dischargeReference}
                onChange={(e) => setDischargeReference(e.target.value)}
                placeholder="Enter discharge reference number"
              />
            </div>
            <Button
              onClick={handleDischarge}
              disabled={discharging || !dischargeDate}
              variant="destructive"
            >
              {discharging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discharging...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Discharge Mortgage
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

