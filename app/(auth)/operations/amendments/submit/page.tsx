/**
 * Submit Amendment Page
 * Interface for submitting scheme amendments
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
import { AmendmentSubmissionData } from '@/lib/operations/amendments'
import { CheckCircle2, AlertTriangle, FileText, Loader2, Plus, X } from 'lucide-react'

export default function SubmitAmendmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])

  const [formData, setFormData] = useState<AmendmentSubmissionData>({
    schemeId: '',
    amendmentType: 'extension',
    description: '',
    reason: '',
    affectedSectionIds: [],
    newSectionCount: 0,
    newSections: [],
  })

  const [newSectionInput, setNewSectionInput] = useState({
    sectionNumber: '',
    area: '',
    sectionType: 'residential',
  })

  async function handleValidate() {
    setValidating(true)
    setValidationErrors([])
    setValidationWarnings([])

    try {
      const response = await fetch('/api/operations/amendments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setValidationErrors(data.errors || [])
        setValidationWarnings(data.warnings || [])
      } else {
        setError(data.error || 'Validation failed')
      }
    } catch (err) {
      setError('Failed to validate amendment')
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
      const response = await fetch('/api/operations/amendments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`Amendment submitted successfully. Amendment ID: ${data.amendmentId}`)
        setTimeout(() => {
          router.push('/operations/amendments')
        }, 3000)
      } else {
        setError(data.error || 'Failed to submit amendment')
      }
    } catch (err) {
      setError('Failed to submit amendment')
    } finally {
      setLoading(false)
    }
  }

  function addNewSection() {
    if (!newSectionInput.sectionNumber || !newSectionInput.area) {
      return
    }

    const newSections = [
      ...(formData.newSections || []),
      {
        sectionNumber: newSectionInput.sectionNumber,
        area: parseFloat(newSectionInput.area),
        sectionType: newSectionInput.sectionType,
      },
    ]

    setFormData({ ...formData, newSections })
    setNewSectionInput({ sectionNumber: '', area: '', sectionType: 'residential' })
  }

  function removeNewSection(index: number) {
    const newSections = [...(formData.newSections || [])]
    newSections.splice(index, 1)
    setFormData({ ...formData, newSections })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Submit Scheme Amendment</h1>
          <p className="text-muted-foreground mt-2">
            Submit an amendment to a registered scheme
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

      {/* Amendment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Amendment Information</CardTitle>
          <CardDescription>
            Provide details about the scheme amendment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="schemeId">Scheme ID *</Label>
            <Input
              id="schemeId"
              value={formData.schemeId}
              onChange={(e) => setFormData({ ...formData, schemeId: e.target.value })}
              placeholder="Enter scheme ID"
              required
            />
          </div>

          <div>
            <Label htmlFor="amendmentType">Amendment Type *</Label>
            <Select
              value={formData.amendmentType}
              onValueChange={(val) =>
                setFormData({
                  ...formData,
                  amendmentType: val as AmendmentSubmissionData['amendmentType'],
                })
              }
            >
              <SelectTrigger id="amendmentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="extension">Extension</SelectItem>
                <SelectItem value="subdivision">Subdivision</SelectItem>
                <SelectItem value="consolidation">Consolidation</SelectItem>
                <SelectItem value="exclusive_use_change">Exclusive Use Change</SelectItem>
                <SelectItem value="quota_adjustment">Quota Adjustment</SelectItem>
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
              placeholder="Describe the amendment..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain the reason for this amendment..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="affectedSectionIds">Affected Section IDs (comma-separated)</Label>
            <Input
              id="affectedSectionIds"
              value={formData.affectedSectionIds.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  affectedSectionIds: e.target.value
                    .split(',')
                    .map((id) => id.trim())
                    .filter((id) => id.length > 0),
                })
              }
              placeholder="Enter section IDs separated by commas"
            />
          </div>

          {/* New Sections (for extension/subdivision) */}
          {(formData.amendmentType === 'extension' ||
            formData.amendmentType === 'subdivision' ||
            formData.amendmentType === 'consolidation') && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">New Sections</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="newSectionNumber">Section Number</Label>
                  <Input
                    id="newSectionNumber"
                    value={newSectionInput.sectionNumber}
                    onChange={(e) =>
                      setNewSectionInput({ ...newSectionInput, sectionNumber: e.target.value })
                    }
                    placeholder="e.g., 1A"
                  />
                </div>
                <div>
                  <Label htmlFor="newSectionArea">Area (m²)</Label>
                  <Input
                    id="newSectionArea"
                    type="number"
                    step="0.01"
                    value={newSectionInput.area}
                    onChange={(e) =>
                      setNewSectionInput({ ...newSectionInput, area: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="newSectionType">Type</Label>
                  <Select
                    value={newSectionInput.sectionType}
                    onValueChange={(val) =>
                      setNewSectionInput({ ...newSectionInput, sectionType: val })
                    }
                  >
                    <SelectTrigger id="newSectionType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={addNewSection} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>

              {formData.newSections && formData.newSections.length > 0 && (
                <div className="space-y-2">
                  {formData.newSections.map((section, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span>
                        {section.sectionNumber} - {section.area} m² ({section.sectionType})
                      </span>
                      <Button
                        onClick={() => removeNewSection(index)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
                  Submit Amendment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

