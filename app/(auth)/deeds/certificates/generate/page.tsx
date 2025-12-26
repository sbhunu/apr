/**
 * Certificate Generation Page
 * Interface for generating certificates for registered titles
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CheckCircle2, FileText, AlertTriangle, Download, Loader2, FileCheck } from 'lucide-react'

interface RegisteredTitle {
  id: string
  titleNumber: string
  sectionNumber: string
  holderName: string
  registrationDate: string
  schemeNumber: string
  hasCertificate: boolean
}

export default function CertificateGenerationPage() {
  const router = useRouter()
  const [titles, setTitles] = useState<RegisteredTitle[]>([])
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string; version: string }>>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('certificate-sectional-title')

  useEffect(() => {
    loadRegisteredTitles()
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      const response = await fetch('/api/deeds/templates/list')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates || [])
        // Set default template if available
        if (data.templates && data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load templates', err)
    }
  }

  async function loadRegisteredTitles() {
    try {
      const response = await fetch('/api/deeds/titles/registered')
      const data = await response.json()

      if (data.success) {
        // Use registered titles directly
        const registered = data.titles || []
        
        // Check which ones have certificates
        const titlesWithCertificates = await Promise.all(
          registered.map(async (title: any) => {
            const certResponse = await fetch(`/api/deeds/certificates/${title.id}`)
            const certData = await certResponse.json()
            return {
              ...title,
              hasCertificate: certData.success && certData.certificateUrl,
            }
          })
        )

        setTitles(titlesWithCertificates)
      } else {
        setError(data.error || 'Failed to load registered titles')
      }
    } catch (err) {
      setError('Failed to load registered titles')
    } finally {
      setLoading(false)
    }
  }

  function toggleTitleSelection(titleId: string) {
    const newSelected = new Set(selectedTitles)
    if (newSelected.has(titleId)) {
      newSelected.delete(titleId)
    } else {
      newSelected.add(titleId)
    }
    setSelectedTitles(newSelected)
  }

  function toggleAllTitles() {
    if (selectedTitles.size === titles.length) {
      setSelectedTitles(new Set())
    } else {
      setSelectedTitles(new Set(titles.map((t) => t.id)))
    }
  }

  async function generateSelected() {
    if (selectedTitles.size === 0) {
      setError('Please select at least one title')
      return
    }

    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/deeds/certificates/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleIds: Array.from(selectedTitles),
          templateId: selectedTemplate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(
          `Generated ${data.summary.successful} certificate(s) successfully${data.summary.failed > 0 ? `, ${data.summary.failed} failed` : ''}`
        )
        setSelectedTitles(new Set())
        setTimeout(() => {
          loadRegisteredTitles()
        }, 2000)
      } else {
        setError(data.error || 'Failed to generate certificates')
      }
    } catch (err) {
      setError('Failed to generate certificates')
    } finally {
      setGenerating(false)
    }
  }

  async function generateSingle(titleId: string) {
    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/deeds/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleId,
          templateId: selectedTemplate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Certificate generated successfully')
        setTimeout(() => {
          loadRegisteredTitles()
        }, 2000)
      } else {
        setError(data.error || 'Failed to generate certificate')
      }
    } catch (err) {
      setError('Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading registered titles...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Certificate Generation</h1>
          <p className="text-muted-foreground mt-2">
            Generate QR-coded certificates for registered titles
          </p>
        </div>
        {selectedTitles.size > 0 && (
          <Button onClick={generateSelected} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Selected ({selectedTitles.size})
              </>
            )}
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

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Certificate Template
          </CardTitle>
          <CardDescription>
            Select the template style for certificate generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="template-select">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template-select">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.description} (v{template.version})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-sm text-muted-foreground mt-2">
                {templates.find((t) => t.id === selectedTemplate)?.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {titles.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No registered titles found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registered Titles ({titles.length})</CardTitle>
            <CardDescription>
              Select titles to generate certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTitles.size === titles.length && titles.length > 0}
                      onCheckedChange={toggleAllTitles}
                    />
                  </TableHead>
                  <TableHead>Title Number</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.map((title) => (
                  <TableRow key={title.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTitles.has(title.id)}
                        onCheckedChange={() => toggleTitleSelection(title.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{title.titleNumber}</Badge>
                    </TableCell>
                    <TableCell>{title.sectionNumber}</TableCell>
                    <TableCell>{title.holderName}</TableCell>
                    <TableCell>{title.schemeNumber}</TableCell>
                    <TableCell>
                      {new Date(title.registrationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {title.hasCertificate ? (
                        <Badge>Certificate Generated</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {title.hasCertificate ? (
                          <Button variant="outline" size="sm" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateSingle(title.id)}
                            disabled={generating}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

