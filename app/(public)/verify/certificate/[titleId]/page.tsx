/**
 * Public Certificate Verification Page
 * Public portal for certificate authenticity verification
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  Calendar,
  User,
  Hash,
  QrCode,
  Loader2,
} from 'lucide-react'
import { VerificationResult, FraudDetectionResult } from '@/lib/verification/types'

export default function CertificateVerificationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const titleId = params.titleId as string
  const hash = searchParams.get('hash')

  const [certificateNumber, setCertificateNumber] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [verificationMethod, setVerificationMethod] = useState<'number' | 'qr' | 'auto'>('auto')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [fraudDetection, setFraudDetection] = useState<FraudDetectionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Auto-verify if titleId and hash are in URL
    if (titleId && hash && verificationMethod === 'auto') {
      handleVerify({ titleId, certificateHash: hash })
      setVerificationMethod('number') // Prevent re-triggering
    }
  }, [titleId, hash])

  async function handleVerify(request: {
    certificateNumber?: string
    titleId?: string
    certificateHash?: string
    qrCodeData?: string
  }) {
    setLoading(true)
    setError(null)
    setResult(null)
    setFraudDetection(null)

    try {
      const response = await fetch('/api/verify/certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || 'Verification failed')
        return
      }

      setResult(data.result)
      setFraudDetection(data.fraudDetection)
    } catch (err) {
      setError('Failed to verify certificate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleNumberVerify() {
    if (!certificateNumber.trim()) {
      setError('Please enter a certificate number')
      return
    }
    handleVerify({ certificateNumber: certificateNumber.trim() })
  }

  function handleQRVerify() {
    if (!qrCodeData.trim()) {
      setError('Please enter QR code data or scan QR code')
      return
    }
    handleVerify({ qrCodeData: qrCodeData.trim() })
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Certificate Verification Portal</h1>
        <p className="text-muted-foreground">
          Verify the authenticity of Sectional Title Certificates
        </p>
      </div>

      {/* Verification Methods */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>Verify Certificate</CardTitle>
            <CardDescription>
              Enter certificate number or scan QR code to verify authenticity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Certificate Number Method */}
            <div className="space-y-2">
              <Label htmlFor="certificateNumber">Certificate Number</Label>
              <div className="flex gap-2">
                <Input
                  id="certificateNumber"
                  placeholder="Enter certificate number (e.g., TITLE-2024-001)"
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNumberVerify()}
                />
                <Button onClick={handleNumberVerify} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* QR Code Method */}
            <div className="space-y-2">
              <Label htmlFor="qrCode">QR Code Data</Label>
              <div className="flex gap-2">
                <Input
                  id="qrCode"
                  placeholder="Scan QR code or paste verification URL"
                  value={qrCodeData}
                  onChange={(e) => setQrCodeData(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQRVerify()}
                />
                <Button onClick={handleQRVerify} disabled={loading} variant="outline">
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan QR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Verification Result */}
      {result && (
        <div className="space-y-6">
          {/* Main Result Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Verification Result</CardTitle>
                {result.valid ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-4 w-4 mr-1" />
                    Invalid
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Certificate Details */}
              {result.certificateFound && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.titleNumber && (
                    <div>
                      <Label className="text-muted-foreground">Title Number</Label>
                      <p className="font-semibold">{result.titleNumber}</p>
                    </div>
                  )}
                  {result.schemeNumber && (
                    <div>
                      <Label className="text-muted-foreground">Scheme Number</Label>
                      <p className="font-semibold">{result.schemeNumber}</p>
                    </div>
                  )}
                  {result.sectionNumber && (
                    <div>
                      <Label className="text-muted-foreground">Section Number</Label>
                      <p className="font-semibold">{result.sectionNumber}</p>
                    </div>
                  )}
                  {result.holderName && (
                    <div>
                      <Label className="text-muted-foreground">Holder Name</Label>
                      <p className="font-semibold">{result.holderName}</p>
                    </div>
                  )}
                  {result.registrationDate && (
                    <div>
                      <Label className="text-muted-foreground">Registration Date</Label>
                      <p className="font-semibold">
                        {new Date(result.registrationDate).toLocaleDateString('en-ZW')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Verification Checks */}
              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold">Verification Checks</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {result.hashValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>Certificate Hash: {result.hashValid ? 'Valid' : 'Invalid'}</span>
                  </div>
                  {result.signatureValid !== undefined && (
                    <div className="flex items-center gap-2">
                      {result.signatureValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>
                        Digital Signature: {result.signatureValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {result.certificateStatus === 'active' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span>Certificate Status: {result.certificateStatus}</span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Verification Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warnings</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {result.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Fraud Detection */}
              {fraudDetection && fraudDetection.fraudDetected && (
                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Fraud Detection Alert</AlertTitle>
                  <AlertDescription>
                    <p className="font-semibold mb-2">
                      Risk Level: {fraudDetection.riskLevel.toUpperCase()}
                    </p>
                    {fraudDetection.reasons.length > 0 && (
                      <div className="mb-2">
                        <p className="font-semibold">Reasons:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {fraudDetection.reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fraudDetection.suspiciousPatterns.length > 0 && (
                      <div>
                        <p className="font-semibold">Suspicious Patterns:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {fraudDetection.suspiciousPatterns.map((pattern, i) => (
                            <li key={i}>{pattern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Verify Another Certificate */}
          <div className="flex justify-center">
            <Button
              onClick={() => {
                setResult(null)
                setFraudDetection(null)
                setError(null)
                setCertificateNumber('')
                setQrCodeData('')
              }}
              variant="outline"
            >
              Verify Another Certificate
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
