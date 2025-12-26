/**
 * Multi-Step Form Component
 * Reusable multi-step form wrapper with progress indicators
 */

'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface Step {
  id: string
  title: string
  description?: string
  component:
    | ReactNode
    | ((args: {
        formData: Record<string, unknown>
        updateFormData: (stepData: Record<string, unknown>) => void
      }) => ReactNode)
}

interface MultiStepFormProps {
  steps: Step[]
  onComplete: (data: Record<string, unknown>) => Promise<void>
  onStepChange?: (stepIndex: number) => void
  initialStep?: number
  showProgress?: boolean
}

export function MultiStepForm({
  steps,
  onComplete,
  onStepChange,
  initialStep = 0,
  showProgress = true,
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      onStepChange?.(newStep)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      onStepChange?.(newStep)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onComplete(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (stepData: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...stepData }))
  }

  const currentStepData = steps[currentStep]

  // Clone formData to pass to step components
  const stepFormData = { ...formData }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {showProgress && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{currentStepData.title}</CardTitle>
          {currentStepData.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {currentStepData.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Render current step component with form data update handler */}
            {typeof currentStepData.component === 'function'
              ? currentStepData.component({ formData: stepFormData, updateFormData })
              : currentStepData.component}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

