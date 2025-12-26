-- Planning Database Schema Migration
-- Creates tables and policies for planning module functionality
-- All tables use apr schema prefix as required

-- ============================================================================
-- SECTIONAL SCHEME PLANS TABLE
-- ============================================================================
-- Main table for sectional scheme plan submissions
CREATE TABLE IF NOT EXISTS apr.sectional_scheme_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identification
  plan_number TEXT UNIQUE NOT NULL, -- e.g., "PLAN-2024-001"
  title TEXT NOT NULL,
  description TEXT,
  
  -- Location and spatial data
  location_name TEXT, -- e.g., "Harare Central"
  boundary_geometry GEOMETRY(POLYGON, 32735), -- UTM Zone 35S
  centroid GEOMETRY(POINT, 32735), -- Calculated centroid
  
  -- Planner information
  planner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  planner_name TEXT, -- Denormalized for performance
  planner_registration_number TEXT, -- Professional registration number
  
  -- Plan status and workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'submitted',
      'under_review_planning_authority',
      'approved_planning_authority',
      'rejected_planning_authority',
      'returned_for_amendment',
      'finalized',
      'withdrawn'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'draft', -- Mirrors status for workflow engine
  
  -- Review information
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  
  -- Approval information
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approval_number TEXT,
  
  -- Rejection information
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Amendment information
  amendment_requested_at TIMESTAMP WITH TIME ZONE,
  amendment_requested_by UUID REFERENCES auth.users(id),
  amendment_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  parent_plan_id UUID REFERENCES apr.sectional_scheme_plans(id), -- For amendments
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb -- Flexible storage for additional fields
);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_status 
  ON apr.sectional_scheme_plans(status);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_planner_id 
  ON apr.sectional_scheme_plans(planner_id);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_created_at 
  ON apr.sectional_scheme_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_submitted_at 
  ON apr.sectional_scheme_plans(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_plan_number 
  ON apr.sectional_scheme_plans(plan_number);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_parent_plan_id 
  ON apr.sectional_scheme_plans(parent_plan_id);

-- Create spatial indexes for geometry columns
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_boundary_geometry 
  ON apr.sectional_scheme_plans USING GIST(boundary_geometry);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_centroid 
  ON apr.sectional_scheme_plans USING GIST(centroid);

-- ============================================================================
-- PLAN DOCUMENTS TABLE
-- ============================================================================
-- Documents attached to sectional scheme plans
CREATE TABLE IF NOT EXISTS apr.plan_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to plan
  plan_id UUID NOT NULL REFERENCES apr.sectional_scheme_plans(id) ON DELETE CASCADE,
  
  -- Document information
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'plan_drawing',
      'site_plan',
      'elevation',
      'section',
      'supporting_document',
      'amendment',
      'other'
    )
  ),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT, -- Path in Supabase Storage
  file_size BIGINT, -- Size in bytes
  mime_type TEXT, -- e.g., 'application/pdf', 'image/png'
  
  -- Document metadata
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true, -- Current version of document
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plan_documents_plan_id 
  ON apr.plan_documents(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_documents_document_type 
  ON apr.plan_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_plan_documents_uploaded_at 
  ON apr.plan_documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_documents_is_current 
  ON apr.plan_documents(is_current) WHERE is_current = true;

-- ============================================================================
-- PLANNING REVIEWS TABLE
-- ============================================================================
-- Review records for planning applications
CREATE TABLE IF NOT EXISTS apr.planning_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to plan
  plan_id UUID NOT NULL REFERENCES apr.sectional_scheme_plans(id) ON DELETE CASCADE,
  
  -- Review information
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  reviewer_name TEXT, -- Denormalized for performance
  review_type TEXT NOT NULL CHECK (
    review_type IN (
      'initial_review',
      'technical_review',
      'compliance_review',
      'amendment_review',
      'final_review'
    )
  ),
  
  -- Review status
  status TEXT NOT NULL CHECK (
    status IN (
      'pending',
      'in_progress',
      'approved',
      'rejected',
      'requires_amendment'
    )
  ),
  
  -- Review details
  review_notes TEXT,
  findings JSONB DEFAULT '[]'::jsonb, -- Array of findings/issues
  recommendations TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_planning_reviews_plan_id 
  ON apr.planning_reviews(plan_id);
CREATE INDEX IF NOT EXISTS idx_planning_reviews_reviewer_id 
  ON apr.planning_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_planning_reviews_status 
  ON apr.planning_reviews(status);
CREATE INDEX IF NOT EXISTS idx_planning_reviews_started_at 
  ON apr.planning_reviews(started_at DESC);

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION apr.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER update_sectional_scheme_plans_updated_at
  BEFORE UPDATE ON apr.sectional_scheme_plans
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_updated_at_column();

-- Function to calculate centroid from boundary geometry
CREATE OR REPLACE FUNCTION apr.calculate_plan_centroid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.boundary_geometry IS NOT NULL THEN
    NEW.centroid := ST_Centroid(NEW.boundary_geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply centroid calculation trigger
CREATE TRIGGER calculate_sectional_scheme_plans_centroid
  BEFORE INSERT OR UPDATE OF boundary_geometry ON apr.sectional_scheme_plans
  FOR EACH ROW
  EXECUTE FUNCTION apr.calculate_plan_centroid();

-- Function to auto-increment version on update
CREATE OR REPLACE FUNCTION apr.increment_plan_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status OR OLD.boundary_geometry::text != NEW.boundary_geometry::text THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply version increment trigger
CREATE TRIGGER increment_sectional_scheme_plans_version
  BEFORE UPDATE ON apr.sectional_scheme_plans
  FOR EACH ROW
  EXECUTE FUNCTION apr.increment_plan_version();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE apr.sectional_scheme_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.plan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.planning_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTIONAL SCHEME PLANS POLICIES
-- ============================================================================

-- Planners can view their own plans
CREATE POLICY "Planners can view own plans"
  ON apr.sectional_scheme_plans
  FOR SELECT
  TO authenticated
  USING (
    planner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  );

-- Planners can create their own plans
CREATE POLICY "Planners can create own plans"
  ON apr.sectional_scheme_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    planner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'planner'
    )
  );

