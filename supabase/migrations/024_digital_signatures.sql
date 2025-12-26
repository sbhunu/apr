-- Migration: Digital Signatures Integration
-- Creates tables for PKI-based digital signatures in approval workflows

-- Digital signatures table
CREATE TABLE IF NOT EXISTS apr.digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document reference
  document_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'planning_approval',
      'survey_seal',
      'deeds_registration',
      'title_certificate'
    )
  ),
  workflow_stage TEXT NOT NULL,
  
  -- Signer information
  signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Signature status
  signature_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    signature_status IN ('pending', 'signed', 'verified', 'invalid', 'revoked')
  ),
  
  -- PKI signature data
  signature_id TEXT, -- PKI system signature ID
  signature_value TEXT, -- Base64 encoded signature
  document_hash TEXT NOT NULL, -- SHA-256 hash of document
  
  -- Certificate information
  certificate_serial TEXT,
  certificate_chain JSONB DEFAULT '[]'::jsonb, -- Array of certificate PEMs
  
  -- Verification data
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  verification_result JSONB, -- Verification result details
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digital_signatures_document_id 
  ON apr.digital_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_document_type 
  ON apr.digital_signatures(document_type);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signer_id 
  ON apr.digital_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_status 
  ON apr.digital_signatures(signature_status);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signed_at 
  ON apr.digital_signatures(signed_at);

-- Signature audit trail table
CREATE TABLE IF NOT EXISTS apr.signature_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Signature reference
  signature_id UUID NOT NULL REFERENCES apr.digital_signatures(id) ON DELETE CASCADE,
  
  -- Action details
  action TEXT NOT NULL CHECK (
    action IN ('created', 'verified', 'revoked', 'updated')
  ),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Additional details
  details JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_audit_trail_signature_id 
  ON apr.signature_audit_trail(signature_id);
CREATE INDEX IF NOT EXISTS idx_signature_audit_trail_timestamp 
  ON apr.signature_audit_trail(timestamp);

-- RLS Policies
ALTER TABLE apr.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.signature_audit_trail ENABLE ROW LEVEL SECURITY;

-- Digital signatures policies
CREATE POLICY "Users can view signatures for their documents"
  ON apr.digital_signatures FOR SELECT
  USING (
    auth.uid() = signer_id OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'planning_officer', 'surveyor_general', 'deeds_examiner', 'registrar')
    )
  );

CREATE POLICY "Authorized users can create signatures"
  ON apr.digital_signatures FOR INSERT
  WITH CHECK (
    auth.uid() = signer_id AND
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'planning_officer', 'surveyor_general', 'deeds_examiner', 'registrar')
    )
  );

CREATE POLICY "Signers can update their signatures"
  ON apr.digital_signatures FOR UPDATE
  USING (
    auth.uid() = signer_id OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Audit trail policies
CREATE POLICY "Users can view audit trail for signatures they can access"
  ON apr.signature_audit_trail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM apr.digital_signatures
      WHERE id = signature_id
      AND (
        signer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'planning_officer', 'surveyor_general', 'deeds_examiner', 'registrar')
        )
      )
    )
  );

CREATE POLICY "System can create audit trail entries"
  ON apr.signature_audit_trail FOR INSERT
  WITH CHECK (true); -- System-generated entries

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION apr.update_digital_signature_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_digital_signature_updated_at
  BEFORE UPDATE ON apr.digital_signatures
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_digital_signature_updated_at();

-- Comments
COMMENT ON TABLE apr.digital_signatures IS 'PKI-based digital signatures for approval workflows';
COMMENT ON TABLE apr.signature_audit_trail IS 'Audit trail for digital signature operations';
COMMENT ON COLUMN apr.digital_signatures.document_hash IS 'SHA-256 hash of the document being signed';
COMMENT ON COLUMN apr.digital_signatures.certificate_chain IS 'Array of certificate PEMs in chain order';
COMMENT ON COLUMN apr.digital_signatures.verification_result IS 'PKI verification result details';

