/**
 * Verification Landing Page
 * Entry point for certificate verification
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, FileText, Shield, CheckCircle2 } from 'lucide-react'

export default function VerificationLandingPage() {
  const router = useRouter()
  const [certificateNumber, setCertificateNumber] = useState('')

  function handleVerify() {
    if (certificateNumber.trim()) {
      router.push(`/verify/certificate?number=${encodeURIComponent(certificateNumber.trim())}`)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Certificate Verification Portal</h1>
        <p className="text-muted-foreground text-lg">
          Verify the authenticity of Sectional Title Certificates issued by the Automated Property
          Registration System
        </p>
      </div>

      {/* Main Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Certificate</CardTitle>
          <CardDescription>
            Enter certificate number or scan QR code to verify authenticity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Certificate Number Input */}
          <div className="space-y-2">
            <Label htmlFor="certificateNumber">Certificate Number</Label>
            <div className="flex gap-2">
              <Input
                id="certificateNumber"
                placeholder="Enter certificate number (e.g., TITLE-2024-001)"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="flex-1"
              />
              <Button onClick={handleVerify} disabled={!certificateNumber.trim()}>
                <FileText className="h-4 w-4 mr-2" />
                Verify
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

          {/* QR Code Scan */}
          <div className="space-y-2">
            <Label>Scan QR Code</Label>
            <Button variant="outline" className="w-full" onClick={() => router.push('/verify/qr')}>
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code from Certificate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Secure Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All certificates are verified using cryptographic hashes and digital signatures to
              ensure authenticity.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CheckCircle2 className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Instant Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get immediate verification results with detailed certificate information and status
              checks.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <CardTitle className="text-lg">Complete Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View certificate details including holder information, registration date, and scheme
              information.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

