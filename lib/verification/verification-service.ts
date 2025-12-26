/**
 * Certificate Verification Service
 * Public certificate verification with fraud detection
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { verifySignature } from '@/lib/signatures/signature-service'
import { createHash } from 'crypto'
import {
  VerificationResult,
  VerificationRequest,
  VerificationHistoryEntry,
  FraudDetectionResult,
} from './types'

/**
 * Parse QR code data to extract verification parameters
 */
function parseQRCodeData(qrData: string): {
  titleId?: string
  hash?: string
  certificateNumber?: string
} {
  try {
    // QR code format: /verify/certificate/{titleId}?hash={hash}
    // Or: {baseUrl}/verify/certificate/{titleId}?hash={hash}
    const url = new URL(qrData.startsWith('http') ? qrData : `http://example.com${qrData}`)
    const pathParts = url.pathname.split('/')
    const titleIdIndex = pathParts.indexOf('certificate')
    const titleId = titleIdIndex >= 0 && pathParts[titleIdIndex + 1] ? pathParts[titleIdIndex + 1] : undefined
    const hash = url.searchParams.get('hash') || undefined

    return { titleId, hash }
  } catch (error) {
    // Try to extract certificate number if it's not a URL
    return { certificateNumber: qrData }
  }
}

/**
 * Detect fraud patterns
 */
function detectFraud(
  verificationResult: VerificationResult,
  verificationHistory: VerificationHistoryEntry[],
  ipAddress?: string
): FraudDetectionResult {
  const reasons: string[] = []
  const suspiciousPatterns: string[] = []
  let riskLevel: 'low' | 'medium' | 'high' = 'low'

  // Check if certificate is invalid
  if (!verificationResult.valid) {
    reasons.push('Certificate verification failed')
    riskLevel = 'high'
  }

  // Check if hash is invalid
  if (!verificationResult.hashValid) {
    reasons.push('Certificate hash mismatch - document may have been tampered with')
    riskLevel = 'high'
  }

  // Check if signature is invalid
  if (verificationResult.signatureValid === false) {
    reasons.push('Digital signature verification failed')
    riskLevel = 'high'
  }

  // Check if certificate is revoked or superseded
  if (verificationResult.certificateStatus === 'revoked') {
    reasons.push('Certificate has been revoked')
    riskLevel = 'high'
  }

  if (verificationResult.certificateStatus === 'superseded') {
    reasons.push('Certificate has been superseded by a newer version')
    riskLevel = 'medium'
  }

  // Check for excessive verification attempts from same IP
  if (ipAddress) {
    const recentAttempts = verificationHistory.filter(
      (entry) =>
        entry.ipAddress === ipAddress &&
        new Date(entry.verifiedAt).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    )
    if (recentAttempts.length > 10) {
      suspiciousPatterns.push('Excessive verification attempts from same IP address')
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
    }
  }

  // Check for rapid repeated verifications
  if (verificationHistory.length > 0) {
    const recentVerifications = verificationHistory.slice(-5)
    const timeSpan =
      new Date(recentVerifications[0].verifiedAt).getTime() -
      new Date(recentVerifications[recentVerifications.length - 1].verifiedAt).getTime()
    if (timeSpan < 60000 && recentVerifications.length >= 5) {
      // 5 verifications in less than 1 minute
      suspiciousPatterns.push('Rapid repeated verification attempts')
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel
    }
  }

  return {
    fraudDetected: reasons.length > 0 || suspiciousPatterns.length > 0,
    riskLevel,
    reasons,
    suspiciousPatterns,
  }
}

/**
 * Verify certificate
 */
