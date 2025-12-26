/**
 * Submit Transfer Page
 * Interface for submitting ownership transfers
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TransferSubmissionData,
  validateTransferSubmission,
} from '@/lib/operations/transfers'
import { calculateStampDuty } from '@/lib/operations/stamp-duty'
import { CheckCircle2, AlertTriangle, FileText, Loader2 } from 'lucide-react'

export default function SubmitTransferPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [stampDuty, setStampDuty] = useState<number | undefined>()

  const [formData, setFormData] = useState<TransferSubmissionData>({
    titleId: '',
    transferType: 'sale',
    newHolderName: '',
    newHolderType: 'individual',
    newHolderIdNumber: '',
    considerationAmount: undefined,
    considerationCurrency: 'USD',
    transferDate: new Date().toISOString().split('T')[0],
    effectiveDate: new Date().toISOString().split('T')[0],
    transferInstrumentType: 'deed_of_sale',
    transferInstrumentReference: '',
    notes: '',
  })

  async function handleValidate() {
    setValidating(true)
    setValidationErrors([])
    setValidationWarnings([])
    setStampDuty(undefined)

    try {
      const response = await fetch('/api/operations/transfers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setValidationErrors(data.errors || [])
        setValidationWarnings(data.warnings || [])
        setStampDuty(data.stampDuty)
      } else {
        setError(data.error || 'Validation failed')
      }
    } catch (err) {
      setError('Failed to validate transfer')
    } finally {
      setValidating(false)
    }
  }

  async function handleSubmit() {
    if (validationErrors.length > 0) {
      setError('Please resolve validation errors before submitting')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/operations/transfers/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Transfer submitted successfully. Transfer ID: ${data.transferId}`)
        setTimeout(() => {
          router.push('/operations/transfers')
        }, 3000)
      } else {
        setError(data.error || 'Failed to submit transfer')
      }
    } catch (err) {
      setError('Failed to submit transfer')
    } finally {
      setLoading(false)
    }
  }

  // Calculate stamp duty when consideration amount changes
  useEffect(() => {
    if (formData.considerationAmount && formData.considerationAmount > 0) {
      const calculation = calculateStampDuty(
        formData.transferType,
        formData.considerationAmount,
        formData.considerationCurrency
      )
      setStampDuty(calculation.amount)
    } else {
      setStampDuty(undefined)
    }
  }, [formData.considerationAmount, formData.transferType, formData.considerationCurrency])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Submit Ownership Transfer</h1>
          <p className="text-muted-foreground mt-2">
            Submit a transfer of ownership for a registered title
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

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Information</CardTitle>
          <CardDescription>
            Provide details about the ownership transfer
          </CardDescription>
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

          <div>
            <Label htmlFor="transferType">Transfer Type *</Label>
            <Select
              value={formData.transferType}
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  transferType: val as TransferSubmissionData['transferType'],
                })
              }
            >
              <SelectTrigger id="transferType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="inheritance">Inheritance</SelectItem>
                <SelectItem value="gift">Gift</SelectItem>
                <SelectItem value="court_order">Court Order</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transferDate">Transfer Date *</Label>
              <Input
                id="transferDate"
                type="date"
                value={formData.transferDate}
                onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
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

          {/* New Holder Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">New Holder Information</h3>

            <div>
              <Label htmlFor="newHolderName">New Holder Name *</Label>
              <Input
                id="newHolderName"
                value={formData.newHolderName}
                onChange={(e) =>
                  setFormData({ ...formData, newHolderName: e.target.value })
                }
                placeholder="Enter new holder name"
                required
              />
            </div>

            <div>
              <Label htmlFor="newHolderType">New Holder Type *</Label>
              <Select
                value={formData.newHolderType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    newHolderType: val as TransferSubmissionData['newHolderType'],
                  })
                }
              >
                <SelectTrigger id="newHolderType">
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
              <Label htmlFor="newHolderIdNumber">
                {formData.newHolderType === 'individual'
                  ? 'National ID Number'
                  : formData.newHolderType === 'company'
                    ? 'Company Registration Number'
                    : 'ID Number'}
              </Label>
              <Input
                id="newHolderIdNumber"
                value={formData.newHolderIdNumber || ''}
                onChange={(e) =>
                  setFormData({ ...formData, newHolderIdNumber: e.target.value })
                }
                placeholder={
                  formData.newHolderType === 'individual'
                    ? 'Enter national ID number'
                    : formData.newHolderType === 'company'
                      ? 'Enter company registration number'
                      : 'Enter ID number'
                }
              />
            </div>
          </div>

          {/* Consideration */}
          {formData.transferType === 'sale' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Consideration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="considerationAmount">Consideration Amount</Label>
                  <Input
                    id="considerationAmount"
                    type="number"
                    step="0.01"
                    value={formData.considerationAmount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        considerationAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="considerationCurrency">Currency</Label>
                  <Select
                    value={formData.considerationCurrency}
                    onValueChange={(val) =>
                      setFormData({ ...formData, considerationCurrency: val })
                    }
                  >
                    <SelectTrigger id="considerationCurrency">
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

              {stampDuty !== undefined && (
                <Alert>
                  <AlertTitle>Estimated Stamp Duty</AlertTitle>
                  <AlertDescription>
                    {formData.considerationCurrency} {stampDuty.toFixed(2)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Transfer Instrument */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Transfer Instrument</h3>

            <div>
              <Label htmlFor="transferInstrumentType">Instrument Type *</Label>
              <Select
                value={formData.transferInstrumentType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    transferInstrumentType: val as TransferSubmissionData['transferInstrumentType'],
                  })
                }
              >
                <SelectTrigger id="transferInstrumentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deed_of_sale">Deed of Sale</SelectItem>
                  <SelectItem value="will">Will</SelectItem>
                  <SelectItem value="gift_deed">Gift Deed</SelectItem>
                  <SelectItem value="court_order">Court Order</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transferInstrumentReference">Instrument Reference</Label>
              <Input
                id="transferInstrumentReference"
                value={formData.transferInstrumentReference || ''}
                onChange={(e) =>
                  setFormData({ ...formData, transferInstrumentReference: e.target.value })
                }
                placeholder="Enter instrument reference number"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {validationErrors.length > 0 && (
              <div>
                <Label className="text-destructive">Errors:</Label>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((err, index) => (
                    <li key={index} className="text-sm text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div>
                <Label>Warnings:</Label>
                <ul className="list-disc list-inside space-y-1">
                  {validationWarnings.map((warn, index) => (
                    <li key={index} className="text-sm">
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Button onClick={handleValidate} disabled={validating} variant="outline">
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Validate
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || validationErrors.length > 0}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submit Transfer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

