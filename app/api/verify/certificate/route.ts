/**
 * Verify Certificate API Route
 * Public API for certificate verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCertificate } from '@/lib/verification/verification-service'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/verify/certificate - Verify certificate
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { certificateNumber, titleId, certificateHash, qrCodeData } = body

  if (!certificateNumber && !titleId && !qrCodeData) {
    return NextResponse.json(
      {
        success: false,
        error: 'Certificate number, title ID, or QR code data is required',
      },
      { status: 400 }
    )
  }

  // Extract IP address and user agent
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    undefined
  const userAgent = request.headers.get('user-agent') || undefined

  const result = await verifyCertificate(
    {
      certificateNumber,
      titleId,
      certificateHash,
      qrCodeData,
    },
    {
      ipAddress,
      userAgent,
    }
  )

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    result: result.result,
    fraudDetection: result.fraudDetection,
  })
})

