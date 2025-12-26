/**
 * Manual Signature Service
 * Handles manual signature fallback when PKI is unavailable
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { ManualSignatureData } from '@/lib/pki/types'
import { SignatureStatus } from './types'

/**
 * Apply manual signature to a pending signature record
 */
export async function applyManualSignature(
  signatureId: string,
  userId: string,
  manualData: ManualSignatureData
): Promise<{
  success: boolean
  error?: string
}> {
  return monitor('apply_manual_signature', async () => {
    const supabase = await createClient()

    try {
      // Get signature record
      const { data: signature, error: fetchError } = await supabase
        .from('digital_signatures')
        .select('*')
        .eq('id', signatureId)
        .single()

      if (fetchError || !signature) {
        return {
          success: false,
          error: 'Signature not found',
        }
      }

      // Verify signature is pending
      if (signature.signature_status !== 'pending') {
        return {
          success: false,
          error: `Cannot apply manual signature to signature with status: ${signature.signature_status}`,
        }
      }

      // Update signature with manual signature data
      const { error: updateError } = await supabase
        .from('digital_signatures')
        .update({
          signature_status: 'signed' as SignatureStatus,
          pki_provider: 'manual',
          signed_at: manualData.signedAt,
          signer_name: manualData.signerName,
          signer_role: manualData.signerRole,
          metadata: {
            ...((signature.metadata as Record<string, unknown>) || {}),
            manualSignature: {
              signatureImage: manualData.signatureImage,
              witnessName: manualData.witnessName,
              witnessId: manualData.witnessId,
              notes: manualData.notes,
              appliedBy: userId,
              appliedAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', signatureId)

      if (updateError) {
        logger.error('Failed to apply manual signature', updateError, {
          signatureId,
          userId,
        })
        return {
          success: false,
          error: `Failed to update signature: ${updateError.message}`,
        }
      }

      logger.info('Manual signature applied successfully', {
        signatureId,
        signerId: manualData.signerId,
        appliedBy: userId,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Exception applying manual signature', error as Error, {
        signatureId,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get pending signatures that need manual signing
 */
export async function getPendingSignatures(): Promise<{
  success: boolean
  signatures?: Array<{
    id: string
    documentId: string
    documentType: string
    workflowStage: string
    signerName: string
    signerRole: string
    signedAt: string
    documentHash: string
    metadata?: Record<string, unknown>
    createdAt: string
  }>
  error?: string
}> {
  return monitor('get_pending_signatures', async () => {
    const supabase = await createClient()

    try {
      const { data: signatures, error } = await supabase
        .from('digital_signatures')
        .select('id, document_id, document_type, workflow_stage, signer_name, signer_role, signed_at, document_hash, metadata, created_at')
        .eq('signature_status', 'pending')
        .order('created_at', { ascending: true })

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        signatures: (signatures || []).map((sig: any) => ({
          id: sig.id,
          documentId: sig.document_id,
          documentType: sig.document_type,
          workflowStage: sig.workflow_stage,
          signerName: sig.signer_name,
          signerRole: sig.signer_role,
          signedAt: sig.signed_at,
          documentHash: sig.document_hash,
          metadata: sig.metadata as Record<string, unknown> | undefined,
          createdAt: sig.created_at,
        })),
      }
    } catch (error) {
      logger.error('Exception getting pending signatures', error as Error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

