-- Deeds Database Schema Migration
-- Creates tables for scheme registration and title management
-- All tables use apr schema prefix as required

-- ============================================================================
-- SECTIONAL SCHEMES TABLE
-- ============================================================================
-- Main table for registered sectional schemes
CREATE TABLE IF NOT EXISTS apr.sectional_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scheme identification
  scheme_number TEXT UNIQUE NOT NULL, -- e.g., "SS/2025/HARARE/001"
  scheme_name TEXT NOT NULL,
  description TEXT,
  
  -- Reference to sealed survey (CRITICAL: must be sealed)
  survey_plan_id UUID NOT NULL REFERENCES apr.survey_sectional_plans(id) ON DELETE RESTRICT,
  
  -- Reference to planning plan
  planning_plan_id UUID NOT NULL REFERENCES apr.sectional_scheme_plans(id) ON DELETE RESTRICT,
  
  -- Communal land reference
  communal_land_id TEXT, -- Reference to parent communal land
  
  -- Body Corporate reference (added after body_corporates table is created)
  body_corporate_id UUID,
  
  -- Registration information
  registration_date TIMESTAMP WITH TIME ZONE,
  registered_by UUID REFERENCES auth.users(id),
  registration_number TEXT UNIQUE, -- Official registration number
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'submitted',
      'under_examination',
      'revision_requested',
      'approved',
      'rejected',
      'registered',
      'withdrawn'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'draft', -- Mirrors status for workflow engine
  
  -- Examination information
  examined_at TIMESTAMP WITH TIME ZONE,
  examined_by UUID REFERENCES auth.users(id),
  examination_notes TEXT,
  
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
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_scheme_number 
  ON apr.sectional_schemes(scheme_number);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_survey_plan_id 
  ON apr.sectional_schemes(survey_plan_id);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_planning_plan_id 
  ON apr.sectional_schemes(planning_plan_id);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_body_corporate_id 
  ON apr.sectional_schemes(body_corporate_id);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_status 
  ON apr.sectional_schemes(status);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_registration_date 
  ON apr.sectional_schemes(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_communal_land_id 
  ON apr.sectional_schemes(communal_land_id);

-- ============================================================================
-- SECTIONS TABLE
-- ============================================================================
-- Individual sections/units within a sectional scheme
CREATE TABLE IF NOT EXISTS apr.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to scheme
  scheme_id UUID NOT NULL REFERENCES apr.sectional_schemes(id) ON DELETE CASCADE,
  
  -- Section identification
  section_number TEXT NOT NULL, -- e.g., "Section 1", "Unit A1"
  section_type TEXT CHECK (
    section_type IN ('residential', 'commercial', 'parking', 'storage', 'common', 'other')
  ),
  
  -- Reference to survey geometry
  survey_section_id UUID REFERENCES apr.section_geometries(id), -- Links to survey geometry
  
  -- Area information
  area NUMERIC(10, 2) NOT NULL, -- Area in m²
  participation_quota NUMERIC(5, 4) NOT NULL, -- e.g., 33.3333%
  
  -- Geometry (denormalized from survey for deeds reference)
  geometry GEOMETRY(POLYGON, 32735), -- UTM Zone 35S
  exclusive_use_areas GEOMETRY(MULTIPOLYGON, 32735), -- Exclusive use areas
  
  -- Common property share
  common_area_share NUMERIC(10, 2), -- Share of common area in m²
  
  -- Legal description
  legal_description TEXT, -- Legal description of the section
  rights_and_conditions TEXT, -- Rights and conditions attached
  restrictions TEXT, -- Restrictions (communal tenure overlays, etc.)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: section number per scheme
  UNIQUE(scheme_id, section_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sections_scheme_id 
  ON apr.sections(scheme_id);
CREATE INDEX IF NOT EXISTS idx_sections_section_number 
  ON apr.sections(section_number);
CREATE INDEX IF NOT EXISTS idx_sections_section_type 
  ON apr.sections(section_type);
CREATE INDEX IF NOT EXISTS idx_sections_survey_section_id 
  ON apr.sections(survey_section_id);

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_sections_geometry 
  ON apr.sections USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_sections_exclusive_use_areas 
  ON apr.sections USING GIST(exclusive_use_areas);

-- ============================================================================
-- SECTIONAL TITLES TABLE
-- ============================================================================
-- Title certificates for individual sections
CREATE TABLE IF NOT EXISTS apr.sectional_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to section
  section_id UUID NOT NULL REFERENCES apr.sections(id) ON DELETE RESTRICT,
  
  -- Title identification
  title_number TEXT UNIQUE NOT NULL, -- e.g., "T/2025/HARARE/001"
  
  -- Holder information
  holder_id UUID, -- Reference to holder (could be person, company, etc.)
  holder_name TEXT NOT NULL,
  holder_type TEXT CHECK (
    holder_type IN ('individual', 'company', 'trust', 'government', 'other')
  ),
  holder_id_number TEXT, -- National ID, company registration, etc.
  
  -- Registration status
  registration_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    registration_status IN ('draft', 'submitted', 'under_examination', 'approved', 'registered', 'cancelled')
  ),
  
  -- Registration information
  registration_date TIMESTAMP WITH TIME ZONE,
  registered_by UUID REFERENCES auth.users(id),
  registration_number TEXT UNIQUE, -- Official registration number
  
  -- Examination information
  examined_at TIMESTAMP WITH TIME ZONE,
  examined_by UUID REFERENCES auth.users(id),
  examination_notes TEXT,
  
  -- Approval information
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Cancellation information
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  
  -- Digital signature and certificate
  digital_signature_id UUID, -- Reference to PKI signature
  certificate_url TEXT, -- URL to certificate document
  certificate_hash TEXT, -- Hash of certificate for verification
  qr_code TEXT, -- QR code data for certificate verification
  
  -- Legal information
  conditions TEXT, -- Conditions attached to title
  restrictions TEXT, -- Restrictions on title
  encumbrances JSONB DEFAULT '[]'::jsonb, -- Array of encumbrances (mortgages, etc.)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sectional_titles_section_id 
  ON apr.sectional_titles(section_id);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_title_number 
  ON apr.sectional_titles(title_number);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_registration_status 
  ON apr.sectional_titles(registration_status);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_holder_id 
  ON apr.sectional_titles(holder_id);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_registration_date 
  ON apr.sectional_titles(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_certificate_hash 
  ON apr.sectional_titles(certificate_hash);

-- ============================================================================
-- BODY CORPORATES TABLE
-- ============================================================================
-- Statutory Body Corporate entities for scheme governance
CREATE TABLE IF NOT EXISTS apr.body_corporates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to scheme
  scheme_id UUID NOT NULL UNIQUE REFERENCES apr.sectional_schemes(id) ON DELETE RESTRICT,
  
  -- Body Corporate identification
  registration_number TEXT UNIQUE NOT NULL, -- e.g., "BC/2025/HARARE/001"
  name TEXT NOT NULL, -- Body Corporate name (usually scheme name + "Body Corporate")
  
  -- Registration information
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  registered_by UUID REFERENCES auth.users(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'dormant', 'dissolved', 'under_administration')
  ),
  
  -- Governance information
  initial_trustees JSONB DEFAULT '[]'::jsonb, -- Array of initial trustee information
  trustee_count INTEGER DEFAULT 0,
  
  -- Contact information
  registered_address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Financial information
  annual_levy_amount NUMERIC(12, 2), -- Annual levy amount
  levy_currency TEXT DEFAULT 'USD',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_body_corporates_scheme_id 
  ON apr.body_corporates(scheme_id);
CREATE INDEX IF NOT EXISTS idx_body_corporates_registration_number 
  ON apr.body_corporates(registration_number);
CREATE INDEX IF NOT EXISTS idx_body_corporates_status 
  ON apr.body_corporates(status);
CREATE INDEX IF NOT EXISTS idx_body_corporates_registration_date 
  ON apr.body_corporates(registration_date DESC);

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION apr.update_deeds_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER update_sectional_schemes_updated_at
  BEFORE UPDATE ON apr.sectional_schemes
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_deeds_updated_at_column();

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON apr.sections
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_deeds_updated_at_column();

CREATE TRIGGER update_sectional_titles_updated_at
  BEFORE UPDATE ON apr.sectional_titles
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_deeds_updated_at_column();

CREATE TRIGGER update_body_corporates_updated_at
  BEFORE UPDATE ON apr.body_corporates
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_deeds_updated_at_column();

-- Function to auto-increment version on update
CREATE OR REPLACE FUNCTION apr.increment_deeds_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply version increment trigger
CREATE TRIGGER increment_sectional_schemes_version
  BEFORE UPDATE ON apr.sectional_schemes
  FOR EACH ROW
  EXECUTE FUNCTION apr.increment_deeds_version();

-- Function to validate survey is sealed before scheme registration
CREATE OR REPLACE FUNCTION apr.validate_survey_sealed()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow draft status without sealed survey check
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;
  
  -- For non-draft statuses, survey must be sealed
  IF NOT EXISTS (
    SELECT 1 FROM apr.survey_sectional_plans
    WHERE id = NEW.survey_plan_id AND status = 'sealed'
  ) THEN
    DECLARE
      survey_status TEXT;
    BEGIN
      SELECT status INTO survey_status
      FROM apr.survey_sectional_plans
      WHERE id = NEW.survey_plan_id;
      
      RAISE EXCEPTION 'Survey must be sealed before scheme can be registered. Current survey status: %', survey_status;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply survey sealed validation trigger
CREATE TRIGGER validate_survey_sealed_trigger
  BEFORE INSERT OR UPDATE ON apr.sectional_schemes
  FOR EACH ROW
  EXECUTE FUNCTION apr.validate_survey_sealed();

-- Function to validate participation quotas sum to 100%
CREATE OR REPLACE FUNCTION apr.validate_scheme_quotas()
RETURNS TRIGGER AS $$
DECLARE
  quota_sum NUMERIC(5, 4);
BEGIN
  -- Calculate sum of participation quotas for all sections in the scheme
  SELECT COALESCE(SUM(participation_quota), 0) INTO quota_sum
  FROM apr.sections
  WHERE scheme_id = COALESCE(NEW.scheme_id, OLD.scheme_id);
  
  -- Allow small rounding differences (within 0.0001)
  IF ABS(quota_sum - 100.0) > 0.0001 THEN
    RAISE EXCEPTION 'Participation quotas must sum to 100%%. Current sum: %', quota_sum;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply quota validation trigger (on sections table)
CREATE TRIGGER validate_scheme_quotas_trigger
  AFTER INSERT OR UPDATE OR DELETE ON apr.sections
  FOR EACH ROW
  EXECUTE FUNCTION apr.validate_scheme_quotas();

-- ============================================================================
-- ADD BODY CORPORATE FOREIGN KEY
-- ============================================================================
-- Add foreign key constraint after body_corporates table is created
ALTER TABLE apr.sectional_schemes
  ADD CONSTRAINT fk_sectional_schemes_body_corporate
  FOREIGN KEY (body_corporate_id) 
  REFERENCES apr.body_corporates(id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE apr.sectional_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.sectional_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.body_corporates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTIONAL SCHEMES POLICIES
-- ============================================================================

-- Conveyancers can view schemes they created
CREATE POLICY "Conveyancers can view own schemes"
  ON apr.sectional_schemes
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
    )
  );

