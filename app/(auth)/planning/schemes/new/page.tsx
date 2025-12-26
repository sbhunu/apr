/**
 * Scheme Creation Page
 * Multi-step form for creating new sectional scheme applications
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MultiStepForm } from '@/components/planning/multi-step-form'
import { SchemeMetadataStep } from '@/components/planning/scheme-metadata-step'
import { PlannerInfoStep } from '@/components/planning/planner-info-step'
import { DocumentsStep } from '@/components/planning/documents-step'
import { schemeFormSchema } from '@/lib/planning/scheme-form-schema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save } from 'lucide-react'

export default function NewSchemePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [planId, setPlanId] = useState<string | null>(null)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('scheme-draft')
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setFormData(parsed.data || {})
        setPlanId(parsed.planId || null)
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save draft to localStorage
  const saveDraftToLocal = () => {
    localStorage.setItem(
      'scheme-draft',
      JSON.stringify({
        data: formData,
        planId,
        timestamp: new Date().toISOString(),
      })
    )
  }

  // Save draft to server
  const saveDraft = async () => {
    setIsDraftSaving(true)
    setError(null)

    try {
      // Validate form data
      const validated = schemeFormSchema.partial().parse(formData)

      // Get current user (would need auth context in real implementation)
      // For now, using a placeholder
      const userId = 'current-user-id' // Would come from auth context

      if (planId) {
        // Update existing draft
        const response = await fetch(`/api/planning/schemes/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validated),
        })

        if (!response.ok) {
          throw new Error('Failed to save draft')
        }
      } else {
        // Create new draft
        const response = await fetch('/api/planning/schemes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validated),
        })

        if (!response.ok) {
          throw new Error('Failed to create draft')
        }

        const result = await response.json()
        if (result.planId) {
          setPlanId(result.planId)
        }
      }

      saveDraftToLocal()
      setSuccess('Draft saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsDraftSaving(false)
    }
  }

  // Auto-save draft on form data change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftToLocal()
    }, 2000) // Debounce auto-save

    return () => clearTimeout(timer)
  }, [formData])

  const handleComplete = async (data: Record<string, unknown>) => {
    setError(null)

    try {
      // Validate complete form
      const validated = schemeFormSchema.parse(data)

      // Get current user (would need auth context)
      const userId = 'current-user-id'

      // Create or update draft
      let currentPlanId = planId
      if (!currentPlanId) {
        // Create draft via API route (server-side auth + RBAC)
        const response = await fetch('/api/planning/schemes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validated),
        })

        const result = await response.json()
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Failed to create draft')
        }

        currentPlanId = result.planId || null
        setPlanId(currentPlanId)
      } else {
        // Update draft would be called here
      }

      // Submit scheme
      if (currentPlanId) {
        const submitResponse = await fetch(`/api/planning/schemes/${currentPlanId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Submitted by planner' }),
        })
        const submitResult = await submitResponse.json()
        if (!submitResponse.ok || !submitResult?.success) {
          throw new Error(submitResult?.error || 'Failed to submit scheme')
        }
      }

      // Clear draft from localStorage
      localStorage.removeItem('scheme-draft')

      // Redirect to schemes list (page may be added later; fallback to planning review dashboard)
      router.push('/planning/review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit scheme')
    }
  }

  const steps = [
    {
      id: 'metadata',
      title: 'Scheme Information',
      description: 'Enter basic information about the sectional scheme',
      component: ({ formData, updateFormData }: any) => (
        <SchemeMetadataStep formData={formData} updateFormData={updateFormData} />
      ),
    },
    {
      id: 'planner',
      title: 'Planner Information',
      description: 'Provide your professional details',
      component: ({ formData, updateFormData }: any) => (
        <PlannerInfoStep formData={formData} updateFormData={updateFormData} />
      ),
    },
    {
      id: 'documents',
      title: 'Upload Documents',
      description: 'Upload planning documents and supporting files',
      component: ({ formData, updateFormData }: any) => (
        <DocumentsStep formData={formData} updateFormData={updateFormData} />
      ),
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review your information before submitting',
      component: ({ formData }: any) => (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheme Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Scheme Name:</span>{' '}
                {formData.title || 'Not provided'}
              </div>
              <div>
                <span className="font-medium">Location:</span>{' '}
                {formData.locationName || 'Not provided'}
              </div>
              <div>
                <span className="font-medium">Number of Sections:</span>{' '}
                {formData.numberOfSections || 'Not provided'}
              </div>
              {formData.description && (
                <div>
                  <span className="font-medium">Description:</span>{' '}
                  {formData.description}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planner Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Name:</span>{' '}
                {formData.plannerName || 'Not provided'}
              </div>
              {formData.plannerRegistrationNumber && (
                <div>
                  <span className="font-medium">Registration Number:</span>{' '}
                  {formData.plannerRegistrationNumber}
                </div>
              )}
              {formData.organization && (
                <div>
                  <span className="font-medium">Organization:</span>{' '}
                  {formData.organization}
                </div>
              )}
            </CardContent>
          </Card>

          {formData.documents && Array.isArray(formData.documents) && formData.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formData.documents.map((doc: any, index: number) => (
                    <div key={index} className="text-sm">
                      • {doc.fileName} ({doc.documentType})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create New Scheme</h1>
          <p className="text-muted-foreground mt-2">
            Submit a new sectional scheme plan for review
          </p>
        </div>
        <Button
          variant="outline"
          onClick={saveDraft}
          disabled={isDraftSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isDraftSaving ? 'Saving...' : 'Save Draft'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <MultiStepForm
        steps={steps}
        onComplete={handleComplete}
        initialStep={0}
        showProgress={true}
      />
    </div>
  )
}

