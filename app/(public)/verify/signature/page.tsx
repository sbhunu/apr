/**
 * Digital Signature Validation Page
 * Public page for validating digital signatures through PKI
 */

'use client'

import { useState } from 'react'
import VerificationsLayout from '@/components/layouts/VerificationsLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  FileText,
  User,
  Calendar,
  Key,
  AlertTriangle,
} from 'lucide-react'

interface VerificationResult {
  success: boolean
  verified?: boolean
  valid?: boolean
  signature?: {
    id: string
    documentId: string
    documentType: string
    workflowStage: string
    signerName: string
    signerRole: string
    signedAt: string
    certificateSerial?: string
    pkiProvider?: string
    status: string
  }
  verification?: {
    pkiVerified?: boolean
    pkiValid?: boolean
    revocationStatus?: string
    certificateSerial?: string
    signerName?: string
    signerRole?: string
    timestamp?: string
    error?: string
  }
  databaseVerification?: {
    verified?: boolean
    valid?: boolean
    error?: string
  }
  error?: string
}

export default function SignatureValidationPage() {
  const [signatureId, setSignatureId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)

  const handleVerify = async () => {
    if (!signatureId.trim()) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/public/signatures/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signatureId: signatureId.trim() }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify signature',
        verified: false,
        valid: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <VerificationsLayout
      currentPage="signature"
      heroTitle="Digital Signature Validation"
      heroDescription="Verify the authenticity and validity of digital signatures through PKI (Public Key Infrastructure) validation. Enter a signature ID to check its status, certificate validity, and revocation status.">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Search Form */}
      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter Signature ID (UUID)..."
                value={signatureId}
                onChange={(e) => setSignatureId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={handleVerify} disabled={loading || !signatureId.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify Signature
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Verification Results */}
      {result && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Alert
            variant={result.verified && result.valid ? 'default' : 'destructive'}
            className={
              result.verified && result.valid
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }
          >
            <div className="flex items-start gap-3">
              {result.verified && result.valid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertTitle className="text-lg font-semibold">
                  {result.verified && result.valid
                    ? 'Signature Valid and Verified'
                    : 'Signature Invalid or Unverified'}
                </AlertTitle>
                <AlertDescription className="mt-2">
                  {result.verified && result.valid ? (
                    <p>
                      This digital signature has been successfully verified through PKI validation.
                      The signature is valid, the certificate is active, and the document integrity is confirmed.
                    </p>
                  ) : (
                    <p>
                      {result.error ||
                        'The signature could not be verified or is invalid. This may be due to certificate revocation, expiration, or PKI service unavailability.'}
                    </p>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Signature Details */}
          {result.signature && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Signature Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Signature ID</label>
                  <p className="font-mono text-sm mt-1">{result.signature.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        result.signature.status === 'verified'
                          ? 'default'
                          : result.signature.status === 'signed'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {result.signature.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document Type</label>
                  <p className="text-sm mt-1 capitalize">{result.signature.documentType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Workflow Stage</label>
                  <p className="text-sm mt-1 capitalize">{result.signature.workflowStage}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Signer
                  </label>
                  <p className="text-sm mt-1">{result.signature.signerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Role: {result.signature.signerRole}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Signed At
                  </label>
                  <p className="text-sm mt-1">
                    {new Date(result.signature.signedAt).toLocaleString()}
                  </p>
                </div>
                {result.signature.certificateSerial && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Key className="h-4 w-4" />
                      Certificate Serial
                    </label>
                    <p className="font-mono text-xs mt-1">{result.signature.certificateSerial}</p>
                  </div>
                )}
                {result.signature.pkiProvider && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">PKI Provider</label>
                    <p className="text-sm mt-1">{result.signature.pkiProvider}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* PKI Verification Details */}
          {result.verification && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                PKI Verification Results
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PKI Verification</span>
                  <Badge variant={result.verification.pkiVerified ? 'default' : 'destructive'}>
                    {result.verification.pkiVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Certificate Validity</span>
                  <Badge variant={result.verification.pkiValid ? 'default' : 'destructive'}>
                    {result.verification.pkiValid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
                {result.verification.revocationStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Revocation Status</span>
                    <Badge
                      variant={
                        result.verification.revocationStatus === 'valid'
                          ? 'default'
                          : result.verification.revocationStatus === 'revoked'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {result.verification.revocationStatus}
                    </Badge>
                  </div>
                )}
                {result.verification.signerName && (
                  <div>
                    <span className="text-sm font-medium">Verified Signer</span>
                    <p className="text-sm mt-1">{result.verification.signerName}</p>
                    {result.verification.signerRole && (
                      <p className="text-xs text-muted-foreground">
                        Role: {result.verification.signerRole}
                      </p>
                    )}
                  </div>
                )}
                {result.verification.timestamp && (
                  <div>
                    <span className="text-sm font-medium">Verification Timestamp</span>
                    <p className="text-sm mt-1">
                      {new Date(result.verification.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
                {result.verification.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Verification Error</AlertTitle>
                    <AlertDescription>{result.verification.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          )}

          {/* Database Verification */}
          {result.databaseVerification && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Database Verification</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database Status</span>
                  <Badge
                    variant={result.databaseVerification.verified ? 'default' : 'destructive'}
                  >
                    {result.databaseVerification.verified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Record Validity</span>
                  <Badge variant={result.databaseVerification.valid ? 'default' : 'destructive'}>
                    {result.databaseVerification.valid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
                {result.databaseVerification.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Error</AlertTitle>
                    <AlertDescription>{result.databaseVerification.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Instructions */}
      {!result && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Obtain the Signature ID from the document or certificate you wish to verify</li>
            <li>Enter the Signature ID in the search field above</li>
            <li>Click "Verify Signature" to initiate PKI validation</li>
            <li>
              Review the verification results, including certificate validity, revocation status, and
              signer information
            </li>
          </ol>
        </Card>
      )}
      </div>
    </VerificationsLayout>
  )
}

