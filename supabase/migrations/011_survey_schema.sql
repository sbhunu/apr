-- Survey Database Schema Migration
-- Creates tables for survey module with spatial geometry storage
-- All tables use apr schema prefix as required

-- ============================================================================
-- SURVEY SECTIONAL PLANS TABLE
-- ============================================================================
-- Main table for survey sectional plans linked to approved planning plans
CREATE TABLE IF NOT EXISTS apr.survey_sectional_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to approved planning plan
  planning_plan_id UUID NOT NULL REFERENCES apr.sectional_scheme_plans(id) ON DELETE RESTRICT,
  
  -- Survey identification
  survey_number TEXT UNIQUE NOT NULL, -- e.g., "SURVEY-2024-001"
  title TEXT NOT NULL,
  description TEXT,
  
  -- Surveyor information
  surveyor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  surveyor_name TEXT, -- Denormalized for performance
  surveyor_registration_number TEXT, -- Professional registration number
  
  -- Survey status and workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'computed',
      'under_review',
      'revision_requested',
      'sealed',
      'rejected',
      'withdrawn'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'draft', -- Mirrors status for workflow engine
  
  -- Parent parcel geometry (outside figure)
  parent_parcel_geometry GEOMETRY(POLYGON, 32735), -- UTM Zone 35S
  parent_parcel_area NUMERIC(12, 2), -- Area in m² (computed)
  parent_parcel_centroid GEOMETRY(POINT, 32735), -- Calculated centroid
  
  -- Control points and datum
  control_points JSONB DEFAULT '[]'::jsonb, -- Array of control point coordinates
  datum TEXT DEFAULT 'WGS84', -- Datum used
  projection TEXT DEFAULT 'UTM Zone 35S', -- Projection system
  
  -- Survey computation results
  closure_error NUMERIC(10, 6), -- Closure error
  accuracy_ratio NUMERIC(10, 2), -- e.g., 1:10000
  computation_status TEXT CHECK (
    computation_status IN ('pending', 'in_progress', 'completed', 'failed')
  ),
  
  -- Review information
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  
  -- Approval and sealing information
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  sealed_at TIMESTAMP WITH TIME ZONE,
  sealed_by UUID REFERENCES auth.users(id),
  seal_hash TEXT, -- Digital seal hash
  seal_certificate_url TEXT, -- URL to seal certificate
  
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
  parent_survey_id UUID REFERENCES apr.survey_sectional_plans(id), -- For amendments
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_planning_plan_id 
  ON apr.survey_sectional_plans(planning_plan_id);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_status 
  ON apr.survey_sectional_plans(status);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_surveyor_id 
  ON apr.survey_sectional_plans(surveyor_id);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_survey_number 
  ON apr.survey_sectional_plans(survey_number);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_created_at 
  ON apr.survey_sectional_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_submitted_at 
  ON apr.survey_sectional_plans(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_parent_survey_id 
  ON apr.survey_sectional_plans(parent_survey_id);

-- Create spatial indexes for geometry columns
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_parent_parcel_geometry 
  ON apr.survey_sectional_plans USING GIST(parent_parcel_geometry);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_parent_parcel_centroid 
  ON apr.survey_sectional_plans USING GIST(parent_parcel_centroid);

-- ============================================================================
-- PARENT PARCELS TABLE
-- ============================================================================
-- Detailed parent parcel information and control points
CREATE TABLE IF NOT EXISTS apr.parent_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to survey plan
  survey_plan_id UUID NOT NULL REFERENCES apr.survey_sectional_plans(id) ON DELETE CASCADE,
  
  -- Parcel identification
  parcel_number TEXT,
  parcel_name TEXT,
  
  -- Geometry
  boundary_geometry GEOMETRY(POLYGON, 32735), -- UTM Zone 35S
  boundary_coordinates JSONB DEFAULT '[]'::jsonb, -- Array of coordinate pairs
  
  -- Area information
  computed_area NUMERIC(12, 2), -- Computed area in m²
  declared_area NUMERIC(12, 2), -- Declared area in m²
  area_difference NUMERIC(12, 2), -- Difference between computed and declared
  
  -- Control points
  control_points JSONB DEFAULT '[]'::jsonb, -- Array of control point objects
  control_point_count INTEGER DEFAULT 0,
  
  -- Survey metadata
  survey_method TEXT CHECK (
    survey_method IN ('GNSS', 'conventional', 'photogrammetry', 'other')
  ),
  survey_date DATE,
  survey_equipment TEXT,
  
  -- Datum and projection
  datum TEXT DEFAULT 'WGS84',
  projection_system TEXT DEFAULT 'UTM Zone 35S',
  srid INTEGER DEFAULT 32735,
  
  -- Computation results
  closure_error NUMERIC(10, 6),
  accuracy_ratio NUMERIC(10, 2),
  computation_notes TEXT,
  
  -- Validation status
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  validation_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parent_parcels_survey_plan_id 
  ON apr.parent_parcels(survey_plan_id);
CREATE INDEX IF NOT EXISTS idx_parent_parcels_is_validated 
  ON apr.parent_parcels(is_validated) WHERE is_validated = true;

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_parent_parcels_boundary_geometry 
  ON apr.parent_parcels USING GIST(boundary_geometry);

-- ============================================================================
-- SECTION GEOMETRIES TABLE
-- ============================================================================
-- Individual sectional unit geometries with areas and quotas
CREATE TABLE IF NOT EXISTS apr.section_geometries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to survey plan
  survey_plan_id UUID NOT NULL REFERENCES apr.survey_sectional_plans(id) ON DELETE CASCADE,
  
  -- Section identification
  section_number TEXT NOT NULL, -- e.g., "Section 1", "Unit A1"
  section_type TEXT CHECK (
    section_type IN ('residential', 'commercial', 'parking', 'storage', 'common', 'other')
  ),
  
  -- Geometry
  geometry GEOMETRY(POLYGON, 32735), -- Unit polygon in UTM Zone 35S
  floor_level INTEGER DEFAULT 0, -- Floor level (0 = ground, negative = basement)
  is_3d BOOLEAN DEFAULT false, -- Whether this is a 3D unit
  
  -- Area information
  computed_area NUMERIC(10, 2) NOT NULL, -- Computed area in m²
  declared_area NUMERIC(10, 2), -- Declared area from plan
  area_difference NUMERIC(10, 2), -- Difference between computed and declared
  
  -- Dimensions
  dimensions JSONB DEFAULT '{}'::jsonb, -- Length, width, height, etc.
  
  -- Common property and quotas
  participation_quota NUMERIC(5, 4), -- Participation quota (e.g., 33.3333%)
  common_area_share NUMERIC(10, 2), -- Share of common area in m²
  
  -- Exclusive use areas
  exclusive_use_areas GEOMETRY(MULTIPOLYGON, 32735), -- Exclusive use areas (balconies, patios, etc.)
  exclusive_use_area_total NUMERIC(10, 2), -- Total exclusive use area in m²
  
  -- Validation flags
  is_validated BOOLEAN DEFAULT false,
  containment_validated BOOLEAN DEFAULT false, -- Validated against parent parcel
  overlap_validated BOOLEAN DEFAULT false, -- Validated against other sections
  
  -- Validation metadata
  validation_notes TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_section_geometries_survey_plan_id 
  ON apr.section_geometries(survey_plan_id);
CREATE INDEX IF NOT EXISTS idx_section_geometries_section_number 
  ON apr.section_geometries(section_number);
CREATE INDEX IF NOT EXISTS idx_section_geometries_section_type 
  ON apr.section_geometries(section_type);
CREATE INDEX IF NOT EXISTS idx_section_geometries_floor_level 
  ON apr.section_geometries(floor_level);
CREATE INDEX IF NOT EXISTS idx_section_geometries_is_validated 
  ON apr.section_geometries(is_validated) WHERE is_validated = true;

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_section_geometries_geometry 
  ON apr.section_geometries USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_section_geometries_exclusive_use_areas 
  ON apr.section_geometries USING GIST(exclusive_use_areas);

-- ============================================================================
-- SURVEY COMPUTATIONS TABLE
-- ============================================================================
-- Survey computation results and accuracy reports
CREATE TABLE IF NOT EXISTS apr.survey_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to survey plan
  survey_plan_id UUID NOT NULL REFERENCES apr.survey_sectional_plans(id) ON DELETE CASCADE,
  
  -- Computation type
  computation_type TEXT NOT NULL CHECK (
    computation_type IN (
      'outside_figure',
      'traverse',
      'area',
      'closure',
      'least_squares',
      'topology_validation',
      'quota_calculation'
    )
  ),
  
  -- Computation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'failed')
  ),
  
  -- Outside figure computation results
  outside_figure_area NUMERIC(12, 2), -- Total outside figure area in m²
  outside_figure_perimeter NUMERIC(12, 2), -- Perimeter in meters
  
  -- Traverse computation results
  traverse_data JSONB DEFAULT '{}'::jsonb, -- Traverse coordinates and measurements
  traverse_closure_error NUMERIC(10, 6), -- Closure error
  traverse_accuracy_ratio NUMERIC(10, 2), -- Accuracy ratio (e.g., 1:10000)
  
  -- Closure analysis
  closure_error_x NUMERIC(10, 6), -- Closure error in X direction
  closure_error_y NUMERIC(10, 6), -- Closure error in Y direction
  closure_error_total NUMERIC(10, 6), -- Total closure error
  closure_tolerance NUMERIC(10, 6), -- Maximum allowed closure error
  
  -- Least squares adjustment
  adjustment_applied BOOLEAN DEFAULT false,
  adjustment_method TEXT, -- Method used for adjustment
  adjustment_results JSONB DEFAULT '{}'::jsonb, -- Adjustment results
  
  -- Area consistency checks
  total_section_area NUMERIC(12, 2), -- Sum of all section areas
  common_area_total NUMERIC(12, 2), -- Total common area
  residual_area NUMERIC(12, 2), -- Residual parent land area
  area_consistency_check BOOLEAN DEFAULT false, -- Whether areas are consistent
  
  -- Participation quota calculation
  quota_calculation JSONB DEFAULT '{}'::jsonb, -- Quota calculation details
  quota_sum NUMERIC(5, 4), -- Sum of all quotas (should be 100%)
  quota_validated BOOLEAN DEFAULT false, -- Whether quotas sum to 100%
  
  -- Topology validation results
  topology_errors JSONB DEFAULT '[]'::jsonb, -- Array of topology errors found
  overlap_detected BOOLEAN DEFAULT false,
  gap_detected BOOLEAN DEFAULT false,
  containment_valid BOOLEAN DEFAULT false,
  
  -- Computation metadata
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  computed_by UUID REFERENCES auth.users(id),
  computation_notes TEXT,
  computation_duration_ms INTEGER, -- Computation duration in milliseconds
  
  -- Results and reports
  results JSONB DEFAULT '{}'::jsonb, -- Detailed computation results
  accuracy_report JSONB DEFAULT '{}'::jsonb, -- Accuracy assessment report
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_computations_survey_plan_id 
  ON apr.survey_computations(survey_plan_id);
