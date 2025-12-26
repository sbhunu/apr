/**
 * Certificate Verification Types
 * Types for public certificate verification portal
 */

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean
  certificateFound: boolean
  hashValid: boolean
  signatureValid?: boolean
  certificateStatus: 'active' | 'revoked' | 'superseded' | 'unknown'
  titleNumber?: string
  schemeNumber?: string
  sectionNumber?: string
  holderName?: string
  registrationDate?: string
  certificateHash?: string
  signatureId?: string
  errors?: string[]
  warnings?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Verification request
 */
export interface VerificationRequest {
  certificateNumber?: string
  titleId?: string
  certificateHash?: string
  qrCodeData?: string
}

/**
 * Verification history entry
 */
export interface VerificationHistoryEntry {
  id: string
  certificateNumber?: string
  titleId?: string
  verifiedAt: string
  ipAddress?: string
  userAgent?: string
  result: VerificationResult
  fraudDetected: boolean
  fraudReason?: string
}

/**
 * Fraud detection result
 */
export interface FraudDetectionResult {
  fraudDetected: boolean
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
  suspiciousPatterns: string[]
}

