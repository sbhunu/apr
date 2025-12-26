-- Plan Locking Migration
-- Implements plan locking on approval to enforce immutability
-- All functions use apr schema prefix as required

-- ============================================================================
-- ADD LOCKED COLUMN TO PLANS TABLE
-- ============================================================================
-- Add locked column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'apr' 
      AND table_name = 'sectional_scheme_plans' 
      AND column_name = 'locked'
  ) THEN
    ALTER TABLE apr.sectional_scheme_plans 
    ADD COLUMN locked BOOLEAN DEFAULT false NOT NULL;
    
    -- Create index for locked status queries
    CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_locked 
      ON apr.sectional_scheme_plans(locked) WHERE locked = true;
  END IF;
END $$;

-- ============================================================================
-- FUNCTION: Lock Plan on Approval
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.lock_plan_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lock plan when status changes to approved
  -- Check both status and workflow_state for consistency
  IF NEW.status = 'approved_planning_authority' OR NEW.workflow_state = 'approved' THEN
    NEW.locked := true;
    
    -- Ensure approval fields are set
    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := NOW();
    END IF;
    
    IF NEW.approved_by IS NULL THEN
      NEW.approved_by := auth.uid();
    END IF;
  END IF;
  
  -- Unlock plan if status changes away from approved (for reversals)
  IF (OLD.status = 'approved_planning_authority' OR OLD.workflow_state = 'approved')
     AND NEW.status != 'approved_planning_authority' 
     AND NEW.workflow_state != 'approved' THEN
    -- Only unlock if admin or planning authority
    IF EXISTS (
      SELECT 1 FROM apr.user_profiles 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'planning_authority')
    ) THEN
      NEW.locked := false;
    ELSE
      -- Prevent status change if not authorized
      RAISE EXCEPTION 'Only admin or planning authority can unlock approved plans';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION apr.lock_plan_on_approval IS 
  'Automatically locks plans when approved and unlocks on authorized reversal';

-- ============================================================================
-- TRIGGER: Lock Plan on Approval
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_lock_plan_on_approval ON apr.sectional_scheme_plans;
CREATE TRIGGER trigger_lock_plan_on_approval
  BEFORE UPDATE OF status ON apr.sectional_scheme_plans
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION apr.lock_plan_on_approval();

-- ============================================================================
-- FUNCTION: Prevent Edits to Locked Plans
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.prevent_locked_plan_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_planning_authority BOOLEAN;
BEGIN
  -- Allow updates if plan is not locked
  IF NOT OLD.locked THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is admin or planning authority (can modify locked plans for amendments)
  SELECT 
    EXISTS(SELECT 1 FROM apr.user_profiles WHERE id = auth.uid() AND role = 'admin'),
    EXISTS(SELECT 1 FROM apr.user_profiles WHERE id = auth.uid() AND role = 'planning_authority')
  INTO v_is_admin, v_is_planning_authority;
  
  -- Allow certain fields to be updated even when locked (for amendments)
  -- These fields can be updated: status, amendment_requested_at, amendment_notes, version, parent_plan_id
  IF v_is_admin OR v_is_planning_authority THEN
    -- Allow status changes and amendment-related fields
    IF (
      OLD.status IS DISTINCT FROM NEW.status OR
      OLD.amendment_requested_at IS DISTINCT FROM NEW.amendment_requested_at OR
      OLD.amendment_notes IS DISTINCT FROM NEW.amendment_notes OR
      OLD.version IS DISTINCT FROM NEW.version OR
      OLD.parent_plan_id IS DISTINCT FROM NEW.parent_plan_id OR
      OLD.updated_at IS DISTINCT FROM NEW.updated_at OR
      OLD.updated_by IS DISTINCT FROM NEW.updated_by
    ) THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Block all other edits to locked plans
  RAISE EXCEPTION 'Cannot edit locked plan. Plan is approved and immutable. Create an amendment instead.';
