/**
 * Mortgage Registration Page
 * Interface for registering mortgages/charges on sectional titles
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface MortgageFormData {
  titleId: string
  lenderName: string
  lenderType: 'bank' | 'financial_institution' | 'private_lender' | 'government' | 'other'
  lenderRegistrationNumber?: string
  lenderContactEmail?: string
  lenderContactPhone?: string
  mortgageAmount: number
  mortgageCurrency: string
  interestRate?: number
  termMonths?: number
  mortgageDate: string
  registrationDate: string
  effectiveDate: string
  expiryDate?: string
  mortgageDeedReference?: string
}

export default function RegisterMortgagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<MortgageFormData>({
    titleId: '',
    lenderName: '',
    lenderType: 'bank',
    lenderRegistrationNumber: '',
    lenderContactEmail: '',
    lenderContactPhone: '',
    mortgageAmount: 0,
    mortgageCurrency: 'USD',
    interestRate: undefined,
    termMonths: undefined,
    mortgageDate: new Date().toISOString().split('T')[0],
    registrationDate: new Date().toISOString().split('T')[0],
    effectiveDate: new Date().toISOString().split('T')[0],
    expiryDate: undefined,
    mortgageDeedReference: '',
  })

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/operations/mortgages/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(
          `Mortgage registered successfully. Mortgage Number: ${data.mortgageNumber}, Priority: ${data.priority}`
        )
        setTimeout(() => {
          router.push('/operations/mortgages')
        }, 3000)
      } else {
        setError(data.error || 'Failed to register mortgage')
      }
    } catch (err) {
      setError('Failed to register mortgage')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Register Mortgage</h1>
          <p className="text-muted-foreground mt-2">
            Register a mortgage or charge against a registered sectional title
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

      {/* Mortgage Form */}
      <Card>
        <CardHeader>
          <CardTitle>Mortgage Information</CardTitle>
          <CardDescription>Provide details about the mortgage or charge</CardDescription>
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

          {/* Lender Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Lender Information</h3>

            <div>
              <Label htmlFor="lenderName">Lender Name *</Label>
              <Input
                id="lenderName"
                value={formData.lenderName}
                onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                placeholder="Enter lender name"
                required
              />
            </div>

            <div>
              <Label htmlFor="lenderType">Lender Type *</Label>
              <Select
                value={formData.lenderType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    lenderType: val as MortgageFormData['lenderType'],
                  })
                }
              >
                <SelectTrigger id="lenderType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="financial_institution">Financial Institution</SelectItem>
                  <SelectItem value="private_lender">Private Lender</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lenderRegistrationNumber">Registration Number</Label>
              <Input
                id="lenderRegistrationNumber"
                value={formData.lenderRegistrationNumber || ''}
                onChange={(e) =>
                  setFormData({ ...formData, lenderRegistrationNumber: e.target.value })
                }
                placeholder="Enter registration number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lenderContactEmail">Contact Email</Label>
                <Input
                  id="lenderContactEmail"
                  type="email"
                  value={formData.lenderContactEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, lenderContactEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="lenderContactPhone">Contact Phone</Label>
                <Input
                  id="lenderContactPhone"
                  value={formData.lenderContactPhone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, lenderContactPhone: e.target.value })
                  }
                  placeholder="+263..."
                />
              </div>
            </div>
          </div>

          {/* Mortgage Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Mortgage Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mortgageAmount">Mortgage Amount *</Label>
                <Input
                  id="mortgageAmount"
                  type="number"
                  step="0.01"
                  value={formData.mortgageAmount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mortgageAmount: e.target.value ? parseFloat(e.target.value) : 0,
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="mortgageCurrency">Currency *</Label>
                <Select
                  value={formData.mortgageCurrency}
                  onValueChange={(val) => setFormData({ ...formData, mortgageCurrency: val })}
                >
                  <SelectTrigger id="mortgageCurrency">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={formData.interestRate || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interestRate: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="termMonths">Term (Months)</Label>
                <Input
                  id="termMonths"
                  type="number"
                  value={formData.termMonths || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      termMonths: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="12"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Dates</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="mortgageDate">Mortgage Date *</Label>
                <Input
                  id="mortgageDate"
                  type="date"
                  value={formData.mortgageDate}
                  onChange={(e) => setFormData({ ...formData, mortgageDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="registrationDate">Registration Date *</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={formData.registrationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, registrationDate: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="effectiveDate">Effective Date *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate || ''}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          {/* Mortgage Deed */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Mortgage Deed</h3>

            <div>
              <Label htmlFor="mortgageDeedReference">Deed Reference</Label>
              <Input
                id="mortgageDeedReference"
                value={formData.mortgageDeedReference || ''}
                onChange={(e) =>
                  setFormData({ ...formData, mortgageDeedReference: e.target.value })
                }
                placeholder="Enter deed reference number"
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
                  Register Mortgage
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