CREATE INDEX IF NOT EXISTS idx_survey_computations_computation_type 
  ON apr.survey_computations(computation_type);
CREATE INDEX IF NOT EXISTS idx_survey_computations_status 
  ON apr.survey_computations(status);
CREATE INDEX IF NOT EXISTS idx_survey_computations_computed_at 
  ON apr.survey_computations(computed_at DESC);

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION apr.update_survey_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER update_survey_sectional_plans_updated_at
  BEFORE UPDATE ON apr.survey_sectional_plans
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_survey_updated_at_column();

CREATE TRIGGER update_parent_parcels_updated_at
  BEFORE UPDATE ON apr.parent_parcels
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_survey_updated_at_column();

CREATE TRIGGER update_section_geometries_updated_at
  BEFORE UPDATE ON apr.section_geometries
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_survey_updated_at_column();

CREATE TRIGGER update_survey_computations_updated_at
  BEFORE UPDATE ON apr.survey_computations
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_survey_updated_at_column();

-- Function to calculate parent parcel area and centroid
CREATE OR REPLACE FUNCTION apr.calculate_parent_parcel_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_parcel_geometry IS NOT NULL THEN
    NEW.parent_parcel_area := ST_Area(NEW.parent_parcel_geometry);
    NEW.parent_parcel_centroid := ST_Centroid(NEW.parent_parcel_geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply parent parcel metrics trigger
CREATE TRIGGER calculate_survey_parent_parcel_metrics
  BEFORE INSERT OR UPDATE OF parent_parcel_geometry ON apr.survey_sectional_plans
  FOR EACH ROW
  EXECUTE FUNCTION apr.calculate_parent_parcel_metrics();

-- Function to calculate section area
CREATE OR REPLACE FUNCTION apr.calculate_section_area()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.geometry IS NOT NULL THEN
    NEW.computed_area := ST_Area(NEW.geometry);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply section area calculation trigger
CREATE TRIGGER calculate_section_geometries_area
  BEFORE INSERT OR UPDATE OF geometry ON apr.section_geometries
  FOR EACH ROW
  EXECUTE FUNCTION apr.calculate_section_area();

-- Function to auto-increment version on update
CREATE OR REPLACE FUNCTION apr.increment_survey_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status OR 
     OLD.parent_parcel_geometry::text != NEW.parent_parcel_geometry::text THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply version increment trigger
CREATE TRIGGER increment_survey_sectional_plans_version
  BEFORE UPDATE ON apr.survey_sectional_plans
  FOR EACH ROW
  EXECUTE FUNCTION apr.increment_survey_version();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE apr.survey_sectional_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.parent_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.section_geometries ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.survey_computations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SURVEY SECTIONAL PLANS POLICIES
-- ============================================================================

-- Surveyors can view their own surveys
CREATE POLICY "Surveyors can view own surveys"
  ON apr.survey_sectional_plans
  FOR SELECT
  TO authenticated
  USING (
    surveyor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
    )
  );

