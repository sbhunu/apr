/**
 * Transfer Review Page
 * Interface for reviewing and processing ownership transfers
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface TransferDetails {
  id: string
  titleNumber: string
  transferType: string
  currentHolder: string
  newHolder: string
  newHolderType: string
  newHolderIdNumber?: string
  considerationAmount?: number
  considerationCurrency: string
  transferDate: string
  effectiveDate: string
  transferInstrumentType: string
  transferInstrumentReference?: string
  status: string
  stampDuty?: number
  validationErrors: string[]
  validationWarnings: string[]
}

export default function TransferReviewPage() {
  const params = useParams()
  const router = useRouter()
  const transferId = params.id as string

  const [transfer, setTransfer] = useState<TransferDetails | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadTransferDetails()
  }, [transferId])

  async function loadTransferDetails() {
    try {
      const response = await fetch(`/api/operations/transfers/${transferId}`)
      const data = await response.json()

      if (data.success) {
        setTransfer(data.transfer)
      } else {
        setError(data.error || 'Failed to load transfer details')
      }
    } catch (err) {
      setError('Failed to load transfer details')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!reviewNotes.trim()) {
      setError('Please provide review notes')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/transfers/${transferId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Transfer approved')
        setTimeout(() => {
          router.push('/operations/transfers')
        }, 2000)
      } else {
        setError(data.error || 'Failed to approve transfer')
      }
    } catch (err) {
      setError('Failed to approve transfer')
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!reviewNotes.trim()) {
      setError('Please provide a rejection reason')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/transfers/${transferId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reviewNotes }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Transfer rejected')
        setTimeout(() => {
          router.push('/operations/transfers')
        }, 2000)
      } else {
        setError(data.error || 'Failed to reject transfer')
      }
    } catch (err) {
      setError('Failed to reject transfer')
    } finally {
      setProcessing(false)
    }
  }

  async function handleProcess() {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/operations/transfers/${transferId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(
          `Transfer processed successfully. New certificate: ${data.newCertificateUrl ? 'Generated' : 'Pending'}`
        )
        setTimeout(() => {
          router.push('/operations/transfers')
        }, 3000)
      } else {
        setError(data.error || 'Failed to process transfer')
      }
    } catch (err) {
      setError('Failed to process transfer')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading transfer details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !transfer) {
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

  if (!transfer) {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Transfer</h1>
          <p className="text-muted-foreground mt-2">
            Transfer ID: {transferId.substring(0, 8)}...
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

      {/* Transfer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title Number</Label>
              <p className="font-medium">{transfer.titleNumber}</p>
            </div>
            <div>
              <Label>Transfer Type</Label>
              <Badge>{transfer.transferType}</Badge>
            </div>
            <div>
              <Label>Current Holder</Label>
              <p className="font-medium">{transfer.currentHolder}</p>
            </div>
            <div>
              <Label>New Holder</Label>
              <p className="font-medium">{transfer.newHolder}</p>
            </div>
            <div>
              <Label>New Holder Type</Label>
              <p className="font-medium">{transfer.newHolderType}</p>
            </div>
            {transfer.newHolderIdNumber && (
              <div>
                <Label>New Holder ID Number</Label>
                <p className="font-medium">{transfer.newHolderIdNumber}</p>
              </div>
            )}
            {transfer.considerationAmount && (
              <div>
                <Label>Consideration Amount</Label>
                <p className="font-medium">
                  {transfer.considerationCurrency} {transfer.considerationAmount.toLocaleString()}
                </p>
              </div>
            )}
            {transfer.stampDuty && (
              <div>
                <Label>Stamp Duty</Label>
                <p className="font-medium">
                  {transfer.considerationCurrency} {transfer.stampDuty.toFixed(2)}
                </p>
              </div>
            )}
            <div>
              <Label>Transfer Date</Label>
              <p className="font-medium">
                {new Date(transfer.transferDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label>Effective Date</Label>
              <p className="font-medium">
                {new Date(transfer.effectiveDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label>Transfer Instrument</Label>
              <p className="font-medium">{transfer.transferInstrumentType}</p>
            </div>
            {transfer.transferInstrumentReference && (
              <div>
                <Label>Instrument Reference</Label>
                <p className="font-medium">{transfer.transferInstrumentReference}</p>
              </div>
            )}
            <div>
              <Label>Status</Label>
              <Badge variant={transfer.status === 'approved' ? 'default' : 'outline'}>
                {transfer.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {(transfer.validationErrors.length > 0 || transfer.validationWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transfer.validationErrors.length > 0 && (
              <div>
                <Label className="text-destructive">Errors:</Label>
                <ul className="list-disc list-inside space-y-1">
                  {transfer.validationErrors.map((err, index) => (
                    <li key={index} className="text-sm text-destructive">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {transfer.validationWarnings.length > 0 && (
              <div>
                <Label>Warnings:</Label>
                <ul className="list-disc list-inside space-y-1">
                  {transfer.validationWarnings.map((warn, index) => (
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

      {/* Review Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Review Notes</CardTitle>
          <CardDescription>Add notes or comments about this transfer</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Enter review notes..."
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {transfer.status === 'submitted' && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={processing || !reviewNotes.trim()}
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={processing || !reviewNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            {transfer.status === 'approved' && (
              <Button onClick={handleProcess} disabled={processing} className="flex-1">
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Process Transfer
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

