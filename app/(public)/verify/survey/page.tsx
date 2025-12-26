/**
 * Public Survey Verification Page
 * Allows stakeholders to verify sealed survey plans by plan number.
 */

'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SurveyVerificationResult {
  success: boolean
  survey?: {
    plan_number: string
    planner_name: string
    status: string
    approved_at?: string
    sealed_at?: string
    seal_hash?: string
    metadata?: {
      topologyValidation?: {
        validatedAt?: string
        errorLocations?: Array<{ description: string }>
      }
    }
  }
  signatures?: Array<{
    signature_id?: string
    signature_status?: string
    certificate_serial?: string
    signed_at?: string
    signer_name?: string
    signer_role?: string
  }>
  error?: string
}

export default function SurveyVerificationPage() {
  const [planNumber, setPlanNumber] = useState('')
  const [result, setResult] = useState<SurveyVerificationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!planNumber.trim()) {
      setResult({ success: false, error: 'Enter a plan number' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/survey/verify/${planNumber.trim()}`)
      const data = await response.json()

      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Survey Verification</CardTitle>
          <CardDescription>
            Verify that a survey plan is sealed and signed by the Surveyor-General.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Enter plan number (e.g., PLAN-000123)"
              value={planNumber}
              onChange={(event) => setPlanNumber(event.target.value)}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
          </div>
          {result && !result.success && (
            <Alert variant="destructive">
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result?.success && result.survey && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Result</CardTitle>
            <CardDescription>Sealed survey details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Plan Number</p>
                <p className="font-semibold">{result.survey.plan_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Planner</p>
                <p className="font-semibold">{result.survey.planner_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Status</p>
                <Badge variant={result.survey.status === 'sealed' ? 'success' : 'outline'}>
                  {result.survey.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Sealed at</p>
                <p>{result.survey.sealed_at || 'Not sealed'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Seal hash</p>
                <p className="text-xs break-words">{result.survey.seal_hash || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Validated at</p>
                <p>
                  {result.survey.metadata?.topologyValidation?.validatedAt ||
                    'Validation not run'}
                </p>
              </div>
            </div>

            {result.signatures && result.signatures.length > 0 && (
              <div>
                <h3 className="text-base font-semibold mb-2">Signature log</h3>
                <ScrollArea className="max-h-36 rounded border border-border p-2">
                  <ul className="space-y-2 text-sm">
                    {result.signatures.map((sig, index) => (
                      <li key={index} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{sig.signer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sig.signer_role} • {sig.signature_status}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>{sig.certificate_serial}</p>
                          <p>{sig.signed_at}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