-- Surveyors can create surveys for approved planning plans
CREATE POLICY "Surveyors can create surveys"
  ON apr.survey_sectional_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    surveyor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'surveyor'
    ) AND
    EXISTS (
      SELECT 1 FROM apr.sectional_scheme_plans
      WHERE id = planning_plan_id AND 
        status = 'approved_planning_authority' AND
        workflow_state = 'approved'
    )
  );

-- Surveyors can update their own surveys (only in draft or revision_requested status)
CREATE POLICY "Surveyors can update own surveys"
  ON apr.survey_sectional_plans
  FOR UPDATE
  TO authenticated
  USING (
    surveyor_id = auth.uid() AND
    status IN ('draft', 'revision_requested')
  )
  WITH CHECK (
    surveyor_id = auth.uid() AND
    status IN ('draft', 'revision_requested', 'computed')
  );

-- Surveyor-General can view all surveys
CREATE POLICY "Surveyor-General can view all surveys"
  ON apr.survey_sectional_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
    )
  );

-- Surveyor-General can review and seal surveys
CREATE POLICY "Surveyor-General can review surveys"
  ON apr.survey_sectional_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
    )
  );

-- ============================================================================
-- PARENT PARCELS POLICIES
-- ============================================================================

-- Users can view parcels for surveys they have access to
CREATE POLICY "Users can view parent parcels"
  ON apr.parent_parcels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = parent_parcels.survey_plan_id AND (
        surveyor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
        )
      )
    )
  );

