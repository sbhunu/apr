/**
 * Digital Signature Types
 * Types for PKI-based digital signatures in approval workflows
 */

/**
 * Signature metadata
 */
export interface SignatureMetadata {
  signerId: string
  signerName: string
  signerRole: string
  signedAt: string
  certificateSerial?: string
  certificateChain?: string[]
  signatureValue?: string
  signatureId?: string
  documentHash: string
  documentId: string
  documentType: 'planning_approval' | 'survey_seal' | 'deeds_registration' | 'title_certificate'
  workflowStage: string
  approvalType?: 'approve' | 'reject' | 'seal' | 'register'
  notes?: string
}

/**
 * Signature status
 */
export type SignatureStatus = 'pending' | 'signed' | 'verified' | 'invalid' | 'revoked'

/**
 * Signature record
 */
export interface SignatureRecord {
  id: string
  documentId: string
  documentType: string
  workflowStage: string
  signerId: string
  signerName: string
  signerRole: string
  signedAt: string
  signatureStatus: SignatureStatus
  certificateSerial?: string
  certificateChain?: string[]
  signatureValue?: string
  signatureId?: string
  documentHash: string
  verifiedAt?: string
  verifiedBy?: string
  verificationResult?: {
    valid: boolean
    verified: boolean
    error?: string
  }
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * Batch signing request
 */
export interface BatchSigningRequest {
  documentIds: string[]
  documentType: string
  signerId: string
  signerRole: string
  workflowStage: string
  notes?: string
}

/**
 * Batch signing result
 */
export interface BatchSigningResult {
  success: boolean
  signed: number
  failed: number
  signatures: Array<{
    documentId: string
    success: boolean
    signatureId?: string
    error?: string
  }>
}

/**
 * Signature audit trail entry
 */
export interface SignatureAuditEntry {
  id: string
  signatureId: string
  action: 'created' | 'verified' | 'revoked' | 'updated'
  actorId: string
  actorName: string
  timestamp: string
  details?: Record<string, unknown>
  notes?: string
}