-- Conveyancers can create schemes for sealed surveys
CREATE POLICY "Conveyancers can create schemes"
  ON apr.sectional_schemes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'conveyancer'
    ) AND
    EXISTS (
      SELECT 1 FROM apr.survey_sectional_plans
      WHERE id = survey_plan_id AND status = 'sealed'
    )
  );

-- Conveyancers can update their own schemes (only in draft or revision_requested status)
CREATE POLICY "Conveyancers can update own schemes"
  ON apr.sectional_schemes
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    status IN ('draft', 'revision_requested')
  )
  WITH CHECK (
    created_by = auth.uid() AND
    status IN ('draft', 'revision_requested', 'submitted')
  );

-- Deeds examiners can view all schemes
CREATE POLICY "Deeds examiners can view all schemes"
  ON apr.sectional_schemes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
    )
  );

-- Deeds examiners can examine schemes
CREATE POLICY "Deeds examiners can examine schemes"
  ON apr.sectional_schemes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
    )
  );

-- Registrars can register schemes
CREATE POLICY "Registrars can register schemes"
  ON apr.sectional_schemes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  );

-- ============================================================================
-- SECTIONS POLICIES
-- ============================================================================

-- Users can view sections for schemes they have access to
CREATE POLICY "Users can view sections"
  ON apr.sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sectional_schemes
      WHERE id = sections.scheme_id AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
        )
      )
    )
  );