-- Surveyors can create/update parcels for their own surveys
CREATE POLICY "Surveyors can manage parent parcels"
  ON apr.parent_parcels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = parent_parcels.survey_plan_id AND
        surveyor_id = auth.uid() AND
        status IN ('draft', 'revision_requested')
    )
  );

-- ============================================================================
-- SECTION GEOMETRIES POLICIES
-- ============================================================================

-- Users can view section geometries for surveys they have access to
CREATE POLICY "Users can view section geometries"
  ON apr.section_geometries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = section_geometries.survey_plan_id AND (
        surveyor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
        )
      )
    )
  );

-- Surveyors can create/update sections for their own surveys
CREATE POLICY "Surveyors can manage section geometries"
  ON apr.section_geometries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = section_geometries.survey_plan_id AND
        surveyor_id = auth.uid() AND
        status IN ('draft', 'revision_requested')
    )
  );

-- ============================================================================
-- SURVEY COMPUTATIONS POLICIES
-- ============================================================================

-- Users can view computations for surveys they have access to
CREATE POLICY "Users can view survey computations"
  ON apr.survey_computations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = survey_computations.survey_plan_id AND (
        surveyor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('surveyor_general', 'admin')
        )
      )
    )
  );

-- Surveyors can create computations for their own surveys
CREATE POLICY "Surveyors can create survey computations"
  ON apr.survey_computations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = survey_computations.survey_plan_id AND
        surveyor_id = auth.uid()
    )
  );

-- Surveyors can update computations for their own surveys
CREATE POLICY "Surveyors can update survey computations"
  ON apr.survey_computations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = survey_computations.survey_plan_id AND
        surveyor_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE apr.survey_sectional_plans IS 
  'Main table for survey sectional plans. Links to approved planning plans and tracks survey workflow from draft to sealed.';

COMMENT ON TABLE apr.parent_parcels IS 
  'Parent parcel geometry and control point data. Stores boundary coordinates and survey metadata.';

COMMENT ON TABLE apr.section_geometries IS 
  'Individual sectional unit geometries with computed areas and participation quotas.';

COMMENT ON TABLE apr.survey_computations IS 
  'Survey computation results including traverse calculations, closure analysis, and accuracy reports.';

COMMENT ON COLUMN apr.survey_sectional_plans.parent_parcel_geometry IS 
  'Polygon geometry defining the parent parcel boundary in UTM Zone 35S (SRID 32735).';

COMMENT ON COLUMN apr.section_geometries.participation_quota IS 
  'Participation quota calculated using South African formula: (unit_area / total_unit_area) * 100.';

COMMENT ON COLUMN apr.section_geometries.computed_area IS 
  'Computed area in square meters using PostGIS ST_Area function. Automatically calculated via trigger.';

