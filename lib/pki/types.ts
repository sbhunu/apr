/**
 * PKI Integration Type Definitions
 * Defines types for EJBCA integration and digital signatures
 */

/**
 * PKI provider type
 */
export type PKIProvider = 'ejbca' | 'manual' | 'fallback'

/**
 * Certificate enrollment request
 */
export interface CertificateEnrollmentRequest {
  userId: string
  userName: string
  userEmail: string
  role: string
  organization?: string
  certificateProfile?: string
  endEntityProfile?: string
  validityPeriod?: number // Days
}

/**
 * Certificate enrollment response
 */
export interface CertificateEnrollmentResponse {
  success: boolean
  certificateId?: string
  certificateSerial?: string
  certificateChain?: string[]
  certificatePEM?: string
  error?: string
}

/**
 * Document signing request
 */
export interface DocumentSigningRequest {
  documentHash: string
  documentId: string
  signerId: string
  signerRole: string
  signerName: string
  certificateSerial?: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

/**
 * Document signing response
 */
export interface DocumentSigningResponse {
  success: boolean
  signatureId?: string
  signatureValue?: string
  certificateSerial?: string
  certificateChain?: string[]
  timestamp?: string
  error?: string
}

/**
 * Signature verification request
 */
export interface SignatureVerificationRequest {
  signatureId: string
  documentHash: string
  certificateSerial?: string
}

/**
 * Signature verification response
 */
export interface SignatureVerificationResponse {
  valid: boolean
  verified: boolean
  certificateSerial?: string
  signerName?: string
  signerRole?: string
  timestamp?: string
  revocationStatus?: 'valid' | 'revoked' | 'expired' | 'unknown'
  error?: string
}

/**
 * Certificate revocation request
 */
export interface CertificateRevocationRequest {
  certificateSerial: string
  revocationReason?: string
}

/**
 * Certificate revocation response
 */
export interface CertificateRevocationResponse {
  success: boolean
  revokedAt?: string
  error?: string
}

/**
 * PKI service status
 */
export interface PKIServiceStatus {
  available: boolean
  provider: PKIProvider
  lastChecked?: string
  error?: string
}

/**
 * Manual signature fallback data
 */
export interface ManualSignatureData {
  signerName: string
  signerRole: string
  signerId: string
  signedAt: string
  signatureImage?: string // Base64 encoded image
  witnessName?: string
  witnessId?: string
  notes?: string
}

