/**
 * Submit Objection Page
 * Interface for submitting objections during the objection window
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { CheckCircle2, AlertTriangle, Loader2, Calendar } from 'lucide-react'

interface ObjectionFormData {
  planningPlanId: string
  objectorName: string
  objectorIdNumber?: string
  objectorContactEmail?: string
  objectorContactPhone?: string
  objectorAddress?: string
  objectionType: 'boundary' | 'rights' | 'environmental' | 'access' | 'other'
  description: string
}

export default function SubmitObjectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planningPlanId = searchParams.get('planId') || ''

  const [loading, setLoading] = useState(false)
  const [checkingWindow, setCheckingWindow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [windowInfo, setWindowInfo] = useState<{
    withinWindow: boolean
    windowEnd?: string
    daysRemaining?: number
  } | null>(null)

  const [formData, setFormData] = useState<ObjectionFormData>({
    planningPlanId,
    objectorName: '',
    objectorIdNumber: '',
    objectorContactEmail: '',
    objectorContactPhone: '',
    objectorAddress: '',
    objectionType: 'boundary',
    description: '',
  })

  useEffect(() => {
    if (planningPlanId) {
      checkObjectionWindow()
    }
  }, [planningPlanId])

  async function checkObjectionWindow() {
    if (!planningPlanId) return

    try {
      const response = await fetch(`/api/operations/objections/check-window/${planningPlanId}`)
      const data = await response.json()

      if (data.success) {
        setWindowInfo({
          withinWindow: data.withinWindow,
          windowEnd: data.windowEnd,
          daysRemaining: data.daysRemaining,
        })
      }
    } catch (err) {
      // Silently fail - window check is informational
    } finally {
      setCheckingWindow(false)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/operations/objections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Objection submitted successfully. Objection ID: ${data.objectionId}`)
        setTimeout(() => {
          router.push('/operations/objections')
        }, 3000)
      } else {
        setError(data.error || 'Failed to submit objection')
      }
    } catch (err) {
      setError('Failed to submit objection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Submit Objection</h1>
          <p className="text-muted-foreground mt-2">
            Submit an objection during the 30-day objection window
          </p>
        </div>
      </div>

      {checkingWindow && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Checking Objection Window</AlertTitle>
          <AlertDescription>Verifying if objection window is open...</AlertDescription>
        </Alert>
      )}

      {windowInfo && !windowInfo.withinWindow && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Objection Window Closed</AlertTitle>
          <AlertDescription>
            The objection window for this planning plan has closed. Objections must be submitted
            within 30 days of plan submission. Window ended on{' '}
            {windowInfo.windowEnd ? new Date(windowInfo.windowEnd).toLocaleDateString() : 'N/A'}.
          </AlertDescription>
        </Alert>
      )}

      {windowInfo && windowInfo.withinWindow && windowInfo.daysRemaining !== undefined && windowInfo.daysRemaining <= 7 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>Objection Window Closing Soon</AlertTitle>
          <AlertDescription>
            The objection window closes in {windowInfo.daysRemaining} day(s). Submit your objection
            soon to ensure it is considered.
          </AlertDescription>
        </Alert>
      )}

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

      {/* Objection Form */}
      <Card>
        <CardHeader>
          <CardTitle>Objection Information</CardTitle>
          <CardDescription>
            Provide details about your objection to the planning plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="planningPlanId">Planning Plan ID *</Label>
            <Input
              id="planningPlanId"
              value={formData.planningPlanId}
              onChange={(e) => setFormData({ ...formData, planningPlanId: e.target.value })}
              placeholder="Enter planning plan ID"
              required
              disabled={!!planningPlanId}
            />
          </div>

          {/* Objector Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Objector Information</h3>

            <div>
              <Label htmlFor="objectorName">Objector Name *</Label>
              <Input
                id="objectorName"
                value={formData.objectorName}
                onChange={(e) => setFormData({ ...formData, objectorName: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <Label htmlFor="objectorIdNumber">National ID Number</Label>
              <Input
                id="objectorIdNumber"
                value={formData.objectorIdNumber || ''}
                onChange={(e) => setFormData({ ...formData, objectorIdNumber: e.target.value })}
                placeholder="Enter national ID number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="objectorContactEmail">Contact Email</Label>
                <Input
                  id="objectorContactEmail"
                  type="email"
                  value={formData.objectorContactEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, objectorContactEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="objectorContactPhone">Contact Phone</Label>
                <Input
                  id="objectorContactPhone"
                  value={formData.objectorContactPhone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, objectorContactPhone: e.target.value })
                  }
                  placeholder="+263..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="objectorAddress">Address</Label>
              <Textarea
                id="objectorAddress"
                value={formData.objectorAddress || ''}
                onChange={(e) => setFormData({ ...formData, objectorAddress: e.target.value })}
                placeholder="Enter your address"
                rows={3}
              />
            </div>
          </div>

          {/* Objection Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Objection Details</h3>

            <div>
              <Label htmlFor="objectionType">Objection Type *</Label>
              <Select
                value={formData.objectionType}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    objectionType: val as ObjectionFormData['objectionType'],
                  })
                }
              >
                <SelectTrigger id="objectionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boundary">Boundary</SelectItem>
                  <SelectItem value="rights">Rights</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a detailed description of your objection (minimum 50 characters)..."
                rows={8}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.description.length} characters
              </p>
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
              disabled={loading || !windowInfo?.withinWindow || formData.description.length < 50}
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
                  Submit Objection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