export async function verifyCertificate(
  request: VerificationRequest,
  options?: {
    ipAddress?: string
    userAgent?: string
  }
): Promise<{
  success: boolean
  result?: VerificationResult
  fraudDetection?: FraudDetectionResult
  error?: string
}> {
  return monitor('verify_certificate', async () => {
    const supabase = await createClient()

    try {
      let titleId: string | undefined
      let certificateHash: string | undefined

      // Parse request
      if (request.qrCodeData) {
        const parsed = parseQRCodeData(request.qrCodeData)
        titleId = parsed.titleId
        certificateHash = parsed.hash
      } else {
        titleId = request.titleId
        certificateHash = request.certificateHash
      }

      // If certificate number provided, look up title ID
      if (request.certificateNumber && !titleId) {
        const { data: title } = await supabase
          .from('apr.sectional_titles')
          .select('id, certificate_hash')
          .eq('title_number', request.certificateNumber)
          .eq('registration_status', 'registered')
          .single()

        if (title) {
          titleId = title.id
          certificateHash = title.certificate_hash || certificateHash
        }
      }

      if (!titleId) {
        return {
          success: false,
          error: 'Certificate not found. Please check the certificate number or scan the QR code again.',
        }
      }

      // Get title with certificate information
      const { data: title, error: titleError } = await supabase
        .from('apr.sectional_titles')
        .select(`
          id,
          title_number,
          registration_number,
          registration_date,
          holder_name,
          certificate_hash,
          certificate_url,
          qr_code,
          digital_signature_id,
          registration_status,
          apr.sections!inner(
            section_number,
            apr.sectional_schemes!inner(
              scheme_number,
              scheme_name
            )
          )
        `)
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Certificate not found',
        }
      }

      // Check certificate status
      let certificateStatus: 'active' | 'revoked' | 'superseded' | 'unknown' = 'unknown'
      if (title.registration_status === 'registered') {
        certificateStatus = 'active'
      } else if (title.registration_status === 'cancelled') {
        certificateStatus = 'revoked'
      }

      // Verify hash
      const storedHash = title.certificate_hash
      const hashValid = storedHash ? storedHash === certificateHash : false

      // Verify signature if present
      let signatureValid: boolean | undefined
      if (title.digital_signature_id) {
        const sigResult = await verifySignature(title.digital_signature_id)
        signatureValid = sigResult.verified
      }

      const result: VerificationResult = {
        valid: hashValid && (signatureValid !== false) && certificateStatus === 'active',
        certificateFound: true,
        hashValid,
        signatureValid,
        certificateStatus,
        titleNumber: title.title_number,
        schemeNumber: (title.sections as any)?.sectional_schemes?.scheme_number,
        sectionNumber: (title.sections as any)?.section_number,
        holderName: title.holder_name,
        registrationDate: title.registration_date,
        certificateHash: storedHash,
        signatureId: title.digital_signature_id,
        errors: [],
        warnings: [],
      }

      // Add errors and warnings
      if (!hashValid) {
        result.errors?.push('Certificate hash mismatch - document may have been tampered with')
      }
      if (signatureValid === false) {
        result.errors?.push('Digital signature verification failed')
      }
      if (certificateStatus !== 'active') {
        result.errors?.push(`Certificate status: ${certificateStatus}`)
      }
      if (signatureValid === undefined && title.digital_signature_id) {
        result.warnings?.push('Signature verification could not be completed')
      }

      // Get verification history for fraud detection
      const { data: history } = await supabase
        .from('apr.verification_history')
        .select('*')
        .eq('title_id', titleId)
        .order('verified_at', { ascending: false })
        .limit(20)

      // Detect fraud
      const fraudDetection = detectFraud(
        result,
        (history || []) as VerificationHistoryEntry[],
        options?.ipAddress
      )

      // Log verification attempt
      await logVerificationAttempt(titleId, result, fraudDetection, options)

      return {
        success: true,
        result,
        fraudDetection,
      }
    } catch (error) {
      logger.error('Exception verifying certificate', error as Error, { request })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Log verification attempt
 */
async function logVerificationAttempt(
  titleId: string,
  result: VerificationResult,
  fraudDetection: FraudDetectionResult,
  options?: {
    ipAddress?: string
    userAgent?: string
  }
): Promise<void> {
  const supabase = await createClient()

  try {
    await supabase.from('apr.verification_history').insert({
      title_id: titleId,
      certificate_number: result.titleNumber,
      verified_at: new Date().toISOString(),
      ip_address: options?.ipAddress,
      user_agent: options?.userAgent,
      verification_result: result,
      fraud_detected: fraudDetection.fraudDetected,
      fraud_reason: fraudDetection.reasons.join('; '),
      risk_level: fraudDetection.riskLevel,
    })
  } catch (error) {
    logger.error('Failed to log verification attempt', error as Error, { titleId })
    // Don't fail verification if logging fails
  }
}

/**
 * Get verification history for a certificate
 */
export async function getVerificationHistory(
  titleId: string,
  limit: number = 50
): Promise<{
  success: boolean
  history?: VerificationHistoryEntry[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: history, error } = await supabase
      .from('apr.verification_history')
      .select('*')
      .eq('title_id', titleId)
      .order('verified_at', { ascending: false })
      .limit(limit)

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      history: (history || []) as VerificationHistoryEntry[],
    }
  } catch (error) {
    logger.error('Exception getting verification history', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

