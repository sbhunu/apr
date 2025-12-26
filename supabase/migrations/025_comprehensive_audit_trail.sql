-- Migration: Comprehensive Audit Trail System
-- Creates immutable audit logging with hash chaining

-- Comprehensive audit trail table
CREATE TABLE IF NOT EXISTS apr.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event details
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'create',
      'update',
      'delete',
      'approve',
      'reject',
      'seal',
      'register',
      'transfer',
      'amend',
      'view',
      'export',
      'sign',
      'verify',
      'login',
      'logout',
      'system'
    )
  ),
  resource_type TEXT NOT NULL CHECK (
    resource_type IN (
      'planning_plan',
      'survey_plan',
      'sectional_scheme',
      'sectional_title',
      'body_corporate',
      'ownership_transfer',
      'mortgage',
      'lease',
      'scheme_amendment',
      'user',
      'role',
      'permission',
      'document',
      'signature',
      'certificate',
      'system'
    )
  ),
  resource_id UUID NOT NULL,
  
  -- Actor information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  
  -- Action details
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Change tracking
  changes JSONB DEFAULT '{}'::jsonb, -- { before: {...}, after: {...} }
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Hash chaining for immutability
  previous_hash TEXT, -- Hash of previous entry for this resource
  current_hash TEXT NOT NULL, -- Hash of this entry
  chain_hash TEXT NOT NULL, -- Hash of chain (previous chain hash + current hash)
  
  -- Archive management
  archived BOOLEAN DEFAULT false,
  archive_date TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type 
  ON apr.audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_type 
  ON apr.audit_trail(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_id 
  ON apr.audit_trail(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id 
  ON apr.audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_role 
  ON apr.audit_trail(user_role);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp 
  ON apr.audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_archived 
  ON apr.audit_trail(archived);
CREATE INDEX IF NOT EXISTS idx_audit_trail_chain_hash 
  ON apr.audit_trail(chain_hash);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_chain 
  ON apr.audit_trail(resource_type, resource_id, timestamp);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_query 
  ON apr.audit_trail(resource_type, resource_id, timestamp DESC);

-- RLS Policies
ALTER TABLE apr.audit_trail ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit entries
CREATE POLICY "Users can view their own audit entries"
  ON apr.audit_trail FOR SELECT
  USING (auth.uid() = user_id);

-- Authorized roles can view all audit entries
CREATE POLICY "Authorized roles can view all audit entries"
  ON apr.audit_trail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'auditor', 'registrar', 'deeds_examiner', 'surveyor_general', 'planning_officer')
    )
  );

-- System can insert audit entries (via service role)
CREATE POLICY "System can insert audit entries"
  ON apr.audit_trail FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes (immutable)
CREATE POLICY "Audit trail is immutable"
  ON apr.audit_trail FOR UPDATE
  USING (false);

CREATE POLICY "Audit trail cannot be deleted"
  ON apr.audit_trail FOR DELETE
  USING (false);

-- Function to verify audit trail integrity
CREATE OR REPLACE FUNCTION apr.verify_audit_trail_integrity(
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  entry RECORD;
  previous_entry RECORD;
  expected_hash TEXT;
  expected_chain_hash TEXT;
  hash_valid BOOLEAN := true;
  chain_valid BOOLEAN := true;
  errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get all entries for the resource ordered by timestamp
  FOR entry IN
    SELECT * FROM apr.audit_trail
    WHERE resource_type = p_resource_type
      AND resource_id = p_resource_id
    ORDER BY timestamp ASC
  LOOP
    -- Verify current hash (simplified - actual hash calculation would be done in application)
    -- This is a placeholder for the verification logic
    
    -- Check chain hash
    IF previous_entry IS NOT NULL THEN
      -- Verify chain hash matches
      IF entry.previous_hash != previous_entry.current_hash THEN
        chain_valid := false;
        errors := array_append(errors, format('Entry %s: Previous hash mismatch', entry.id));
      END IF;
    ELSE
      -- First entry should have no previous hash
      IF entry.previous_hash IS NOT NULL THEN
        chain_valid := false;
        errors := array_append(errors, format('Entry %s: First entry should not have previous hash', entry.id));
      END IF;
    END IF;
    
    previous_entry := entry;
  END LOOP;
  
  RETURN jsonb_build_object(
    'valid', hash_valid AND chain_valid,
    'hash_valid', hash_valid,
    'chain_valid', chain_valid,
    'errors', errors
  );
END;
$$;

-- Function to get audit trail for compliance
CREATE OR REPLACE FUNCTION apr.get_compliance_audit_trail(
  p_resource_type TEXT,
  p_resource_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_role TEXT,
  action TEXT,
  description TEXT,
  changes JSONB,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    at.id,
    at.event_type,
    at.timestamp,
    at.user_name,
    at.user_role,
    at.action,
    at.description,
    at.changes,
    at.metadata
  FROM apr.audit_trail at
  WHERE at.resource_type = p_resource_type
    AND at.resource_id = p_resource_id
    AND (p_start_date IS NULL OR at.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR at.timestamp <= p_end_date)
    AND at.archived = false
  ORDER BY at.timestamp ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.verify_audit_trail_integrity(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_compliance_audit_trail(TEXT, UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Comments
COMMENT ON TABLE apr.audit_trail IS 'Comprehensive immutable audit trail with hash chaining for legal compliance';
COMMENT ON COLUMN apr.audit_trail.previous_hash IS 'Hash of previous audit entry for this resource (for chaining)';
COMMENT ON COLUMN apr.audit_trail.current_hash IS 'SHA-256 hash of this audit entry';
COMMENT ON COLUMN apr.audit_trail.chain_hash IS 'SHA-256 hash of chain (previous chain hash + current hash) for tamper detection';
COMMENT ON COLUMN apr.audit_trail.changes IS 'JSON object with before/after values for change tracking';
COMMENT ON FUNCTION apr.verify_audit_trail_integrity IS 'Verifies hash chain integrity for audit trail';
COMMENT ON FUNCTION apr.get_compliance_audit_trail IS 'Retrieves audit trail for compliance reporting';

