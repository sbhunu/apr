-- Operations Database Schema Migration
-- Creates tables for post-registration operations: transfers, mortgages, leases, amendments
-- All tables use apr schema prefix as required

-- ============================================================================
-- OWNERSHIP TRANSFERS TABLE
-- ============================================================================
-- Records ownership transfers (sale, inheritance, gift) of registered titles
CREATE TABLE IF NOT EXISTS apr.ownership_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to registered title (CRITICAL: must be registered)
  title_id UUID NOT NULL REFERENCES apr.sectional_titles(id) ON DELETE RESTRICT,
  
  -- Transfer type
  transfer_type TEXT NOT NULL CHECK (
    transfer_type IN ('sale', 'inheritance', 'gift', 'court_order', 'other')
  ),
  
  -- Current owner (from title)
  current_holder_id UUID,
  current_holder_name TEXT NOT NULL,
  
  -- New owner
  new_holder_id UUID,
  new_holder_name TEXT NOT NULL,
  new_holder_type TEXT CHECK (
    new_holder_type IN ('individual', 'company', 'trust', 'government', 'other')
  ),
  
  -- Transfer details
  consideration_amount NUMERIC(12, 2), -- Sale price or value
  consideration_currency TEXT DEFAULT 'USD',
  transfer_date DATE NOT NULL,
  effective_date DATE NOT NULL, -- When transfer takes effect
  
  -- Transfer instrument
  transfer_instrument_type TEXT CHECK (
    transfer_instrument_type IN ('deed_of_sale', 'will', 'gift_deed', 'court_order', 'other')
  ),
  transfer_instrument_reference TEXT,
  transfer_instrument_document_id UUID, -- Reference to storage.objects
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'registered',
      'cancelled'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'submitted',
  
  -- Review information
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
  
  -- Registration information
  registered_at TIMESTAMP WITH TIME ZONE,
  registered_by UUID REFERENCES auth.users(id),
  registration_number TEXT UNIQUE,
  
  -- Digital signatures
  transferor_signature_id UUID, -- Reference to digital signature
  transferee_signature_id UUID,
  registrar_signature_id UUID,
  
  -- Version tracking
  previous_title_version INTEGER, -- Version of title before transfer
  new_title_version INTEGER, -- Version of title after transfer
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_title_id 
  ON apr.ownership_transfers(title_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status 
  ON apr.ownership_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_transfer_date 
  ON apr.ownership_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_effective_date 
  ON apr.ownership_transfers(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_new_holder_id 
  ON apr.ownership_transfers(new_holder_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_registration_number 
  ON apr.ownership_transfers(registration_number);

-- ============================================================================
-- MORTGAGES TABLE
-- ============================================================================
-- Records mortgages/charges registered against sectional titles
CREATE TABLE IF NOT EXISTS apr.mortgages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to registered title
  title_id UUID NOT NULL REFERENCES apr.sectional_titles(id) ON DELETE RESTRICT,
  
  -- Mortgage identification
  mortgage_number TEXT UNIQUE NOT NULL, -- e.g., "MORT/2025/HARARE/001"
  
  -- Lender information
  lender_name TEXT NOT NULL,
  lender_type TEXT CHECK (
    lender_type IN ('bank', 'financial_institution', 'private_lender', 'government', 'other')
  ),
  lender_registration_number TEXT,
  lender_contact_email TEXT,
  lender_contact_phone TEXT,
  
  -- Borrower information (from title holder)
  borrower_id UUID,
  borrower_name TEXT NOT NULL,
  
  -- Mortgage details
  mortgage_amount NUMERIC(12, 2) NOT NULL,
  mortgage_currency TEXT DEFAULT 'USD',
  interest_rate NUMERIC(5, 2), -- Annual interest rate percentage
  term_months INTEGER, -- Loan term in months
  
  -- Mortgage dates
  mortgage_date DATE NOT NULL,
  registration_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date DATE, -- When mortgage expires (if applicable)
  
  -- Mortgage instrument
  mortgage_deed_reference TEXT,
  mortgage_deed_document_id UUID, -- Reference to storage.objects
  
  -- Status
  status TEXT NOT NULL DEFAULT 'registered' CHECK (
    status IN (
      'registered',
      'discharged',
      'foreclosed',
      'cancelled'
    )
  ),
  
  -- Discharge information
  discharged_at TIMESTAMP WITH TIME ZONE,
  discharged_by UUID REFERENCES auth.users(id),
  discharge_document_id UUID,
  discharge_reference TEXT,
  
  -- Foreclosure information
  foreclosed_at TIMESTAMP WITH TIME ZONE,
  foreclosed_by UUID REFERENCES auth.users(id),
  foreclosure_reference TEXT,
  
  -- Digital signatures
  lender_signature_id UUID,
  borrower_signature_id UUID,
  registrar_signature_id UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mortgages_title_id 
  ON apr.mortgages(title_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_mortgage_number 
  ON apr.mortgages(mortgage_number);
CREATE INDEX IF NOT EXISTS idx_mortgages_status 
  ON apr.mortgages(status);
CREATE INDEX IF NOT EXISTS idx_mortgages_registration_date 
  ON apr.mortgages(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_mortgages_lender_name 
  ON apr.mortgages(lender_name);
CREATE INDEX IF NOT EXISTS idx_mortgages_expiry_date 
  ON apr.mortgages(expiry_date);

-- ============================================================================
-- LEASES TABLE
-- ============================================================================
-- Records long-term leases on sectional units
CREATE TABLE IF NOT EXISTS apr.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to registered title
  title_id UUID NOT NULL REFERENCES apr.sectional_titles(id) ON DELETE RESTRICT,
  
  -- Lease identification
  lease_number TEXT UNIQUE NOT NULL, -- e.g., "LEASE/2025/HARARE/001"
  
  -- Lessor information (title holder)
  lessor_id UUID,
  lessor_name TEXT NOT NULL,
  
  -- Lessee information
  lessee_id UUID,
  lessee_name TEXT NOT NULL,
  lessee_type TEXT CHECK (
    lessee_type IN ('individual', 'company', 'trust', 'government', 'other')
  ),
  lessee_contact_email TEXT,
  lessee_contact_phone TEXT,
  
  -- Lease details
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NOT NULL,
  lease_term_months INTEGER NOT NULL, -- Calculated from start/end dates
  monthly_rent NUMERIC(10, 2),
  rent_currency TEXT DEFAULT 'USD',
  deposit_amount NUMERIC(10, 2),
  
  -- Lease terms
  renewal_option BOOLEAN DEFAULT false,
  renewal_term_months INTEGER,
  early_termination_allowed BOOLEAN DEFAULT false,
  termination_notice_days INTEGER,
  
  -- Lease instrument
  lease_agreement_reference TEXT,
  lease_agreement_document_id UUID, -- Reference to storage.objects
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN (
      'active',
      'expired',
      'terminated',
      'renewed',
      'cancelled'
    )
  ),
  
  -- Termination information
  terminated_at TIMESTAMP WITH TIME ZONE,
  terminated_by UUID REFERENCES auth.users(id),
  termination_reason TEXT,
  
  -- Renewal information
  renewed_at TIMESTAMP WITH TIME ZONE,
  renewed_lease_id UUID REFERENCES apr.leases(id), -- Link to new lease
  
  -- Digital signatures
  lessor_signature_id UUID,
  lessee_signature_id UUID,
  witness_signature_id UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leases_title_id 
  ON apr.leases(title_id);
CREATE INDEX IF NOT EXISTS idx_leases_lease_number 
  ON apr.leases(lease_number);
CREATE INDEX IF NOT EXISTS idx_leases_status 
  ON apr.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_lease_start_date 
  ON apr.leases(lease_start_date);
CREATE INDEX IF NOT EXISTS idx_leases_lease_end_date 
  ON apr.leases(lease_end_date);
CREATE INDEX IF NOT EXISTS idx_leases_lessee_id 
  ON apr.leases(lessee_id);

-- ============================================================================
-- SCHEME AMENDMENTS TABLE
-- ============================================================================
-- Records amendments to registered schemes (extensions, subdivisions, consolidations)
CREATE TABLE IF NOT EXISTS apr.scheme_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to registered scheme
  scheme_id UUID NOT NULL REFERENCES apr.sectional_schemes(id) ON DELETE RESTRICT,
  
  -- Amendment identification
  amendment_number TEXT UNIQUE NOT NULL, -- e.g., "AMEND/2025/HARARE/001"
  
  -- Amendment type
  amendment_type TEXT NOT NULL CHECK (
    amendment_type IN (
      'extension', -- Add new sections
      'subdivision', -- Split section into multiple
      'consolidation', -- Merge sections
      'exclusive_use_change', -- Change exclusive use areas
      'quota_adjustment', -- Adjust participation quotas
      'other'
    )
  ),
  
  -- Amendment description
  description TEXT NOT NULL,
  reason TEXT, -- Reason for amendment
  
  -- Affected sections
  affected_section_ids UUID[], -- Array of section IDs affected
  
  -- New sections (for extensions/subdivisions)
  new_section_count INTEGER DEFAULT 0,
  
  -- Survey information
  survey_plan_id UUID REFERENCES apr.survey_sectional_plans(id),
  amended_geometry GEOMETRY(Polygon, 32735), -- Updated scheme geometry
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'registered',
      'cancelled'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'submitted',
  
  -- Review information
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
  
  -- Registration information
  registered_at TIMESTAMP WITH TIME ZONE,
  registered_by UUID REFERENCES auth.users(id),
  registration_date DATE,
  
  -- Version tracking
  previous_scheme_version INTEGER, -- Version before amendment
  new_scheme_version INTEGER, -- Version after amendment
  
  -- Digital signatures
  applicant_signature_id UUID,
  surveyor_signature_id UUID,
  registrar_signature_id UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheme_amendments_scheme_id 
  ON apr.scheme_amendments(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_amendments_amendment_number 
  ON apr.scheme_amendments(amendment_number);
CREATE INDEX IF NOT EXISTS idx_scheme_amendments_status 
  ON apr.scheme_amendments(status);
CREATE INDEX IF NOT EXISTS idx_scheme_amendments_amendment_type 
  ON apr.scheme_amendments(amendment_type);
CREATE INDEX IF NOT EXISTS idx_scheme_amendments_registration_date 
  ON apr.scheme_amendments(registration_date DESC);

-- Spatial index for amended geometry
CREATE INDEX IF NOT EXISTS idx_scheme_amendments_geometry 
  ON apr.scheme_amendments USING GIST(amended_geometry);

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION apr.update_operations_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER update_ownership_transfers_updated_at
  BEFORE UPDATE ON apr.ownership_transfers
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_operations_updated_at_column();

CREATE TRIGGER update_mortgages_updated_at
  BEFORE UPDATE ON apr.mortgages
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_operations_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON apr.leases
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_operations_updated_at_column();

CREATE TRIGGER update_scheme_amendments_updated_at
  BEFORE UPDATE ON apr.scheme_amendments
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_operations_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all operations tables
ALTER TABLE apr.ownership_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.scheme_amendments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ownership_transfers
CREATE POLICY "Users can view own transfers"
  ON apr.ownership_transfers
  FOR SELECT
  TO authenticated
  USING (
    current_holder_id = auth.uid() OR 
    new_holder_id = auth.uid() OR
    created_by = auth.uid()
  );

CREATE POLICY "Deeds officers can manage transfers"
  ON apr.ownership_transfers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() 
      AND role IN ('deeds_officer', 'registrar', 'admin')
    )
  );

-- RLS Policies for mortgages
CREATE POLICY "Users can view own mortgages"
  ON apr.mortgages
  FOR SELECT
  TO authenticated
  USING (
    borrower_id = auth.uid() OR
    created_by = auth.uid()
  );

CREATE POLICY "Deeds officers can manage mortgages"
  ON apr.mortgages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() 
      AND role IN ('deeds_officer', 'registrar', 'admin')
    )
  );

-- RLS Policies for leases
CREATE POLICY "Users can view own leases"
  ON apr.leases
  FOR SELECT
  TO authenticated
  USING (
    lessor_id = auth.uid() OR
    lessee_id = auth.uid() OR
    created_by = auth.uid()
  );

CREATE POLICY "Deeds officers can manage leases"
  ON apr.leases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() 
      AND role IN ('deeds_officer', 'registrar', 'admin')
    )
  );

