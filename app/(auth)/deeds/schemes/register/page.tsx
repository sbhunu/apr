/**
 * Sectional Scheme Registration Page (Module 3)
 * Deeds Office registers sealed surveys as legal schemes
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, CheckCircle2, FileText, Building2, MapPin } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { PROVINCE_CODES } from '@/lib/deeds/constants'

interface SealedSurvey {
  id: string
  survey_number: string
  title: string
  surveyor_name: string
  sealed_at: string
  seal_hash: string
  section_count?: number
  province_code?: string
}

export default function SchemeRegistrationPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<SealedSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<SealedSurvey | null>(null)
  const [registering, setRegistering] = useState(false)

  // Registration form state
  const [schemeName, setSchemeName] = useState('')
  const [provinceCode, setProvinceCode] = useState<string>('')
  const [custodianName, setCustodianName] = useState('')
  const [communalLandId, setCommunalLandId] = useState('')
  const [registeredAddress, setRegisteredAddress] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  useEffect(() => {
    loadSealedSurveys()
  }, [])

  useEffect(() => {
    if (selectedSurvey) {
      setSchemeName(selectedSurvey.title || '')
      setProvinceCode(selectedSurvey.province_code || 'HARARE')
    }
  }, [selectedSurvey])

  async function loadSealedSurveys() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/deeds/schemes/sealed')
      const data = await response.json()

      if (data.success) {
        setSurveys(data.surveys || [])
      } else {
        setError(data.error || 'Failed to load sealed surveys')
      }
    } catch (err) {
      setError('Failed to load sealed surveys')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    if (!selectedSurvey) {
      toast({
        title: 'Error',
        description: 'Please select a survey to register',
        variant: 'destructive',
      })
      return
    }

    if (!schemeName.trim()) {
      toast({
        title: 'Error',
        description: 'Scheme name is required',
        variant: 'destructive',
      })
      return
    }

    if (!provinceCode) {
      toast({
        title: 'Error',
        description: 'Province code is required',
        variant: 'destructive',
      })
      return
    }

    setRegistering(true)
    setError(null)

    try {
      const response = await fetch('/api/deeds/schemes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyPlanId: selectedSurvey.id,
          schemeName: schemeName.trim(),
          provinceCode,
          communalLandCustodianName: custodianName || undefined,
          communalLandId: communalLandId || undefined,
          registeredAddress: registeredAddress || undefined,
          contactEmail: contactEmail || undefined,
          contactPhone: contactPhone || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Scheme registered successfully',
          description: `Scheme number: ${data.schemeNumber}`,
        })
        // Reset form and reload
        setSelectedSurvey(null)
        setSchemeName('')
        setProvinceCode('')
        setCustodianName('')
        setCommunalLandId('')
        setRegisteredAddress('')
        setContactEmail('')
        setContactPhone('')
        loadSealedSurveys()
      } else {
        throw new Error(data.error || 'Registration failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register scheme'
      setError(errorMessage)
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setRegistering(false)
    }
  }

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString('en-ZW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sectional Scheme Registration</h1>
        <p className="text-muted-foreground mt-2">
          Register sealed surveys as legal sectional schemes and create Body Corporate entities
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Surveys */}
        <Card>
          <CardHeader>
            <CardTitle>Sealed Surveys Available for Registration</CardTitle>
            <CardDescription>
              Select a sealed survey to register as a sectional scheme
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading surveys...</div>
            ) : surveys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sealed surveys available for registration</p>
                <p className="text-sm mt-2">
                  Surveys must be sealed by the Surveyor-General before registration
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {surveys.map((survey) => (
                  <Card
                    key={survey.id}
                    className={`cursor-pointer transition-colors ${
                      selectedSurvey?.id === survey.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedSurvey(survey)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{survey.survey_number}</Badge>
                            {survey.section_count && (
                              <span className="text-sm text-muted-foreground">
                                {survey.section_count} sections
                              </span>
                            )}
                          </div>
                          <p className="font-medium">{survey.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Surveyor: {survey.surveyor_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Sealed: {formatDate(survey.sealed_at)}
                          </p>
                        </div>
                        {selectedSurvey?.id === survey.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Register Scheme</CardTitle>
            <CardDescription>
              Complete scheme registration details and create Body Corporate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSurvey ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="schemeName">Scheme Name *</Label>
                  <Input
                    id="schemeName"
                    value={schemeName}
                    onChange={(e) => setSchemeName(e.target.value)}
                    placeholder="Enter scheme name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provinceCode">Province *</Label>
                  <Select value={provinceCode} onValueChange={setProvinceCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCE_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custodianName">Communal Land Custodian Name</Label>
                  <Input
                    id="custodianName"
                    value={custodianName}
                    onChange={(e) => setCustodianName(e.target.value)}
                    placeholder="Enter custodian name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="communalLandId">Communal Land ID/Reference</Label>
                  <Input
                    id="communalLandId"
                    value={communalLandId}
                    onChange={(e) => setCommunalLandId(e.target.value)}
                    placeholder="Enter communal land ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registeredAddress">Registered Address</Label>
                  <Input
                    id="registeredAddress"
                    value={registeredAddress}
                    onChange={(e) => setRegisteredAddress(e.target.value)}
                    placeholder="Enter registered address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Enter contact phone"
                  />
                </div>

                <Button
                  onClick={handleRegister}
                  disabled={registering || !schemeName.trim() || !provinceCode}
                  className="w-full"
                >
                  {registering ? 'Registering...' : 'Register Scheme & Create Body Corporate'}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <Building2 className="h-3 w-3 inline mr-1" />
                    This will create a Body Corporate automatically
                  </p>
                  <p>
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Scheme number will be allocated automatically
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a sealed survey to begin registration</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

