/**
 * Scheme Selection Page for Module 4
 * Conveyancers select registered schemes with sealed surveys before drafting
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Building2, FileText, MapPin, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react'

interface DraftableScheme {
  id: string
  scheme_number: string
  scheme_name: string
  registration_date: string
  survey_number: string
  sealed_at: string
  section_count: number
  location?: string
  province_code?: string
}

export default function SchemeSelectionPage() {
  const router = useRouter()
  const [schemes, setSchemes] = useState<DraftableScheme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDraftableSchemes()
  }, [])

  async function loadDraftableSchemes() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/deeds/schemes/draftable')
      const data = await response.json()

      if (data.success) {
        setSchemes(data.schemes || [])
      } else {
        setError(data.error || 'Failed to load schemes')
      }
    } catch (err) {
      setError('Failed to load schemes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString('en-ZW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Select Scheme for Drafting</h1>
        <p className="text-muted-foreground mt-2">
          Choose a registered scheme with sealed survey to begin drafting sectional titles
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p>Loading registered schemes...</p>
          </CardContent>
        </Card>
      ) : schemes.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No registered schemes available for drafting</p>
              <p className="text-sm mt-2">
                Schemes must be registered (Module 3) and have sealed surveys (Module 2) before drafting can begin
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Registered Schemes ({schemes.length})</CardTitle>
            <CardDescription>
              All schemes have sealed surveys and are ready for title drafting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheme Number</TableHead>
                  <TableHead>Scheme Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Survey Number</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Sealed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.map((scheme) => (
                  <TableRow key={scheme.id}>
                    <TableCell>
                      <Badge variant="outline">{scheme.scheme_number}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{scheme.scheme_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {scheme.location || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{scheme.survey_number}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{scheme.section_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(scheme.registration_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs">{formatDate(scheme.sealed_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/deeds/titles/draft?schemeId=${scheme.id}`}>
                        <Button variant="outline" size="sm">
                          Start Drafting
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm">
            <span className="font-semibold text-blue-600">ℹ️ Workflow:</span>{' '}
            <span className="text-muted-foreground">
              Select a scheme → Draft titles for each section → Submit for examination → Register approved titles → Generate certificates
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

