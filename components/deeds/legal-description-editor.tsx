/**
 * Legal Description Editor Component
 * Rich text editor for legal descriptions with template support
 */

'use client'

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, RefreshCw } from 'lucide-react'
import { SectionData } from '@/lib/deeds/types'
import { generateCompleteLegalDescription } from '@/lib/deeds/legal-description-templates'

interface LegalDescriptionEditorProps {
  section: SectionData
  value: {
    legalDescription: string
    rightsAndConditions: string
    restrictions: string
  }
  onChange: (value: {
    legalDescription: string
    rightsAndConditions: string
    restrictions: string
  }) => void
  onValidate?: (errors: string[], warnings: string[]) => void
}

export function LegalDescriptionEditor({
  section,
  value,
  onChange,
  onValidate,
}: LegalDescriptionEditorProps) {
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    validateContent()
  }, [value, section])

  function validateContent() {
    const newErrors: string[] = []
    const newWarnings: string[] = []

    // Check if area is mentioned
    if (!value.legalDescription.includes(section.area.toFixed(2))) {
      newWarnings.push('Legal description should include the exact area from survey')
    }

    // Check if quota is mentioned
    if (!value.legalDescription.includes(section.quota.toFixed(4))) {
      newWarnings.push('Legal description should include the exact participation quota')
    }

    // Check if section number is mentioned
    if (!value.legalDescription.toUpperCase().includes(section.sectionNumber.toUpperCase())) {
      newErrors.push('Legal description must include the section number')
    }

    setErrors(newErrors)
    setWarnings(newWarnings)
    onValidate?.(newErrors, newWarnings)
  }

  function regenerateFromTemplate() {
    const generated = generateCompleteLegalDescription(section)
    onChange(generated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Legal Description</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={regenerateFromTemplate}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate from Template
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <Badge key={index} variant="destructive">
              {error}
            </Badge>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((warning, index) => (
            <Badge key={index} variant="outline">
              {warning}
            </Badge>
          ))}
        </div>
      )}

      <Textarea
        value={value.legalDescription}
        onChange={(e) =>
          onChange({
            ...value,
            legalDescription: e.target.value,
          })
        }
        placeholder="Enter legal description..."
        rows={6}
        className="font-mono text-sm"
      />

      <div>
        <Label>Rights and Conditions</Label>
        <Textarea
          value={value.rightsAndConditions}
          onChange={(e) =>
            onChange({
              ...value,
              rightsAndConditions: e.target.value,
            })
          }
          placeholder="Enter rights and conditions..."
          rows={8}
          className="font-mono text-sm mt-2"
        />
      </div>

      <div>
        <Label>Restrictions</Label>
        <Textarea
          value={value.restrictions}
          onChange={(e) =>
            onChange({
              ...value,
              restrictions: e.target.value,
            })
          }
          placeholder="Enter restrictions..."
          rows={6}
          className="font-mono text-sm mt-2"
        />
      </div>

      {/* Section Info Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Section Reference Data
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>
            <span className="font-medium">Section:</span> {section.sectionNumber}
          </div>
          <div>
            <span className="font-medium">Area:</span> {section.area.toFixed(2)} m²
          </div>
          <div>
            <span className="font-medium">Quota:</span> {section.quota.toFixed(4)}%
          </div>
          <div>
            <span className="font-medium">Scheme:</span> {section.schemeNumber} - {section.schemeName}
          </div>
          <div>
            <span className="font-medium">Location:</span> {section.location}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