-- Conveyancers can create/update sections for their own schemes
CREATE POLICY "Conveyancers can manage sections"
  ON apr.sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sectional_schemes
      WHERE id = sections.scheme_id AND
        created_by = auth.uid() AND
        status IN ('draft', 'revision_requested')
    )
  );

-- ============================================================================
-- SECTIONAL TITLES POLICIES
-- ============================================================================

-- Users can view titles for sections they have access to
CREATE POLICY "Users can view sectional titles"
  ON apr.sectional_titles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sections s
      JOIN apr.sectional_schemes sc ON s.scheme_id = sc.id
      WHERE s.id = sectional_titles.section_id AND (
        sc.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
        )
      )
    )
  );

-- Conveyancers can create titles for their own schemes
CREATE POLICY "Conveyancers can create titles"
  ON apr.sectional_titles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.sections s
      JOIN apr.sectional_schemes sc ON s.scheme_id = sc.id
      WHERE s.id = sectional_titles.section_id AND
        sc.created_by = auth.uid() AND
        sc.status IN ('draft', 'revision_requested')
    )
  );

-- Conveyancers can update titles for their own schemes
CREATE POLICY "Conveyancers can update titles"
  ON apr.sectional_titles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sections s
      JOIN apr.sectional_schemes sc ON s.scheme_id = sc.id
      WHERE s.id = sectional_titles.section_id AND
        sc.created_by = auth.uid() AND
        sc.status IN ('draft', 'revision_requested')
    )
  );

