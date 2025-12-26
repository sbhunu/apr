/**
 * Public Signature Verification API Route
 * Allows public verification of digital signatures through PKI
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifySignature } from '@/lib/signatures/signature-service'
import { createPKIManager } from '@/lib/pki/pki-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { signatureId, documentHash, certificateSerial } = body

    if (!signatureId) {
      return NextResponse.json(
        { error: 'Signature ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient(request)

    // Get signature record
    const { data: signature, error: fetchError } = await supabase
      .from('digital_signatures')
      .select('*')
      .eq('id', signatureId)
      .single()

    if (fetchError || !signature) {
      return NextResponse.json(
        { error: 'Signature not found', verified: false, valid: false },
        { status: 404 }
      )
    }

    // Verify signature via PKI
    const pkiManager = createPKIManager()
    const verificationRequest = {
      signatureId: signature.signature_id || signatureId,
      documentHash: documentHash || signature.document_hash,
      certificateSerial: certificateSerial || signature.certificate_serial,
    }

    const pkiResult = await pkiManager.verifySignature(verificationRequest)

    // Also use the signature service for database verification
    const dbResult = await verifySignature(signatureId)

    return NextResponse.json({
      success: true,
      verified: pkiResult.verified && dbResult.verified !== false,
      valid: pkiResult.valid && dbResult.valid !== false,
      signature: {
        id: signature.id,
        documentId: signature.document_id,
        documentType: signature.document_type,
        workflowStage: signature.workflow_stage,
        signerName: signature.signer_name,
        signerRole: signature.signer_role,
        signedAt: signature.signed_at,
        certificateSerial: signature.certificate_serial,
        pkiProvider: signature.pki_provider,
        status: signature.signature_status,
      },
      verification: {
        pkiVerified: pkiResult.verified,
        pkiValid: pkiResult.valid,
        revocationStatus: pkiResult.revocationStatus,
        certificateSerial: pkiResult.certificateSerial,
        signerName: pkiResult.signerName,
        signerRole: pkiResult.signerRole,
        timestamp: pkiResult.timestamp,
        error: pkiResult.error,
      },
      databaseVerification: {
        verified: dbResult.verified,
        valid: dbResult.valid,
        error: dbResult.error,
      },
    })
  } catch (error) {
    console.error('Signature verification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify signature',
        verified: false,
        valid: false,
      },
      { status: 500 }
    )
  }
}

