-- Admin Audit Logs Migration
-- Creates audit log tables for user activity tracking and system monitoring
-- All tables use apr schema prefix as required

-- ============================================================================
-- USER ACTIVITY LOGS TABLE
-- ============================================================================
-- Tracks all user actions for audit and security purposes
CREATE TABLE IF NOT EXISTS apr.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  
  -- Action details
  action_type TEXT NOT NULL, -- e.g., 'login', 'create', 'update', 'delete', 'approve', 'reject'
  resource_type TEXT NOT NULL, -- e.g., 'planning', 'survey', 'deeds', 'user', 'role'
  resource_id UUID, -- ID of the resource acted upon
  
  -- Request details
  ip_address INET,
  user_agent TEXT,
  request_method TEXT, -- 'GET', 'POST', 'PUT', 'DELETE'
  request_path TEXT,
  
  -- Action result
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id 
  ON apr.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action_type 
  ON apr.user_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource_type 
  ON apr.user_activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource_id 
  ON apr.user_activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at 
  ON apr.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_role 
  ON apr.user_activity_logs(user_role);

-- ============================================================================
-- USER REGISTRATION REQUESTS TABLE
-- ============================================================================
-- Tracks user registration requests with credential verification
CREATE TABLE IF NOT EXISTS apr.user_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Registration details
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  organization TEXT,
  requested_role TEXT NOT NULL REFERENCES apr.roles(name),
  
  -- Credential verification
  professional_registration_number TEXT,
  credential_document_id UUID, -- Reference to storage.objects
  credential_verified BOOLEAN DEFAULT false,
  credential_verified_by UUID REFERENCES auth.users(id),
  credential_verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')
  ),
  
  -- Review information
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  
  -- Approval information
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approval_notes TEXT,
  
  -- Rejection information
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- User account link (after approval)
  user_id UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_email 
  ON apr.user_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_status 
  ON apr.user_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_requested_role 
  ON apr.user_registration_requests(requested_role);
CREATE INDEX IF NOT EXISTS idx_user_registration_requests_created_at 
  ON apr.user_registration_requests(created_at DESC);

-- ============================================================================
-- USER SESSIONS TABLE
-- ============================================================================
-- Tracks active user sessions for security and monitoring
CREATE TABLE IF NOT EXISTS apr.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session details
  session_token TEXT UNIQUE NOT NULL, -- Supabase session token
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  
  -- Session lifecycle
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Session status
  is_active BOOLEAN DEFAULT true,
  ended_reason TEXT, -- 'logout', 'timeout', 'revoked', 'expired'
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
  ON apr.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token 
  ON apr.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active 
  ON apr.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity_at 
  ON apr.user_sessions(last_activity_at DESC);

-- ============================================================================
-- RPC FUNCTION: Log User Activity
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.log_user_activity(
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get current user information
  v_user_id := auth.uid();
  
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    SELECT role INTO v_user_role FROM apr.user_profiles WHERE id = v_user_id;
  END IF;
  
  -- Insert activity log
  INSERT INTO apr.user_activity_logs (
    user_id,
    user_email,
    user_role,
    action_type,
    resource_type,
    resource_id,
    success,
    error_message,
    metadata
  )
  VALUES (
    v_user_id,
    v_user_email,
    v_user_role,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_success,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION apr.log_user_activity(TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB) 
  TO authenticated;
GRANT EXECUTE ON FUNCTION apr.log_user_activity(TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB) 
  TO anon;

COMMENT ON FUNCTION apr.log_user_activity IS 
  'Logs user activity for audit trail and security monitoring';

-- ============================================================================
-- RPC FUNCTION: Update Session Activity
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.update_session_activity(
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE apr.user_sessions
  SET last_activity_at = NOW()
  WHERE session_token = p_session_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION apr.update_session_activity(TEXT) 
  TO authenticated;

COMMENT ON FUNCTION apr.update_session_activity IS 
  'Updates last activity timestamp for active session';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE apr.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.user_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.user_sessions ENABLE ROW LEVEL SECURITY;

-- User Activity Logs Policies
CREATE POLICY "Users can view own activity logs"
  ON apr.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity logs"
  ON apr.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User Registration Requests Policies
CREATE POLICY "Users can view own registration request"
  ON apr.user_registration_requests
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage registration requests"
  ON apr.user_registration_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User Sessions Policies
CREATE POLICY "Users can view own sessions"
  ON apr.user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON apr.user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE apr.user_activity_logs IS 
  'Audit log of all user actions for security and compliance';

COMMENT ON TABLE apr.user_registration_requests IS 
  'Tracks user registration requests with credential verification and approval workflow';

COMMENT ON TABLE apr.user_sessions IS 
  'Tracks active user sessions for security monitoring';

