/**
 * Create Dispute Page
 * Interface for creating dispute records
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { CheckCircle2, AlertTriangle, Loader2, Scale } from 'lucide-react'

interface DisputeFormData {
  disputeType: 'boundary' | 'ownership' | 'rights' | 'amendment' | 'lease' | 'mortgage' | 'other'
  titleId?: string
  schemeId?: string
  amendmentId?: string
  complainantName: string
  complainantIdNumber?: string
  complainantContactEmail?: string
  complainantContactPhone?: string
  complainantAddress?: string
  respondentName?: string
  respondentIdNumber?: string
  respondentContactEmail?: string
  respondentContactPhone?: string
  description: string
  requestedResolution?: string
}

export default function CreateDisputePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<DisputeFormData>({
    disputeType: 'boundary',
    titleId: '',
    schemeId: '',
    amendmentId: '',
    complainantName: '',
    complainantIdNumber: '',
    complainantContactEmail: '',
    complainantContactPhone: '',
    complainantAddress: '',
    respondentName: '',
    respondentIdNumber: '',
    respondentContactEmail: '',
    respondentContactPhone: '',
    description: '',
    requestedResolution: '',
  })

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/operations/disputes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Dispute created successfully. Dispute ID: ${data.disputeId}`)
        setTimeout(() => {
          router.push('/operations/disputes')
        }, 3000)
      } else {
        setError(data.error || 'Failed to create dispute')
      }
    } catch (err) {
      setError('Failed to create dispute')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Dispute</h1>
          <p className="text-muted-foreground mt-2">
            Create a dispute record for resolution through appropriate authorities
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

      {/* Dispute Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dispute Information</CardTitle>
          <CardDescription>Provide details about the dispute</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="disputeType">Dispute Type *</Label>
            <Select
              value={formData.disputeType}
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  disputeType: val as DisputeFormData['disputeType'],
                })
              }
            >
              <SelectTrigger id="disputeType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boundary">Boundary</SelectItem>
                <SelectItem value="ownership">Ownership</SelectItem>
                <SelectItem value="rights">Rights</SelectItem>
                <SelectItem value="amendment">Amendment</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="mortgage">Mortgage</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* References */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">References (At least one required)</h3>

            <div>
              <Label htmlFor="titleId">Title ID</Label>
              <Input
                id="titleId"
                value={formData.titleId || ''}
                onChange={(e) => setFormData({ ...formData, titleId: e.target.value })}
                placeholder="Enter title ID"
              />
            </div>

            <div>
              <Label htmlFor="schemeId">Scheme ID</Label>
              <Input
                id="schemeId"
                value={formData.schemeId || ''}
                onChange={(e) => setFormData({ ...formData, schemeId: e.target.value })}
                placeholder="Enter scheme ID"
              />
            </div>

            <div>
              <Label htmlFor="amendmentId">Amendment ID</Label>
              <Input
                id="amendmentId"
                value={formData.amendmentId || ''}
                onChange={(e) => setFormData({ ...formData, amendmentId: e.target.value })}
                placeholder="Enter amendment ID"
              />
            </div>
          </div>

          {/* Complainant Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Complainant Information</h3>

            <div>
              <Label htmlFor="complainantName">Complainant Name *</Label>
              <Input
                id="complainantName"
                value={formData.complainantName}
                onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                placeholder="Enter complainant name"
                required
              />
            </div>

            <div>
              <Label htmlFor="complainantIdNumber">ID Number</Label>
              <Input
                id="complainantIdNumber"
                value={formData.complainantIdNumber || ''}
                onChange={(e) =>
                  setFormData({ ...formData, complainantIdNumber: e.target.value })
                }
                placeholder="Enter ID number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="complainantContactEmail">Contact Email</Label>
                <Input
                  id="complainantContactEmail"
                  type="email"
                  value={formData.complainantContactEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, complainantContactEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="complainantContactPhone">Contact Phone</Label>
                <Input
                  id="complainantContactPhone"
                  value={formData.complainantContactPhone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, complainantContactPhone: e.target.value })
                  }
                  placeholder="+263..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="complainantAddress">Address</Label>
              <Textarea
                id="complainantAddress"
                value={formData.complainantAddress || ''}
                onChange={(e) => setFormData({ ...formData, complainantAddress: e.target.value })}
                placeholder="Enter address"
                rows={3}
              />
            </div>
          </div>

          {/* Respondent Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Respondent Information (Optional)</h3>

            <div>
              <Label htmlFor="respondentName">Respondent Name</Label>
              <Input
                id="respondentName"
                value={formData.respondentName || ''}
                onChange={(e) => setFormData({ ...formData, respondentName: e.target.value })}
                placeholder="Enter respondent name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="respondentIdNumber">ID Number</Label>
                <Input
                  id="respondentIdNumber"
                  value={formData.respondentIdNumber || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, respondentIdNumber: e.target.value })
                  }
                  placeholder="Enter ID number"
                />
              </div>
              <div>
                <Label htmlFor="respondentContactEmail">Contact Email</Label>
                <Input
                  id="respondentContactEmail"
                  type="email"
                  value={formData.respondentContactEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, respondentContactEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Dispute Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Dispute Details</h3>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of the dispute (minimum 50 characters)..."
                rows={8}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.description.length} characters
              </p>
            </div>

            <div>
              <Label htmlFor="requestedResolution">Requested Resolution</Label>
              <Textarea
                id="requestedResolution"
                value={formData.requestedResolution || ''}
                onChange={(e) =>
                  setFormData({ ...formData, requestedResolution: e.target.value })
                }
                placeholder="Describe the resolution you are seeking..."
                rows={4}
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
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !formData.complainantName.trim() ||
                formData.description.length < 50 ||
                (!formData.titleId && !formData.schemeId && !formData.amendmentId)
              }
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Create Dispute
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