-- Registrars can register titles
CREATE POLICY "Registrars can register titles"
  ON apr.sectional_titles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  );

-- ============================================================================
-- BODY CORPORATES POLICIES
-- ============================================================================

-- Users can view body corporates for schemes they have access to
CREATE POLICY "Users can view body corporates"
  ON apr.body_corporates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.sectional_schemes
      WHERE id = body_corporates.scheme_id AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM apr.user_profiles
          WHERE id = auth.uid() AND role IN ('deeds_examiner', 'registrar', 'admin')
        )
      )
    )
  );

-- Registrars can create body corporates
CREATE POLICY "Registrars can create body corporates"
  ON apr.body_corporates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  );

-- Registrars can update body corporates
CREATE POLICY "Registrars can update body corporates"
  ON apr.body_corporates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE apr.sectional_schemes IS 
  'Main table for registered sectional schemes. Links to sealed surveys and planning plans.';

COMMENT ON TABLE apr.sections IS 
  'Individual sections/units within a sectional scheme. Contains area, quota, and geometry information.';

COMMENT ON TABLE apr.sectional_titles IS 
  'Title certificates for individual sections. Tracks registration status and holder information.';

COMMENT ON TABLE apr.body_corporates IS 
  'Statutory Body Corporate entities for scheme governance. One per scheme.';

COMMENT ON FUNCTION apr.validate_survey_sealed IS 
  'Ensures that surveys must be sealed before scheme registration (except in draft status).';

COMMENT ON COLUMN apr.sections.participation_quota IS 
  'Participation quota as percentage. Must sum to 100% for all sections in a scheme.';

COMMENT ON COLUMN apr.sectional_titles.certificate_hash IS 
  'Hash of certificate document for verification. Used with QR code for document integrity.';

