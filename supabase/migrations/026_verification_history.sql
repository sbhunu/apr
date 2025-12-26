-- Migration: Verification History
-- Creates table for tracking certificate verification attempts

-- Verification history table
CREATE TABLE IF NOT EXISTS apr.verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Certificate reference
  title_id UUID NOT NULL REFERENCES apr.sectional_titles(id) ON DELETE RESTRICT,
  certificate_number TEXT,
  
  -- Verification details
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Verification result
  verification_result JSONB NOT NULL, -- Full verification result
  
  -- Fraud detection
  fraud_detected BOOLEAN DEFAULT false,
  fraud_reason TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_history_title_id 
  ON apr.verification_history(title_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_certificate_number 
  ON apr.verification_history(certificate_number);
CREATE INDEX IF NOT EXISTS idx_verification_history_verified_at 
  ON apr.verification_history(verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_ip_address 
  ON apr.verification_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_verification_history_fraud_detected 
  ON apr.verification_history(fraud_detected);
CREATE INDEX IF NOT EXISTS idx_verification_history_risk_level 
  ON apr.verification_history(risk_level);

-- RLS Policies
ALTER TABLE apr.verification_history ENABLE ROW LEVEL SECURITY;

-- Public can insert verification attempts (for logging)
CREATE POLICY "Public can log verification attempts"
  ON apr.verification_history FOR INSERT
  WITH CHECK (true);

-- Only authorized roles can view verification history
CREATE POLICY "Authorized roles can view verification history"
  ON apr.verification_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'auditor', 'registrar')
    )
  );

-- Prevent updates and deletes (immutable)
CREATE POLICY "Verification history is immutable"
  ON apr.verification_history FOR UPDATE
  USING (false);

CREATE POLICY "Verification history cannot be deleted"
  ON apr.verification_history FOR DELETE
  USING (false);

-- Comments
COMMENT ON TABLE apr.verification_history IS 'Tracks certificate verification attempts for fraud detection and audit';
COMMENT ON COLUMN apr.verification_history.verification_result IS 'Complete verification result including validity, hash check, signature check';
COMMENT ON COLUMN apr.verification_history.fraud_detected IS 'Whether fraud was detected during verification';
COMMENT ON COLUMN apr.verification_history.risk_level IS 'Risk level of the verification attempt';

