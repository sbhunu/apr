-- Migration: Backup Logs
-- Creates table for tracking backup operations

-- Backup logs table
CREATE TABLE IF NOT EXISTS apr.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Backup identification
  backup_type TEXT NOT NULL CHECK (backup_type IN ('database', 'storage', 'config', 'full')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  
  -- Backup details
  file_path TEXT,
  file_size BIGINT, -- Size in bytes
  backup_method TEXT, -- 'automated', 'manual', 'supabase_managed'
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- Calculated duration
  
  -- Verification
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_errors TEXT[], -- Array of verification error messages
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  
  -- Retention
  retention_days INTEGER DEFAULT 30,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_logs_type 
  ON apr.backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status 
  ON apr.backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_started_at 
  ON apr.backup_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_completed_at 
  ON apr.backup_logs(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_verification_status 
  ON apr.backup_logs(verification_status);

-- Function to calculate duration
CREATE OR REPLACE FUNCTION apr.calculate_backup_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
  END IF;
  
  -- Calculate expiration date
  IF NEW.retention_days IS NOT NULL THEN
    NEW.expires_at := NEW.completed_at + (NEW.retention_days || ' days')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate duration
CREATE TRIGGER trigger_calculate_backup_duration
  BEFORE INSERT OR UPDATE ON apr.backup_logs
  FOR EACH ROW
  EXECUTE FUNCTION apr.calculate_backup_duration();

-- RLS Policies
ALTER TABLE apr.backup_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view backup logs
CREATE POLICY "Admins can view backup logs"
  ON apr.backup_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Only system can insert backup logs (via service role)
CREATE POLICY "System can insert backup logs"
  ON apr.backup_logs FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Only admins can update backup logs
CREATE POLICY "Admins can update backup logs"
  ON apr.backup_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE apr.backup_logs IS 'Tracks all backup operations for audit and monitoring';
COMMENT ON COLUMN apr.backup_logs.backup_type IS 'Type of backup: database, storage, config, or full';
COMMENT ON COLUMN apr.backup_logs.verification_status IS 'Status of backup verification';
COMMENT ON COLUMN apr.backup_logs.retention_days IS 'Number of days to retain this backup';

