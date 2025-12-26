/**
 * Digital Signature Service
 * Integrates PKI signatures into approval workflows
 */

import { createClient } from '@/lib/supabase/server'
import { createPKIManager } from '@/lib/pki/pki-manager'
import { DocumentSigningRequest } from '@/lib/pki/types'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import {
  SignatureMetadata,
  SignatureRecord,
  SignatureStatus,
  BatchSigningRequest,
  BatchSigningResult,
  SignatureAuditEntry,
} from './types'
import { createHash } from 'crypto'

const pkiManager = createPKIManager()

/**
 * Generate document hash for signing
 */
function generateDocumentHash(documentId: string, documentData: Record<string, unknown>): string {
  const hashInput = JSON.stringify({
    documentId,
    ...documentData,
    timestamp: new Date().toISOString(),
  })
  return createHash('sha256').update(hashInput).digest('hex')
}

/**
 * Sign document with PKI
 */
export async function signDocument(
  metadata: SignatureMetadata
): Promise<{
  success: boolean
  signatureId?: string
  error?: string
}> {
  return monitor('sign_document', async () => {
    const supabase = await createClient()

    try {
      // Prepare PKI signing request
      const signingRequest: DocumentSigningRequest = {
        documentHash: metadata.documentHash,
        documentId: metadata.documentId,
        signerId: metadata.signerId,
        signerRole: metadata.signerRole,
        signerName: metadata.signerName,
        certificateSerial: metadata.certificateSerial,
        timestamp: metadata.signedAt,
        metadata: {
          documentType: metadata.documentType,
          workflowStage: metadata.workflowStage,
          approvalType: metadata.approvalType,
          notes: metadata.notes,
        },
      }

      // Sign via PKI
      const pkiResult = await pkiManager.signDocument(signingRequest)

      if (!pkiResult.success) {
        // Create signature record with pending status if PKI fails
        const { data: signatureRecord, error: createError } = await supabase
          .from('apr.digital_signatures')
          .insert({
            document_id: metadata.documentId,
            document_type: metadata.documentType,
            workflow_stage: metadata.workflowStage,
            signer_id: metadata.signerId,
            signer_name: metadata.signerName,
            signer_role: metadata.signerRole,
            signed_at: metadata.signedAt,
            signature_status: 'pending',
            document_hash: metadata.documentHash,
            certificate_serial: metadata.certificateSerial,
            certificate_chain: metadata.certificateChain || [],
            metadata: {
              approvalType: metadata.approvalType,
              notes: metadata.notes,
              pkiError: pkiResult.error,
            },
          })
          .select('id')
          .single()

        if (createError) {
          logger.error('Failed to create signature record', createError, { metadata })
          return {
            success: false,
            error: `Failed to create signature record: ${createError.message}`,
          }
        }

        // Log audit trail
        await logSignatureAudit(signatureRecord.id, 'created', metadata.signerId, metadata.signerName, {
          status: 'pending',
          pkiError: pkiResult.error,
        })

        return {
          success: false,
          error: pkiResult.error || 'PKI signing failed',
        }
      }

      // Create signature record with signed status
      const { data: signatureRecord, error: createError } = await supabase
        .from('apr.digital_signatures')
        .insert({
          document_id: metadata.documentId,
          document_type: metadata.documentType,
          workflow_stage: metadata.workflowStage,
          signer_id: metadata.signerId,
          signer_name: metadata.signerName,
          signer_role: metadata.signerRole,
          signed_at: metadata.signedAt,
          signature_status: 'signed',
          document_hash: metadata.documentHash,
          signature_id: pkiResult.signatureId,
          signature_value: pkiResult.signatureValue,
          certificate_serial: pkiResult.certificateSerial,
          certificate_chain: pkiResult.certificateChain || [],
          metadata: {
            approvalType: metadata.approvalType,
            notes: metadata.notes,
          },
        })
        .select('id')
        .single()

      if (createError) {
        logger.error('Failed to create signature record', createError, { metadata })
        return {
          success: false,
          error: `Failed to create signature record: ${createError.message}`,
        }
      }

      // Log audit trail
      await logSignatureAudit(signatureRecord.id, 'created', metadata.signerId, metadata.signerName, {
        status: 'signed',
        signatureId: pkiResult.signatureId,
        certificateSerial: pkiResult.certificateSerial,
      })

      logger.info('Document signed successfully', {
        documentId: metadata.documentId,
        signatureId: pkiResult.signatureId,
        signerId: metadata.signerId,
      })

      return {
        success: true,
        signatureId: signatureRecord.id,
      }
    } catch (error) {
      logger.error('Exception signing document', error as Error, { metadata })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Verify signature
 */
export async function verifySignature(
  signatureId: string
): Promise<{
  success: boolean
  valid?: boolean
  verified?: boolean
  error?: string
}> {
  return monitor('verify_signature', async () => {
    const supabase = await createClient()

    try {
      // Get signature record
      const { data: signature, error: fetchError } = await supabase
        .from('apr.digital_signatures')
        .select('*')
        .eq('id', signatureId)
        .single()

      if (fetchError || !signature) {
        return {
          success: false,
          error: fetchError?.message || 'Signature not found',
        }
      }

      // Verify via PKI if signature exists
      if (signature.signature_id && signature.document_hash) {
        const pkiResult = await pkiManager.verifySignature({
          signatureId: signature.signature_id,
          documentHash: signature.document_hash,
          certificateSerial: signature.certificate_serial,
        })

        // Update signature status
        const newStatus: SignatureStatus = pkiResult.verified ? 'verified' : 'invalid'
        const { error: updateError } = await supabase
          .from('apr.digital_signatures')
          .update({
            signature_status: newStatus,
            verified_at: new Date().toISOString(),
            verification_result: {
              valid: pkiResult.valid,
              verified: pkiResult.verified,
              error: pkiResult.error,
            },
          })
          .eq('id', signatureId)

        if (updateError) {
          logger.error('Failed to update signature verification', updateError, { signatureId })
        }

        // Log audit trail
        await logSignatureAudit(signatureId, 'verified', signature.signer_id, signature.signer_name, {
          verified: pkiResult.verified,
          valid: pkiResult.valid,
          error: pkiResult.error,
        })

        return {
          success: true,
          valid: pkiResult.valid,
          verified: pkiResult.verified,
          error: pkiResult.error,
        }
      }

      // No PKI signature - check if pending
      if (signature.signature_status === 'pending') {
        return {
          success: true,
          valid: false,
          verified: false,
          error: 'Signature pending PKI signing',
        }
      }

      return {
        success: true,
        valid: false,
        verified: false,
        error: 'No PKI signature found',
      }
    } catch (error) {
      logger.error('Exception verifying signature', error as Error, { signatureId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Batch sign multiple documents
 */
export async function batchSignDocuments(
  request: BatchSigningRequest
): Promise<BatchSigningResult> {
  return monitor('batch_sign_documents', async () => {
    const results: BatchSigningResult = {
      success: true,
      signed: 0,
      failed: 0,
      signatures: [],
    }

    for (const documentId of request.documentIds) {
      // Generate document hash (would need to fetch document data)
      const documentHash = generateDocumentHash(documentId, {})

      const metadata: SignatureMetadata = {
        documentId,
        documentType: request.documentType as SignatureMetadata['documentType'],
        workflowStage: request.workflowStage,
        signerId: request.signerId,
        signerName: '', // Would fetch from user profile
        signerRole: request.signerRole,
        signedAt: new Date().toISOString(),
        documentHash,
        notes: request.notes,
      }

      const result = await signDocument(metadata)

      if (result.success) {
        results.signed++
        results.signatures.push({
          documentId,
          success: true,
          signatureId: result.signatureId,
        })
      } else {
        results.failed++
        results.signatures.push({
          documentId,
          success: false,
          error: result.error,
        })
      }
    }

    return results
  })
}

/**
 * Get signature record
 */
export async function getSignature(
  signatureId: string
): Promise<{
  success: boolean
  signature?: SignatureRecord
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: signature, error } = await supabase
      .from('apr.digital_signatures')
      .select('*')
      .eq('id', signatureId)
      .single()

    if (error || !signature) {
      return {
        success: false,
        error: error?.message || 'Signature not found',
      }
    }

    return {
      success: true,
      signature: signature as SignatureRecord,
    }
  } catch (error) {
    logger.error('Exception getting signature', error as Error, { signatureId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get signatures for document
 */
export async function getDocumentSignatures(
  documentId: string
): Promise<{
  success: boolean
  signatures?: SignatureRecord[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: signatures, error } = await supabase
      .from('apr.digital_signatures')
      .select('*')
      .eq('document_id', documentId)
      .order('signed_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      signatures: (signatures || []) as SignatureRecord[],
    }
  } catch (error) {
    logger.error('Exception getting document signatures', error as Error, { documentId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get signature audit trail
 */
export async function getSignatureAuditTrail(
  signatureId: string
): Promise<{
  success: boolean
  auditTrail?: SignatureAuditEntry[]
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: auditTrail, error } = await supabase
      .from('apr.signature_audit_trail')
      .select('*')
      .eq('signature_id', signatureId)
      .order('timestamp', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      auditTrail: (auditTrail || []) as SignatureAuditEntry[],
    }
  } catch (error) {
    logger.error('Exception getting signature audit trail', error as Error, { signatureId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Log signature audit trail entry
 */
async function logSignatureAudit(
  signatureId: string,
  action: SignatureAuditEntry['action'],
  actorId: string,
  actorName: string,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()

  try {
    await supabase.from('apr.signature_audit_trail').insert({
      signature_id: signatureId,
      action,
      actor_id: actorId,
      actor_name: actorName,
      timestamp: new Date().toISOString(),
      details: details || {},
    })
  } catch (error) {
    logger.error('Failed to log signature audit trail', error as Error, {
      signatureId,
      action,
    })
  }
}

