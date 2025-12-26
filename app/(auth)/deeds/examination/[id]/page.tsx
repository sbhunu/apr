/**
 * Title Examination Detail Page
 * Detailed examination interface for a specific title
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DEEDS_EXAMINATION_CHECKLIST,
  ExaminationChecklistItem,
  validateExaminationChecklist,
} from '@/lib/deeds/examination-checklist'
import {
  ExaminationDefect,
  crossValidateWithSurvey,
} from '@/lib/deeds/examination-service'
import {
  generateDefectsFromChecklist,
  categorizeDefects,
  hasBlockingDefects,
} from '@/lib/deeds/defect-tracker'
import { DocumentViewer, type Document } from '@/components/documents/DocumentViewer'
import { CheckCircle2, XCircle, AlertTriangle, FileText, CheckSquare, FileSearch, Shield, Mail } from 'lucide-react'

export default function TitleExaminationPage() {
  const params = useParams()
  const router = useRouter()
  const titleId = params.id as string

  const [checklist, setChecklist] = useState<ExaminationChecklistItem[]>(
    DEEDS_EXAMINATION_CHECKLIST
  )
  const [examinationNotes, setExaminationNotes] = useState('')
  const [defects, setDefects] = useState<ExaminationDefect[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [showDocuments, setShowDocuments] = useState(false)
  const [communalValidation, setCommunalValidation] = useState<{
    authorization?: {
      isValid: boolean
      errors: string[]
      warnings: string[]
      communalLandId?: string
      communalLandCustodianName?: string
      authorizationStatus?: string
    }
    tenureCompliance?: {
      isValid: boolean
      errors: string[]
      warnings: string[]
      complianceChecks: Array<{ check: string; passed: boolean; details?: string }>
    }
  } | null>(null)
  const [loadingCommunalValidation, setLoadingCommunalValidation] = useState(false)
  const [sendingCorrections, setSendingCorrections] = useState(false)
  const [correctionEmailResult, setCorrectionEmailResult] = useState<{
    plannerEmail?: { sent: boolean; error?: string }
    surveyorEmail?: { sent: boolean; error?: string }
    conveyancerEmail?: { sent: boolean; error?: string }
  } | null>(null)

  useEffect(() => {
    runCrossValidation()
    loadTitleDocuments()
    runCommunalValidation()
  }, [])

  async function runCommunalValidation() {
    setLoadingCommunalValidation(true)
    try {
      const response = await fetch(
        `/api/deeds/examination/communal-validate?titleId=${titleId}`
      )
      const data = await response.json()

      if (data.success) {
        setCommunalValidation({
          authorization: data.authorization,
          tenureCompliance: data.tenureCompliance,
        })
        // Add communal validation errors/warnings to main validation lists
        if (data.authorization?.errors) {
          setValidationErrors((prev) => [...prev, ...data.authorization.errors])
        }
        if (data.authorization?.warnings) {
          setValidationWarnings((prev) => [...prev, ...data.authorization.warnings])
        }
        if (data.tenureCompliance?.errors) {
          setValidationErrors((prev) => [...prev, ...data.tenureCompliance.errors])
        }
        if (data.tenureCompliance?.warnings) {
          setValidationWarnings((prev) => [...prev, ...data.tenureCompliance.warnings])
        }
      }
    } catch (err) {
      console.error('Failed to run communal validation', err)
    } finally {
      setLoadingCommunalValidation(false)
    }
  }

  async function loadTitleDocuments() {
    try {
      const response = await fetch(`/api/deeds/titles/${titleId}/documents`)
      const data = await response.json()
      if (data.success) {
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Failed to load documents', err)
    }
  }

  async function runCrossValidation() {
    setValidating(true)
    try {
      const response = await fetch(`/api/deeds/examination/validate?titleId=${titleId}`)
      const data = await response.json()

      if (data.success) {
        setValidationErrors(data.errors || [])
        setValidationWarnings(data.warnings || [])
      }
    } catch (err) {
      // Ignore validation errors for now
    } finally {
      setValidating(false)
    }
  }

  function handleChecklistChange(id: string, checked: boolean) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    )
  }

  function handleNotesChange(id: string, notes: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    )
  }

  function updateDefects() {
    const newDefects = generateDefectsFromChecklist(checklist)
    setDefects(newDefects)
  }

  useEffect(() => {
    updateDefects()
  }, [checklist])

  async function handleApprove() {
    const validation = validateExaminationChecklist(checklist)
    if (!validation.isValid) {
      setError(
        `Please complete all required checklist items: ${validation.missingRequired.map((item) => item.description).join(', ')}`
      )
      return
    }

    if (hasBlockingDefects(defects)) {
      setError('Cannot approve with blocking defects. Please resolve all errors.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/deeds/examination/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleId,
          decision: 'approve',
          notes: examinationNotes,
          checklist,
          defects,
        }),
      })
      if (response.status === 401) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/deeds/examination/${titleId}`)}`)
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('Title approved successfully')
        setTimeout(() => {
          router.push('/deeds/examination')
        }, 2000)
      } else {
        setError(data.error || 'Failed to approve title')
      }
    } catch (err) {
      setError('Failed to approve title')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!examinationNotes.trim()) {
      setError('Please provide a rejection reason')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/deeds/examination/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleId,
          decision: 'reject',
          notes: examinationNotes,
          checklist,
          defects,
        }),
      })
      if (response.status === 401) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/deeds/examination/${titleId}`)}`)
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('Title rejected')
        setTimeout(() => {
          router.push('/deeds/examination')
        }, 2000)
      } else {
        setError(data.error || 'Failed to reject title')
      }
    } catch (err) {
      setError('Failed to reject title')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendCorrections() {
    if (defects.length === 0) {
      setError('No defects to send. Please add defects before sending corrections.')
      return
    }

    setSendingCorrections(true)
    setError(null)
    setCorrectionEmailResult(null)

    try {
      const response = await fetch('/api/deeds/examination/send-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleId,
          defects,
          examinerNotes: examinationNotes,
          notifyPlanner: true,
          notifySurveyor: true,
          notifyConveyancer: true,
        }),
      })

      if (response.status === 401) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/deeds/examination/${titleId}`)}`)
        return
      }

      const data = await response.json()

      if (data.success) {
        setCorrectionEmailResult({
          plannerEmail: data.plannerEmail,
          surveyorEmail: data.surveyorEmail,
          conveyancerEmail: data.conveyancerEmail,
        })
        setSuccess('Correction emails sent successfully')
      } else {
        setError(data.error || 'Failed to send correction emails')
      }
    } catch (err) {
      setError('Failed to send correction emails')
    } finally {
      setSendingCorrections(false)
    }
  }

  async function handleRequestRevision() {
    if (!examinationNotes.trim()) {
      setError('Please provide revision notes')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/deeds/examination/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleId,
          decision: 'request_revision',
          notes: examinationNotes,
          checklist,
          defects,
        }),
      })
      if (response.status === 401) {
        router.replace(`/login?redirectTo=${encodeURIComponent(`/deeds/examination/${titleId}`)}`)
        return
      }

      const data = await response.json()

      if (data.success) {
        setSuccess('Revision requested')
        setTimeout(() => {
          router.push('/deeds/examination')
        }, 2000)
      } else {
        setError(data.error || 'Failed to request revision')
      }
    } catch (err) {
      setError('Failed to request revision')
    } finally {
      setLoading(false)
    }
  }

  const validation = validateExaminationChecklist(checklist)
  const categorizedDefects = categorizeDefects(defects)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Examine Title</h1>
          <p className="text-muted-foreground mt-2">
            Title ID: {titleId.substring(0, 8)}...
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

      {/* Documents Viewer */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  Related Documents
                </CardTitle>
                <CardDescription>
                  View planning documents, survey plans, certificates, and related files
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDocuments(!showDocuments)}>
                {showDocuments ? 'Hide' : 'Show'} Documents
              </Button>
            </div>
          </CardHeader>
          {showDocuments && (
            <CardContent>
              <DocumentViewer documents={documents} showGallery={true} />
            </CardContent>
          )}
        </Card>
      )}

      {/* Communal Authorization Validation */}
      {communalValidation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Communal Authorization & Tenure Compliance
            </CardTitle>
            <CardDescription>
              Validation of communal land authorization and tenure compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Authorization Status */}
            {communalValidation.authorization && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Communal Land Authorization</Label>
                  <Badge
                    variant={
                      communalValidation.authorization.isValid ? 'default' : 'destructive'
                    }
                  >
                    {communalValidation.authorization.authorizationStatus?.toUpperCase() ||
                      'UNKNOWN'}
                  </Badge>
                </div>
                {communalValidation.authorization.communalLandId && (
                  <div className="text-sm">
                    <span className="font-medium">Communal Land ID:</span>{' '}
                    {communalValidation.authorization.communalLandId}
                  </div>
                )}
                {communalValidation.authorization.communalLandCustodianName && (
                  <div className="text-sm">
                    <span className="font-medium">Custodian:</span>{' '}
                    {communalValidation.authorization.communalLandCustodianName}
                  </div>
                )}
                {communalValidation.authorization.errors.length > 0 && (
                  <div>
                    <Label className="text-destructive text-xs">Authorization Errors:</Label>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {communalValidation.authorization.errors.map((err, index) => (
                        <li key={index} className="text-xs text-destructive">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {communalValidation.authorization.warnings.length > 0 && (
                  <div>
                    <Label className="text-xs">Authorization Warnings:</Label>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {communalValidation.authorization.warnings.map((warn, index) => (
                        <li key={index} className="text-xs">
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tenure Compliance */}
            {communalValidation.tenureCompliance && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tenure Compliance</Label>
                  <Badge
                    variant={
                      communalValidation.tenureCompliance.isValid ? 'default' : 'destructive'
                    }
                  >
                    {communalValidation.tenureCompliance.isValid ? 'COMPLIANT' : 'NON-COMPLIANT'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {communalValidation.tenureCompliance.complianceChecks.map((check, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm p-2 rounded border"
                    >
                      {check.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{check.check}</div>
                        {check.details && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {check.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {communalValidation.tenureCompliance.errors.length > 0 && (
                  <div>
                    <Label className="text-destructive text-xs">Compliance Errors:</Label>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {communalValidation.tenureCompliance.errors.map((err, index) => (
                        <li key={index} className="text-xs text-destructive">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {communalValidation.tenureCompliance.warnings.length > 0 && (
                  <div>
                    <Label className="text-xs">Compliance Warnings:</Label>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {communalValidation.tenureCompliance.warnings.map((warn, index) => (
                        <li key={index} className="text-xs">
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {loadingCommunalValidation && (
              <div className="text-sm text-muted-foreground">Validating...</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cross-Validation Results */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Cross-Validation with Survey</CardTitle>
            <CardDescription>
              Automated validation against sealed survey data
            </CardDescription>
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

      {/* Examination Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Examination Checklist</CardTitle>
          <CardDescription>
            Review all items before making a decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['legal', 'survey', 'holder', 'documentation', 'tenure'].map((category) => (
            <div key={category} className="space-y-2">
              <h3 className="font-semibold capitalize">{category} Checks</h3>
              {checklist
                .filter((item) => item.category === category)
                .map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-2 border rounded">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={(checked) =>
                        handleChecklistChange(item.id, checked === true)
                      }
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={item.id}
                        className={`cursor-pointer ${item.required ? 'font-medium' : ''}`}
                      >
                        {item.description}
                        {item.required && (
                          <Badge variant="destructive" className="ml-2">
                            Required
                          </Badge>
                        )}
                      </Label>
                      <Textarea
                        placeholder="Add notes..."
                        value={item.notes || ''}
                        onChange={(e) => handleNotesChange(item.id, e.target.value)}
                        className="mt-2"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ))}

          {!validation.isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Incomplete Checklist</AlertTitle>
              <AlertDescription>
                {validation.missingRequired.length} required items are unchecked
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Defects Summary */}
      {defects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Identified Defects</CardTitle>
            <CardDescription>
              {categorizedDefects.errors.length} errors, {categorizedDefects.warnings.length}{' '}
              warnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {categorizedDefects.errors.length > 0 && (
              <div>
                <Label className="text-destructive">Errors:</Label>
                <ul className="list-disc list-inside space-y-1">
                  {categorizedDefects.errors.map((defect) => (
                    <li key={defect.id} className="text-sm text-destructive">
                      {defect.title}: {defect.description}
                      {defect.suggestedCorrection && (
                        <span className="text-muted-foreground">
                          {' '}
                          (Suggestion: {defect.suggestedCorrection})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {categorizedDefects.warnings.length > 0 && (
              <div>
                <Label>Warnings:</Label>
                <ul className="list-disc list-inside space-y-1">
                  {categorizedDefects.warnings.map((defect) => (
                    <li key={defect.id} className="text-sm">
                      {defect.title}: {defect.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Examination Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Examination Notes</CardTitle>
          <CardDescription>Add notes or comments about this examination</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={examinationNotes}
            onChange={(e) => setExaminationNotes(e.target.value)}
            placeholder="Enter examination notes..."
            rows={6}
          />
        </CardContent>
      </Card>

      {/* Correction Email Results */}
      {correctionEmailResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Correction Email Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {correctionEmailResult.plannerEmail && (
              <div className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">Planner Email</span>
                <Badge variant={correctionEmailResult.plannerEmail.sent ? 'default' : 'destructive'}>
                  {correctionEmailResult.plannerEmail.sent ? 'Sent' : 'Failed'}
                </Badge>
                {correctionEmailResult.plannerEmail.error && (
                  <span className="text-xs text-destructive ml-2">
                    {correctionEmailResult.plannerEmail.error}
                  </span>
                )}
              </div>
            )}
            {correctionEmailResult.surveyorEmail && (
              <div className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">Surveyor Email</span>
                <Badge variant={correctionEmailResult.surveyorEmail.sent ? 'default' : 'destructive'}>
                  {correctionEmailResult.surveyorEmail.sent ? 'Sent' : 'Failed'}
                </Badge>
                {correctionEmailResult.surveyorEmail.error && (
                  <span className="text-xs text-destructive ml-2">
                    {correctionEmailResult.surveyorEmail.error}
                  </span>
                )}
              </div>
            )}
            {correctionEmailResult.conveyancerEmail && (
              <div className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">Conveyancer Email</span>
                <Badge variant={correctionEmailResult.conveyancerEmail.sent ? 'default' : 'destructive'}>
                  {correctionEmailResult.conveyancerEmail.sent ? 'Sent' : 'Failed'}
                </Badge>
                {correctionEmailResult.conveyancerEmail.error && (
                  <span className="text-xs text-destructive ml-2">
                    {correctionEmailResult.conveyancerEmail.error}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Examination Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {defects.length > 0 && (
            <Button
              variant="outline"
              onClick={handleSendCorrections}
              disabled={sendingCorrections}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingCorrections ? 'Sending Corrections...' : 'Send Correction Emails'}
            </Button>
          )}
          <div className="flex gap-4">
            <Button
              onClick={handleApprove}
              disabled={loading || !validation.isValid || hasBlockingDefects(defects)}
              className="flex-1"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={loading || !examinationNotes.trim()}
              variant="outline"
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Revision
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading || !examinationNotes.trim()}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