-- RLS Policies for scheme_amendments
CREATE POLICY "Users can view scheme amendments"
  ON apr.scheme_amendments
  FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can view amendments

CREATE POLICY "Planners and surveyors can create amendments"
  ON apr.scheme_amendments
  FOR INSERT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() 
      AND role IN ('planner', 'surveyor', 'admin')
    )
  );

CREATE POLICY "Deeds officers can manage amendments"
  ON apr.scheme_amendments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() 
      AND role IN ('deeds_officer', 'registrar', 'admin')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE apr.ownership_transfers IS 
  'Records ownership transfers (sale, inheritance, gift) of registered sectional titles';

COMMENT ON TABLE apr.mortgages IS 
  'Records mortgages/charges registered against sectional titles';

COMMENT ON TABLE apr.leases IS 
  'Records long-term leases on sectional units';

COMMENT ON TABLE apr.scheme_amendments IS 
  'Records amendments to registered schemes (extensions, subdivisions, consolidations)';

COMMENT ON COLUMN apr.ownership_transfers.previous_title_version IS 
  'Version of title before transfer (for history tracking)';

COMMENT ON COLUMN apr.ownership_transfers.new_title_version IS 
  'Version of title after transfer (for history tracking)';

COMMENT ON COLUMN apr.scheme_amendments.previous_scheme_version IS 
  'Version of scheme before amendment (for history tracking)';

COMMENT ON COLUMN apr.scheme_amendments.new_scheme_version IS 
  'Version of scheme after amendment (for history tracking)';