END;
$$;

COMMENT ON FUNCTION apr.prevent_locked_plan_edits IS 
  'Prevents edits to locked plans except for authorized amendment workflows';

-- ============================================================================
-- TRIGGER: Prevent Edits to Locked Plans
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_prevent_locked_plan_edits ON apr.sectional_scheme_plans;
CREATE TRIGGER trigger_prevent_locked_plan_edits
  BEFORE UPDATE ON apr.sectional_scheme_plans
  FOR EACH ROW
  WHEN (OLD.locked = true)
  EXECUTE FUNCTION apr.prevent_locked_plan_edits();

-- ============================================================================
-- FUNCTION: Create Plan Amendment
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.create_plan_amendment(
  p_parent_plan_id UUID,
  p_amendment_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_plan RECORD;
  v_new_plan_id UUID;
BEGIN
  -- Get parent plan
  SELECT * INTO v_parent_plan
  FROM apr.sectional_scheme_plans
  WHERE id = p_parent_plan_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent plan not found';
  END IF;
  
  -- Verify parent plan is locked (approved)
  IF NOT v_parent_plan.locked THEN
    RAISE EXCEPTION 'Can only create amendments for approved (locked) plans';
  END IF;
  
  -- Create new plan version as amendment
  INSERT INTO apr.sectional_scheme_plans (
    plan_number,
    title,
    description,
    location_name,
    boundary_geometry,
    planner_id,
    planner_name,
    planner_registration_number,
    status,
    workflow_state,
    parent_plan_id,
    version,
    metadata
  )
  VALUES (
    v_parent_plan.plan_number || '-AMEND-' || (v_parent_plan.version + 1),
    v_parent_plan.title || ' (Amendment)',
    v_parent_plan.description,
    v_parent_plan.location_name,
    v_parent_plan.boundary_geometry,
    v_parent_plan.planner_id,
    v_parent_plan.planner_name,
    v_parent_plan.planner_registration_number,
    'draft',
    'draft',
    p_parent_plan_id,
    v_parent_plan.version + 1,
    jsonb_build_object(
      'amendment_reason', p_amendment_reason,
      'parent_version', v_parent_plan.version,
      'created_at', NOW()
    )
  )
  RETURNING id INTO v_new_plan_id;
  
  RETURN v_new_plan_id;
END;
$$;

COMMENT ON FUNCTION apr.create_plan_amendment IS 
  'Creates a new plan version as an amendment to a locked plan';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.create_plan_amendment(UUID, TEXT) TO authenticated;

-- ============================================================================
-- READ-ONLY VIEW: Approved Plans
-- ============================================================================
CREATE OR REPLACE VIEW apr.approved_plans_view AS
SELECT 
  id,
  plan_number,
  title,
  description,
  location_name,
  planner_name,
  planner_registration_number,
  status,
  approved_at,
  approved_by,
  approval_number,
  locked,
  version,
  parent_plan_id,
  created_at,
  -- Exclude editable fields from view
  -- boundary_geometry, planner_id, etc. are not included for read-only access
  metadata
FROM apr.sectional_scheme_plans
WHERE locked = true
  AND status = 'approved_planning_authority';

COMMENT ON VIEW apr.approved_plans_view IS 
  'Read-only view of approved and locked plans';

-- Grant select on view
GRANT SELECT ON apr.approved_plans_view TO authenticated;
GRANT SELECT ON apr.approved_plans_view TO anon;

-- ============================================================================
-- FUNCTION: Compare Plan Versions
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.compare_plan_versions(
  p_plan_id_1 UUID,
  p_plan_id_2 UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan1 RECORD;
  v_plan2 RECORD;
  v_differences JSONB := '[]'::jsonb;
BEGIN
  -- Get both plans
  SELECT * INTO v_plan1 FROM apr.sectional_scheme_plans WHERE id = p_plan_id_1;
  SELECT * INTO v_plan2 FROM apr.sectional_scheme_plans WHERE id = p_plan_id_2;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'One or both plans not found';
  END IF;
  
  -- Compare fields and build differences array
  IF v_plan1.title IS DISTINCT FROM v_plan2.title THEN
    v_differences := v_differences || jsonb_build_object(
      'field', 'title',
      'old_value', v_plan1.title,
      'new_value', v_plan2.title
    );
  END IF;
  
  IF v_plan1.description IS DISTINCT FROM v_plan2.description THEN
    v_differences := v_differences || jsonb_build_object(
      'field', 'description',
      'old_value', v_plan1.description,
      'new_value', v_plan2.description
    );
  END IF;
  
  IF v_plan1.location_name IS DISTINCT FROM v_plan2.location_name THEN
    v_differences := v_differences || jsonb_build_object(
      'field', 'location_name',
      'old_value', v_plan1.location_name,
      'new_value', v_plan2.location_name
    );
  END IF;
  
  -- Compare geometries if both exist
  IF v_plan1.boundary_geometry IS NOT NULL AND v_plan2.boundary_geometry IS NOT NULL THEN
    IF NOT ST_Equals(v_plan1.boundary_geometry, v_plan2.boundary_geometry) THEN
      v_differences := v_differences || jsonb_build_object(
        'field', 'boundary_geometry',
        'changed', true,
        'area_diff', ST_Area(v_plan2.boundary_geometry) - ST_Area(v_plan1.boundary_geometry)
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'plan1_id', p_plan_id_1,
    'plan2_id', p_plan_id_2,
    'plan1_version', v_plan1.version,
    'plan2_version', v_plan2.version,
    'differences', v_differences,
    'total_differences', jsonb_array_length(v_differences)
  );
END;
$$;

COMMENT ON FUNCTION apr.compare_plan_versions IS 
  'Compares two plan versions and returns differences';

GRANT EXECUTE ON FUNCTION apr.compare_plan_versions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.compare_plan_versions(UUID, UUID) TO anon;

-- ============================================================================
-- FUNCTION: Get Plan Version History
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.get_plan_version_history(
  p_plan_id UUID
)
RETURNS TABLE (
  id UUID,
  plan_number TEXT,
  version INTEGER,
  status TEXT,
  locked BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  is_current BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_root_plan_id UUID;
BEGIN
  -- Find root plan (original plan without parent)
  SELECT COALESCE(
    (SELECT id FROM apr.sectional_scheme_plans WHERE id = p_plan_id AND parent_plan_id IS NULL),
    (SELECT parent_plan_id FROM apr.sectional_scheme_plans WHERE id = p_plan_id)
  ) INTO v_root_plan_id;
  
  -- Return all versions (root + amendments)
  RETURN QUERY
  SELECT 
    p.id,
    p.plan_number,
    p.version,
    p.status,
    p.locked,
    p.created_at,
    p.created_by,
    (p.id = p_plan_id) AS is_current
  FROM apr.sectional_scheme_plans p
  WHERE p.id = COALESCE(v_root_plan_id, p_plan_id)
     OR p.parent_plan_id = v_root_plan_id
     OR (p.parent_plan_id IS NOT NULL AND p.parent_plan_id IN (
       SELECT id FROM apr.sectional_scheme_plans 
       WHERE parent_plan_id = v_root_plan_id
     ))
  ORDER BY p.version ASC, p.created_at ASC;
END;
$$;

COMMENT ON FUNCTION apr.get_plan_version_history IS 
  'Returns complete version history for a plan including all amendments';

GRANT EXECUTE ON FUNCTION apr.get_plan_version_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_plan_version_history(UUID) TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Plan locking triggers created';
  RAISE NOTICE '✅ Amendment creation function created';
  RAISE NOTICE '✅ Plan comparison function created';
  RAISE NOTICE '✅ Version history function created';
  RAISE NOTICE '✅ Read-only view for approved plans created';
END $$;