-- Planners can update their own plans (only in draft or returned_for_amendment status)
CREATE POLICY "Planners can update own plans"
  ON apr.sectional_scheme_plans
  FOR UPDATE
  TO authenticated
  USING (
    planner_id = auth.uid() AND
    status IN ('draft', 'returned_for_amendment')
  )
  WITH CHECK (
    planner_id = auth.uid() AND
    status IN ('draft', 'returned_for_amendment', 'submitted')
  );

-- Planning authority can view all plans
CREATE POLICY "Planning authority can view all plans"
  ON apr.sectional_scheme_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  );

-- Planning authority can update plans for review/approval/rejection
CREATE POLICY "Planning authority can review plans"
  ON apr.sectional_scheme_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  );

-- ============================================================================
-- PLAN DOCUMENTS POLICIES
-- ============================================================================

-- Users can view documents for plans they have access to
CREATE POLICY "Users can view plan documents"
  ON apr.plan_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sectional_scheme_plans
      WHERE id = plan_documents.plan_id AND (
        planner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
        )
      )
    )
  );

-- Planners can upload documents to their own plans
CREATE POLICY "Planners can upload documents"
  ON apr.plan_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.sectional_scheme_plans
      WHERE id = plan_documents.plan_id AND
        planner_id = auth.uid() AND
        status IN ('draft', 'returned_for_amendment')
    )
  );

-- Planners can update documents for their own plans
CREATE POLICY "Planners can update own documents"
  ON apr.plan_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sectional_scheme_plans
      WHERE id = plan_documents.plan_id AND
        planner_id = auth.uid() AND
        status IN ('draft', 'returned_for_amendment')
    )
  );

-- ============================================================================
-- PLANNING REVIEWS POLICIES
-- ============================================================================

-- Reviewers can view their own reviews
CREATE POLICY "Reviewers can view own reviews"
  ON apr.planning_reviews
  FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  );

-- Planning authority can create reviews
CREATE POLICY "Planning authority can create reviews"
  ON apr.planning_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  );

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews"
  ON apr.planning_reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('planning_authority', 'admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get plan status history (for audit trail)
CREATE OR REPLACE FUNCTION apr.get_plan_status_history(plan_id_param UUID)
RETURNS TABLE (
  status TEXT,
  changed_at TIMESTAMP WITH TIME ZONE,
  changed_by UUID,
  notes TEXT
) AS $$
BEGIN
  -- This would typically query an audit log table
  -- For now, return empty result
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.get_plan_status_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_plan_status_history(UUID) TO anon;

-- Add comments
COMMENT ON TABLE apr.sectional_scheme_plans IS 
  'Main table for sectional scheme plan submissions. Tracks plan lifecycle from draft to finalization.';

COMMENT ON TABLE apr.plan_documents IS 
  'Documents attached to sectional scheme plans. Supports multiple document types and versioning.';

COMMENT ON TABLE apr.planning_reviews IS 
  'Review records for planning applications. Tracks review process and findings.';

COMMENT ON COLUMN apr.sectional_scheme_plans.boundary_geometry IS 
  'Polygon geometry defining the plan boundary in UTM Zone 35S (SRID 32735).';

COMMENT ON COLUMN apr.sectional_scheme_plans.centroid IS 
  'Calculated centroid point of the boundary geometry. Automatically updated via trigger.';

COMMENT ON COLUMN apr.sectional_scheme_plans.workflow_state IS 
  'Current workflow state for state machine processing. Mirrors status column.';

