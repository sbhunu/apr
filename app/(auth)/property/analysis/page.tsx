/**
 * Property Records Analysis Page
 * Comprehensive view of all records related to a property
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  FileText,
  Map,
  Shield,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import type { PropertyAnalysis } from '@/lib/deeds/property-analysis'
import { DocumentViewer, type Document } from '@/components/documents/DocumentViewer'
import dynamic from 'next/dynamic'

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

export default function PropertyAnalysisPage() {
  const router = useRouter()
  const [searchType, setSearchType] = useState<'scheme' | 'title'>('scheme')
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!searchValue.trim()) {
      setError('Please enter a search value')
      return
    }

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const param = searchType === 'scheme' ? 'schemeNumber' : 'titleNumber'
      const response = await fetch(`/api/property/analysis?${param}=${encodeURIComponent(searchValue.trim())}`)
      const data = await response.json()

      if (data.success && data.analysis) {
        setAnalysis(data.analysis)
      } else {
        setError(data.error || 'Property not found')
      }
    } catch (err) {
      setError('Failed to fetch property analysis')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { variant: 'default' | 'destructive' | 'secondary'; label: string }> = {
      approved: { variant: 'default', label: 'Approved' },
      sealed: { variant: 'default', label: 'Sealed' },
      registered: { variant: 'default', label: 'Registered' },
      submitted: { variant: 'secondary', label: 'Submitted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      draft: { variant: 'secondary', label: 'Draft' },
    }

    const config = statusMap[status.toLowerCase()] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const documents: Document[] = [
    ...(analysis?.planningPlan?.documents || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      url: doc.url,
      uploadedAt: doc.uploadedAt,
    })),
    ...(analysis?.surveyPlan?.documents || []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      url: doc.url,
      uploadedAt: doc.uploadedAt,
    })),
    ...(analysis?.titles || [])
      .filter((t) => t.certificateUrl)
      .map((t) => ({
        id: `cert-${t.id}`,
        name: `Certificate - ${t.titleNumber}`,
        type: 'application/pdf',
        url: t.certificateUrl!,
      })),
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Property Records Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive view of all records related to a property across planning, survey, and deeds modules
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Search Property Records</CardTitle>
          <CardDescription>Enter a scheme number or title number to view all related records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Search By</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={searchType === 'scheme' ? 'default' : 'outline'}
                  onClick={() => setSearchType('scheme')}
                  className="flex-1"
                >
                  Scheme Number
                </Button>
                <Button
                  variant={searchType === 'title' ? 'default' : 'outline'}
                  onClick={() => setSearchType('title')}
                  className="flex-1"
                >
                  Title Number
                </Button>
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="searchValue">
                {searchType === 'scheme' ? 'Scheme Number' : 'Title Number'}
              </Label>
              <Input
                id="searchValue"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={searchType === 'scheme' ? 'e.g., SS123/2024' : 'e.g., ST456/2024'}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="survey">Survey</TabsTrigger>
            <TabsTrigger value="scheme">Scheme Registration</TabsTrigger>
            <TabsTrigger value="titles">Titles</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="workflow">Workflow History</TabsTrigger>
            <TabsTrigger value="signatures">Digital Signatures</TabsTrigger>
            {analysis.spatialData && <TabsTrigger value="map">Map View</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Scheme Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Scheme Number</Label>
                    <p className="font-semibold">{analysis.schemeNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Scheme Name</Label>
                    <p className="font-semibold">{analysis.schemeName}</p>
                  </div>
                  {analysis.scheme?.communalLandId && (
                    <div>
                      <Label className="text-muted-foreground">Communal Land ID</Label>
                      <p>{analysis.scheme.communalLandId}</p>
                    </div>
                  )}
                  {analysis.scheme?.communalLandCustodianName && (
                    <div>
                      <Label className="text-muted-foreground">Custodian</Label>
                      <p>{analysis.scheme.communalLandCustodianName}</p>
                    </div>
                  )}
                  {analysis.scheme?.registrationDate && (
                    <div>
                      <Label className="text-muted-foreground">Registration Date</Label>
                      <p>{new Date(analysis.scheme.registrationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Planning Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.planningPlan ? (
                    <div className="space-y-2">
                      {getStatusBadge(analysis.planningPlan.approvalStatus)}
                      {analysis.planningPlan.approvalDate && (
                        <p className="text-xs text-muted-foreground">
                          Approved: {new Date(analysis.planningPlan.approvalDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No planning record</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Survey Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.surveyPlan ? (
                    <div className="space-y-2">
                      {getStatusBadge(analysis.surveyPlan.status)}
                      {analysis.surveyPlan.sealedAt && (
                        <p className="text-xs text-muted-foreground">
                          Sealed: {new Date(analysis.surveyPlan.sealedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No survey record</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Titles Registered</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{analysis.titles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    of {analysis.scheme?.sections?.length || 0} sections
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Planning Tab */}
          <TabsContent value="planning" className="space-y-4">
            {analysis.planningPlan ? (
              <Card>
                <CardHeader>
                  <CardTitle>Planning Plan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Plan ID</Label>
                      <p className="font-mono text-sm">{analysis.planningPlan.planId}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(analysis.planningPlan.approvalStatus)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Planner</Label>
                      <p>{analysis.planningPlan.plannerName || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Planning Authority</Label>
                      <p>{analysis.planningPlan.planningAuthority || 'N/A'}</p>
                    </div>
                    {analysis.planningPlan.submittedAt && (
                      <div>
                        <Label className="text-muted-foreground">Submitted</Label>
                        <p>{new Date(analysis.planningPlan.submittedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {analysis.planningPlan.approvalDate && (
                      <div>
                        <Label className="text-muted-foreground">Approved</Label>
                        <p>{new Date(analysis.planningPlan.approvalDate).toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Locked</Label>
                      <p>{analysis.planningPlan.locked ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                  {analysis.planningPlan.documents && analysis.planningPlan.documents.length > 0 && (
                    <div>
                      <Label>Planning Documents</Label>
                      <div className="mt-2 space-y-2">
                        {analysis.planningPlan.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{doc.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No planning plan record found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Survey Tab */}
          <TabsContent value="survey" className="space-y-4">
            {analysis.surveyPlan ? (
              <Card>
                <CardHeader>
                  <CardTitle>Survey Plan Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Survey Number</Label>
                      <p className="font-mono text-sm">{analysis.surveyPlan.surveyNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(analysis.surveyPlan.status)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Surveyor</Label>
                      <p>{analysis.surveyPlan.surveyorName || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Sections</Label>
                      <p>{analysis.surveyPlan.sectionCount || 0}</p>
                    </div>
                    {analysis.surveyPlan.sealHash && (
                      <div>
                        <Label className="text-muted-foreground">Seal Hash</Label>
                        <p className="font-mono text-xs break-all">{analysis.surveyPlan.sealHash}</p>
                      </div>
                    )}
                    {analysis.surveyPlan.sealedAt && (
                      <div>
                        <Label className="text-muted-foreground">Sealed</Label>
                        <p>{new Date(analysis.surveyPlan.sealedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {analysis.surveyPlan.validationReport && (
                    <div>
                      <Label>Validation Report</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          {analysis.surveyPlan.validationReport.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {analysis.surveyPlan.validationReport.isValid ? 'Valid' : 'Invalid'}
                          </span>
                        </div>
                        {analysis.surveyPlan.validationReport.errors.length > 0 && (
                          <div>
                            <Label className="text-destructive text-xs">Errors:</Label>
                            <ul className="list-disc list-inside text-xs text-destructive">
                              {analysis.surveyPlan.validationReport.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {analysis.surveyPlan.validationReport.warnings.length > 0 && (
                          <div>
                            <Label className="text-xs">Warnings:</Label>
                            <ul className="list-disc list-inside text-xs">
                              {analysis.surveyPlan.validationReport.warnings.map((warn, idx) => (
                                <li key={idx}>{warn}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No survey plan record found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scheme Registration Tab */}
          <TabsContent value="scheme" className="space-y-4">
            {analysis.scheme && (
              <Card>
                <CardHeader>
                  <CardTitle>Scheme Registration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Scheme Number</Label>
                      <p className="font-semibold">{analysis.scheme.schemeNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Scheme Name</Label>
                      <p>{analysis.scheme.schemeName}</p>
                    </div>
                    {analysis.scheme.registrationDate && (
                      <div>
                        <Label className="text-muted-foreground">Registration Date</Label>
                        <p>{new Date(analysis.scheme.registrationDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {analysis.scheme.bodyCorporateId && (
                      <div>
                        <Label className="text-muted-foreground">Body Corporate ID</Label>
                        <p className="font-mono text-sm">{analysis.scheme.bodyCorporateId}</p>
                      </div>
                    )}
                  </div>
                  {analysis.scheme.sections && analysis.scheme.sections.length > 0 && (
                    <div>
                      <Label>Sections ({analysis.scheme.sections.length})</Label>
                      <div className="mt-2 space-y-2">
                        {analysis.scheme.sections.map((section) => (
                          <div key={section.id} className="p-3 border rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">Section {section.sectionNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  Area: {section.area.toFixed(2)} m² | Quota: {(section.participationQuota * 100).toFixed(4)}%
                                </p>
                                {section.titleNumber && (
                                  <p className="text-sm">
                                    Title: <span className="font-mono">{section.titleNumber}</span>
                                  </p>
                                )}
                              </div>
                              {section.registrationStatus && getStatusBadge(section.registrationStatus)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Titles Tab */}
          <TabsContent value="titles" className="space-y-4">
            {analysis.titles && analysis.titles.length > 0 ? (
              <div className="space-y-4">
                {analysis.titles.map((title) => (
                  <Card key={title.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Title {title.titleNumber}</span>
                        {getStatusBadge(title.registrationStatus)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Section</Label>
                          <p>{title.sectionNumber}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Holder</Label>
                          <p>{title.holderName || 'N/A'}</p>
                        </div>
                        {title.registrationDate && (
                          <div>
                            <Label className="text-muted-foreground">Registration Date</Label>
                            <p>{new Date(title.registrationDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {title.certificateUrl && (
                          <div>
                            <Label className="text-muted-foreground">Certificate</Label>
                            <Button variant="link" size="sm" asChild>
                              <a href={title.certificateUrl} target="_blank" rel="noopener noreferrer">
                                View Certificate <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No titles registered yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            {documents.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>All Related Documents</CardTitle>
                  <CardDescription>Planning documents, survey certificates, and title certificates</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentViewer documents={documents} showGallery={true} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No documents found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Workflow History Tab */}
          <TabsContent value="workflow" className="space-y-4">
            {analysis.workflowHistory && analysis.workflowHistory.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Workflow History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.workflowHistory.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.fromState}</Badge>
                            <span>→</span>
                            <Badge>{entry.toState}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {entry.userName || entry.userId} • {new Date(entry.createdAt).toLocaleString()}
                          </p>
                          {entry.reason && <p className="text-sm mt-1">{entry.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No workflow history available
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Digital Signatures Tab */}
          <TabsContent value="signatures" className="space-y-4">
            {analysis.digitalSignatures && analysis.digitalSignatures.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Digital Signatures
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.digitalSignatures.map((sig) => (
                      <div key={sig.id} className="p-4 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">{sig.role}</p>
                            <p className="text-sm text-muted-foreground">
                              {sig.signerName || sig.signedBy} • {new Date(sig.signedAt).toLocaleString()}
                            </p>
                          </div>
                          {sig.isValid !== undefined && (
                            <Badge variant={sig.isValid ? 'default' : 'destructive'}>
                              {sig.isValid ? 'Valid' : 'Invalid'}
                            </Badge>
                          )}
                        </div>
                        {sig.pkiProvider && (
                          <p className="text-xs text-muted-foreground">PKI Provider: {sig.pkiProvider}</p>
                        )}
                        {sig.certificateSerial && (
                          <p className="text-xs text-muted-foreground font-mono">
                            Certificate: {sig.certificateSerial}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No digital signatures found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Map View Tab */}
          {analysis.spatialData && (
            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Spatial View
                  </CardTitle>
                  <CardDescription>Geographic visualization of the property</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis.spatialData.sectionGeometries && analysis.spatialData.sectionGeometries.length > 0 ? (
                    <div className="h-[600px] w-full">
                      <DeedsMap
                        schemeId={analysis.scheme?.id || ''}
                        selectedSectionId={undefined}
                        onSectionSelect={() => {}}
                      />
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No spatial data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}

