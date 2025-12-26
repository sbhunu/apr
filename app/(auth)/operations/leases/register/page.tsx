/**
 * Lease Registration Page
 * Interface for registering leases on sectional titles
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface LeaseFormData {
  titleId: string
  lesseeName: string
  lesseeType: 'individual' | 'company' | 'trust' | 'government' | 'other'
  lesseeIdNumber?: string
  lesseeContactEmail?: string
  lesseeContactPhone?: string
  leaseStartDate: string
  leaseEndDate: string
  monthlyRent?: number
  rentCurrency: string
  depositAmount?: number
  renewalOption: boolean
  renewalTermMonths?: number
  earlyTerminationAllowed: boolean
  terminationNoticeDays?: number
  leaseAgreementReference?: string
}

export default function RegisterLeasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<LeaseFormData>({
    titleId: '',
    lesseeName: '',
    lesseeType: 'individual',
    lesseeIdNumber: '',
    lesseeContactEmail: '',
    lesseeContactPhone: '',
    leaseStartDate: new Date().toISOString().split('T')[0],
    leaseEndDate: '',
    monthlyRent: undefined,
    rentCurrency: 'USD',
    depositAmount: undefined,
    renewalOption: false,
    renewalTermMonths: undefined,
    earlyTerminationAllowed: false,
    terminationNoticeDays: undefined,
    leaseAgreementReference: '',
  })

  // Calculate end date when start date or term changes
  const calculateEndDate = (startDate: string, months: number) => {
    if (!startDate || !months) return ''
    const start = new Date(startDate)
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)
    return end.toISOString().split('T')[0]
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/operations/leases/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Lease registered successfully. Lease Number: ${data.leaseNumber}`)
        setTimeout(() => {
          router.push('/operations/leases')
        }, 3000)
      } else {
        setError(data.error || 'Failed to register lease')
      }
    } catch (err) {
      setError('Failed to register lease')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Register Lease</h1>
          <p className="text-muted-foreground mt-2">
            Register a long-term lease on a registered sectional title
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

      {/* Lease Form */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Information</CardTitle>
          <CardDescription>Provide details about the lease</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="titleId">Title ID *</Label>
            <Input
              id="titleId"
              value={formData.titleId}
              onChange={(e) => setFormData({ ...formData, titleId: e.target.value })}
              placeholder="Enter title ID"
              required
            />
          </div>

          {/* Lessee Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Lessee Information</h3>

            <div>
              <Label htmlFor="lesseeName">Lessee Name *</Label>
              <Input
                id="lesseeName"
                value={formData.lesseeName}
                onChange={(e) => setFormData({ ...formData, lesseeName: e.target.value })}
                placeholder="Enter lessee name"
                required
              />
            </div>

            <div>
              <Label htmlFor="lesseeType">Lessee Type *</Label>
              <Select
                value={formData.lesseeType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    lesseeType: val as LeaseFormData['lesseeType'],
                  })
                }
              >
                <SelectTrigger id="lesseeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lesseeIdNumber">
                {formData.lesseeType === 'individual'
                  ? 'National ID Number'
                  : formData.lesseeType === 'company'
                    ? 'Company Registration Number'
                    : 'ID Number'}
              </Label>
              <Input
                id="lesseeIdNumber"
                value={formData.lesseeIdNumber || ''}
                onChange={(e) => setFormData({ ...formData, lesseeIdNumber: e.target.value })}
                placeholder={
                  formData.lesseeType === 'individual'
                    ? 'Enter national ID number'
                    : formData.lesseeType === 'company'
                      ? 'Enter company registration number'
                      : 'Enter ID number'
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lesseeContactEmail">Contact Email</Label>
                <Input
                  id="lesseeContactEmail"
                  type="email"
                  value={formData.lesseeContactEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, lesseeContactEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="lesseeContactPhone">Contact Phone</Label>
                <Input
                  id="lesseeContactPhone"
                  value={formData.lesseeContactPhone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, lesseeContactPhone: e.target.value })
                  }
                  placeholder="+263..."
                />
              </div>
            </div>
          </div>

          {/* Lease Dates */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Lease Dates</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaseStartDate">Start Date *</Label>
                <Input
                  id="leaseStartDate"
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="leaseEndDate">End Date *</Label>
                <Input
                  id="leaseEndDate"
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Rent Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Rent Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  step="0.01"
                  value={formData.monthlyRent || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyRent: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="rentCurrency">Currency</Label>
                <Select
                  value={formData.rentCurrency}
                  onValueChange={(val) => setFormData({ ...formData, rentCurrency: val })}
                >
                  <SelectTrigger id="rentCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ZWL">ZWL</SelectItem>
                    <SelectItem value="ZAR">ZAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="depositAmount">Deposit Amount</Label>
              <Input
                id="depositAmount"
                type="number"
                step="0.01"
                value={formData.depositAmount || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    depositAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Lease Terms */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Lease Terms</h3>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="renewalOption"
                checked={formData.renewalOption}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, renewalOption: checked === true })
                }
              />
              <Label htmlFor="renewalOption" className="cursor-pointer">
                Renewal Option Available
              </Label>
            </div>

            {formData.renewalOption && (
              <div>
                <Label htmlFor="renewalTermMonths">Renewal Term (Months)</Label>
                <Input
                  id="renewalTermMonths"
                  type="number"
                  value={formData.renewalTermMonths || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      renewalTermMonths: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="12"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="earlyTerminationAllowed"
                checked={formData.earlyTerminationAllowed}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, earlyTerminationAllowed: checked === true })
                }
              />
              <Label htmlFor="earlyTerminationAllowed" className="cursor-pointer">
                Early Termination Allowed
              </Label>
            </div>

            {formData.earlyTerminationAllowed && (
              <div>
                <Label htmlFor="terminationNoticeDays">Termination Notice (Days)</Label>
                <Input
                  id="terminationNoticeDays"
                  type="number"
                  value={formData.terminationNoticeDays || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      terminationNoticeDays: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="30"
                />
              </div>
            )}
          </div>

          {/* Lease Agreement */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Lease Agreement</h3>

            <div>
              <Label htmlFor="leaseAgreementReference">Agreement Reference</Label>
              <Input
                id="leaseAgreementReference"
                value={formData.leaseAgreementReference || ''}
                onChange={(e) =>
                  setFormData({ ...formData, leaseAgreementReference: e.target.value })
                }
                placeholder="Enter agreement reference number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Button onClick={() => router.back()} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Register Lease
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

