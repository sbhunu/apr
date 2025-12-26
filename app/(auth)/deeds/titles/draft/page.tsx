/**
 * Deeds Drafting Page
 * Interface for conveyancers to draft unit-level legal descriptions
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LegalDescriptionEditor } from '@/components/deeds/legal-description-editor'
import { HolderInformationForm } from '@/components/deeds/holder-information-form'
import dynamic from 'next/dynamic'
import { DocumentViewer, type Document } from '@/components/documents/DocumentViewer'

// Dynamically import DeedsMap to avoid SSR issues with Leaflet
const DeedsMap = dynamic(() => import('@/components/deeds/DeedsMap').then((mod) => ({ default: mod.DeedsMap })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
})
import {
  SectionData,
  TitleDraft,
  HolderData,
} from '@/lib/deeds/types'
import { generateCompleteLegalDescription } from '@/lib/deeds/legal-description-templates'
import {
  CheckCircle2,
  Save,
  AlertTriangle,
  FileText,
  Map,
  FileSearch,
  Upload,
  X,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function DeedsDraftingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const schemeId = searchParams.get('schemeId')
  const sectionId = searchParams.get('sectionId')

  const [sections, setSections] = useState<SectionData[]>([])
  const [selectedSection, setSelectedSection] = useState<SectionData | null>(null)
  const [draft, setDraft] = useState<TitleDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [showMap, setShowMap] = useState(true)
  const [currentSchemeId, setCurrentSchemeId] = useState<string | null>(schemeId)
  const [documents, setDocuments] = useState<Document[]>([])
  const [showDocuments, setShowDocuments] = useState(false)
  const [propertyDescriptionFiles, setPropertyDescriptionFiles] = useState<
    Array<{
      filePath: string
      fileName: string
      fileSize: number
      mimeType: string
      uploadedAt: string
      description?: string
      url?: string | null
    }>
  >([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileDescription, setFileDescription] = useState('')

  useEffect(() => {
    loadAvailableSections()
  }, [schemeId])

  useEffect(() => {
    if (selectedSection) {
      loadDraft(selectedSection.id)
    }
  }, [selectedSection])

  useEffect(() => {
    if (draft?.id) {
      loadPropertyDescriptionFiles()
    }
  }, [draft?.id])

  useEffect(() => {
    if (currentSchemeId) {
      loadSchemeDocuments()
    }
  }, [currentSchemeId])

  async function loadSchemeDocuments() {
    if (!currentSchemeId) return
    try {
      const response = await fetch(`/api/deeds/schemes/${currentSchemeId}/documents`)
      const data = await response.json()
      if (data.success) {
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Failed to load documents', err)
    }
  }

  async function loadPropertyDescriptionFiles() {
    if (!draft?.id) return
    try {
      const response = await fetch(`/api/deeds/titles/${draft.id}/property-description`)
      const data = await response.json()
      if (data.success) {
        setPropertyDescriptionFiles(data.files || [])
      }
    } catch (err) {
      console.error('Failed to load property description files', err)
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !draft?.id) return

    setUploadingFile(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (fileDescription.trim()) {
        formData.append('description', fileDescription.trim())
      }

      const response = await fetch(`/api/deeds/titles/${draft.id}/property-description`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Property description file uploaded successfully')
        setFileDescription('')
        await loadPropertyDescriptionFiles()
        // Reset file input
        event.target.value = ''
      } else {
        setError(data.error || 'Failed to upload file')
      }
    } catch (err) {
      setError('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleFileDelete(filePath: string) {
    if (!draft?.id) return

    if (!confirm('Are you sure you want to delete this file?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/deeds/titles/${draft.id}/property-description?filePath=${encodeURIComponent(filePath)}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (data.success) {
        setSuccess('File deleted successfully')
        await loadPropertyDescriptionFiles()
      } else {
        setError(data.error || 'Failed to delete file')
      }
    } catch (err) {
      setError('Failed to delete file')
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  async function loadAvailableSections() {
    try {
      const response = await fetch(
        `/api/deeds/sections/available${schemeId ? `?schemeId=${schemeId}` : ''}`
      )
      const data = await response.json()

      if (data.success) {
        setSections(data.sections || [])

        // Extract scheme ID from first section if available
        if (data.sections && data.sections.length > 0) {
          const firstSection = data.sections[0] as SectionData
          if (firstSection.schemeId && !currentSchemeId) {
            setCurrentSchemeId(firstSection.schemeId)
          }
        }

        // Auto-select section if provided
        if (sectionId) {
          const section = data.sections?.find((s: SectionData) => s.id === sectionId)
          if (section) {
            setSelectedSection(section)
          }
        }
      } else {
        setError(data.error || 'Failed to load sections')
      }
    } catch (err) {
      setError('Failed to load sections')
    } finally {
      setLoading(false)
    }
  }

  async function loadDraft(sectionId: string) {
    try {
      const response = await fetch(`/api/deeds/titles/draft?sectionId=${sectionId}`)
      const data = await response.json()

      if (data.success && data.draft) {
        setDraft(data.draft)
      } else {
        // Initialize new draft
        if (selectedSection) {
          const generated = generateCompleteLegalDescription(selectedSection)
          setDraft({
            sectionId: selectedSection.id,
            sectionNumber: selectedSection.sectionNumber,
            legalDescription: generated.legalDescription,
            rightsAndConditions: generated.rightsAndConditions,
            restrictions: generated.restrictions,
            holder: {
              holderName: '',
              holderType: 'individual',
            },
            status: 'draft',
          })
        }
      }
    } catch (err) {
      setError('Failed to load draft')
    }
  }

  async function saveDraft() {
    if (!draft || !selectedSection) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/deeds/titles/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Draft saved successfully')
        setDraft({ ...draft, id: data.draftId })
      } else {
        setError(data.error || 'Failed to save draft')
      }
    } catch (err) {
      setError('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  function handleLegalDescriptionChange(value: {
    legalDescription: string
    rightsAndConditions: string
    restrictions: string
  }) {
    if (draft) {
      setDraft({
        ...draft,
        ...value,
      })
    }
  }

  function handleHolderChange(holder: HolderData) {
    if (draft) {
      setDraft({
        ...draft,
        holder,
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !selectedSection) {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Draft Sectional Title</h1>
          <p className="text-muted-foreground mt-2">
            Create legal descriptions for sectional title units
          </p>
        </div>
        {draft && (
          <Button onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
        )}
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

      {/* GIS Viewer */}
      {currentSchemeId && showMap && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Property Location & Scheme Layout
                </CardTitle>
                <CardDescription>
                  View the property location and section boundaries on the map
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowMap(false)}>
                Hide Map
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full rounded-lg overflow-hidden border">
              <DeedsMap
                schemeId={currentSchemeId}
                highlightSectionId={selectedSection?.id}
                onSectionClick={(sectionId, sectionNumber) => {
                  const section = sections.find((s) => s.id === sectionId)
                  if (section) {
                    setSelectedSection(section)
                  }
                }}
                showMeasurement={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentSchemeId && !showMap && (
        <Card>
          <CardContent className="p-4">
            <Button variant="outline" size="sm" onClick={() => setShowMap(true)}>
              <Map className="h-4 w-4 mr-2" />
              Show Map
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Documents Viewer */}
      {currentSchemeId && documents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  Related Documents
                </CardTitle>
                <CardDescription>
                  View planning documents, survey plans, and certificates
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

      {/* Section Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Section</CardTitle>
          <CardDescription>
            Choose a section from a sealed survey to draft the title
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={selectedSection?.id || ''}
              onValueChange={(value) => {
                const section = sections.find((s) => s.id === value)
                setSelectedSection(section || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.sectionNumber} - {section.schemeNumber} ({section.area.toFixed(2)} m²)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drafting Form */}
      {selectedSection && draft && (
        <>
          {/* Legal Description */}
          <Card>
            <CardHeader>
              <CardTitle>Legal Description</CardTitle>
              <CardDescription>
                Legal description of the section based on sealed survey data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LegalDescriptionEditor
                section={selectedSection}
                value={{
                  legalDescription: draft.legalDescription,
                  rightsAndConditions: draft.rightsAndConditions,
                  restrictions: draft.restrictions,
                }}
                onChange={handleLegalDescriptionChange}
                onValidate={(errors, warnings) => {
                  setValidationErrors(errors)
                  setValidationWarnings(warnings)
                }}
              />
            </CardContent>
          </Card>

          {/* Holder Information */}
          <Card>
            <CardHeader>
              <CardTitle>Holder Information</CardTitle>
              <CardDescription>
                Information about the title holder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HolderInformationForm
                value={draft.holder}
                onChange={handleHolderChange}
              />
            </CardContent>
          </Card>

          {/* Property Description Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Property Description Files
              </CardTitle>
              <CardDescription>
                Upload property description documents (PDF, images, DWG files)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Form */}
              <div className="space-y-2">
                <Label htmlFor="property-description-file">Upload File</Label>
                <div className="flex gap-2">
                  <Input
                    id="property-description-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.dwg,.dxf"
                    onChange={handleFileUpload}
                    disabled={uploadingFile || !draft.id}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    placeholder="File description (optional)"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    disabled={uploadingFile}
                    className="flex-1"
                  />
                </div>
                {uploadingFile && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </div>

              {/* Uploaded Files List */}
              {propertyDescriptionFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Files</Label>
                  <div className="space-y-2">
                    {propertyDescriptionFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.fileName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <span>
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </span>
                              {file.description && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{file.description}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <FileSearch className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileDelete(file.filePath)}
                            disabled={draft.status !== 'draft'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {propertyDescriptionFiles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No property description files uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Summary */}
          {(validationErrors.length > 0 || validationWarnings.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Validation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {validationErrors.length > 0 && (
                  <div>
                    <Label className="text-destructive">Errors:</Label>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm text-destructive">
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationWarnings.length > 0 && (
                  <div>
                    <Label>Warnings:</Label>
                    <ul className="list-disc list-inside space-y-1">
                      {validationWarnings.map((warning, index) => (
                        <li key={index} className="text-sm">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedSection && sections.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Please select a section to begin drafting
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {sections.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No sections available for drafting. Ensure surveys are sealed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

