-- Workflow Engine Tables Migration
-- Creates tables for workflow state persistence and audit trail
-- All tables use apr schema prefix as required

-- ============================================================================
-- WORKFLOW HISTORY TABLE
-- ============================================================================
-- Stores complete audit trail of all workflow state transitions
CREATE TABLE IF NOT EXISTS apr.workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity reference
  entity_id UUID NOT NULL, -- References the entity (plan, survey, deed, etc.)
  workflow_type TEXT NOT NULL CHECK (
    workflow_type IN ('planning', 'survey', 'deed', 'title')
  ),
  
  -- State transition
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  
  -- Transition metadata
  transitioned_by UUID NOT NULL REFERENCES auth.users(id),
  transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Indexes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for workflow history
CREATE INDEX IF NOT EXISTS idx_workflow_history_entity 
  ON apr.workflow_history(entity_id, workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_history_transitioned_at 
  ON apr.workflow_history(transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_history_transitioned_by 
  ON apr.workflow_history(transitioned_by);
CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_type 
  ON apr.workflow_history(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_history_to_state 
  ON apr.workflow_history(to_state);

-- ============================================================================
-- WORKFLOW STATE TABLE
-- ============================================================================
-- Current state snapshot for quick lookups (denormalized from history)
CREATE TABLE IF NOT EXISTS apr.workflow_state (
  entity_id UUID NOT NULL,
  workflow_type TEXT NOT NULL CHECK (
    workflow_type IN ('planning', 'survey', 'deed', 'title')
  ),
  
  -- Current state
  current_state TEXT NOT NULL,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Primary key
  PRIMARY KEY (entity_id, workflow_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_state_current_state 
  ON apr.workflow_state(current_state);
CREATE INDEX IF NOT EXISTS idx_workflow_state_workflow_type 
  ON apr.workflow_state(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_state_updated_at 
  ON apr.workflow_state(updated_at DESC);

-- ============================================================================
-- WORKFLOW TRANSITION FUNCTION
-- ============================================================================
-- RPC function to save workflow transition with optimistic locking
CREATE OR REPLACE FUNCTION apr.save_workflow_transition(
  p_entity_id UUID,
  p_workflow_type TEXT,
  p_from_state TEXT,
  p_to_state TEXT,
  p_transitioned_by UUID,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_current_version INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Get current version
  SELECT version INTO v_current_version
  FROM apr.workflow_state
  WHERE entity_id = p_entity_id
    AND workflow_type = p_workflow_type;

  -- If no current state exists, initialize it
  IF v_current_version IS NULL THEN
    v_current_version := 0;
    INSERT INTO apr.workflow_state (
      entity_id,
      workflow_type,
      current_state,
      version,
      updated_by
    ) VALUES (
      p_entity_id,
      p_workflow_type,
      p_from_state,
      0,
      p_transitioned_by
    )
    ON CONFLICT (entity_id, workflow_type) DO NOTHING;
    
    -- Re-fetch version after insert
    SELECT version INTO v_current_version
    FROM apr.workflow_state
    WHERE entity_id = p_entity_id
      AND workflow_type = p_workflow_type;
  END IF;

  -- Optimistic locking check
  IF v_current_version != p_current_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Version conflict: state was modified by another operation',
      'current_version', v_current_version,
      'provided_version', p_current_version
    );
  END IF;

  -- Increment version
  v_new_version := v_current_version + 1;

  -- Insert history record
  INSERT INTO apr.workflow_history (
    entity_id,
    workflow_type,
    from_state,
    to_state,
    transitioned_by,
    reason,
    metadata,
    version
  ) VALUES (
    p_entity_id,
    p_workflow_type,
    p_from_state,
    p_to_state,
    p_transitioned_by,
    p_reason,
    p_metadata,
    v_new_version
  );

  -- Update current state
  UPDATE apr.workflow_state
  SET
    current_state = p_to_state,
    version = v_new_version,
    updated_at = NOW(),
    updated_by = p_transitioned_by
  WHERE entity_id = p_entity_id
    AND workflow_type = p_workflow_type;

  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_new_version
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.save_workflow_transition(
  UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.save_workflow_transition(
  UUID, TEXT, TEXT, TEXT, UUID, TEXT, JSONB, INTEGER
) TO anon;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE apr.workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.workflow_state ENABLE ROW LEVEL SECURITY;

-- Workflow History Policies
-- Users can view history for entities they have access to
CREATE POLICY "Users can view workflow history"
  ON apr.workflow_history
  FOR SELECT
  TO authenticated
  USING (
    transitioned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'planning_authority', 'surveyor_general', 'deeds_examiner', 'registrar')
    )
  );

-- Workflow State Policies
-- Users can view state for entities they have access to
CREATE POLICY "Users can view workflow state"
  ON apr.workflow_state
  FOR SELECT
  TO authenticated
  USING (
    updated_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'planning_authority', 'surveyor_general', 'deeds_examiner', 'registrar')
    )
  );

-- Add comments
COMMENT ON TABLE apr.workflow_history IS 
  'Complete audit trail of all workflow state transitions. Provides immutable history of state changes.';

COMMENT ON TABLE apr.workflow_state IS 
  'Current state snapshot for quick lookups. Denormalized from workflow_history for performance.';

COMMENT ON FUNCTION apr.save_workflow_transition IS 
  'Saves workflow transition with optimistic locking. Returns success status and new version number.';

