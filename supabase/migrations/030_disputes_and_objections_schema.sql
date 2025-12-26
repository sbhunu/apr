-- Disputes and Objections Database Schema Migration
-- Creates tables for dispute resolution and objection workflows

-- ============================================================================
-- OBJECTIONS TABLE
-- ============================================================================
-- Records objections submitted during the objection window after plan submission
CREATE TABLE IF NOT EXISTS apr.objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to planning plan
  planning_plan_id UUID NOT NULL REFERENCES apr.sectional_scheme_plans(id) ON DELETE RESTRICT,
  
  -- Objector information
  objector_name TEXT NOT NULL,
  objector_id_number TEXT,
  objector_contact_email TEXT,
  objector_contact_phone TEXT,
  objector_address TEXT,
  
  -- Objection details
  objection_type TEXT NOT NULL CHECK (
    objection_type IN ('boundary', 'rights', 'environmental', 'access', 'other')
  ),
  description TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]'::jsonb, -- Array of document IDs
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'under_review',
      'scheduled',
      'resolved',
      'dismissed',
      'withdrawn'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'submitted',
  
  -- Review information
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  
  -- Hearing information
  hearing_date TIMESTAMP WITH TIME ZONE,
  hearing_location TEXT,
  hearing_officer UUID REFERENCES auth.users(id),
  hearing_notes TEXT,
  
  -- Resolution information
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolution_document_id UUID, -- Reference to storage.objects
  
  -- Withdrawal information
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  withdrawal_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_objections_planning_plan_id 
  ON apr.objections(planning_plan_id);
CREATE INDEX IF NOT EXISTS idx_objections_status 
  ON apr.objections(status);
CREATE INDEX IF NOT EXISTS idx_objections_objection_type 
  ON apr.objections(objection_type);
CREATE INDEX IF NOT EXISTS idx_objections_hearing_date 
  ON apr.objections(hearing_date);
CREATE INDEX IF NOT EXISTS idx_objections_created_at 
  ON apr.objections(created_at DESC);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================
-- Records disputes involving registered titles, schemes, or amendments
CREATE TABLE IF NOT EXISTS apr.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dispute type and references
  dispute_type TEXT NOT NULL CHECK (
    dispute_type IN ('boundary', 'ownership', 'rights', 'amendment', 'lease', 'mortgage', 'other')
  ),
  title_id UUID REFERENCES apr.sectional_titles(id) ON DELETE RESTRICT,
  scheme_id UUID REFERENCES apr.sectional_schemes(id) ON DELETE RESTRICT,
  amendment_id UUID REFERENCES apr.scheme_amendments(id) ON DELETE RESTRICT,
  
  -- Complainant information
  complainant_name TEXT NOT NULL,
  complainant_id_number TEXT,
  complainant_contact_email TEXT,
  complainant_contact_phone TEXT,
  complainant_address TEXT,
  
  -- Respondent information
  respondent_name TEXT,
  respondent_id_number TEXT,
  respondent_contact_email TEXT,
  respondent_contact_phone TEXT,
  
  -- Dispute details
  description TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]'::jsonb, -- Array of document IDs
  requested_resolution TEXT,
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN (
      'submitted',
      'assigned',
      'under_review',
      'hearing_scheduled',
      'resolved',
      'dismissed',
      'withdrawn'
    )
  ),
  workflow_state TEXT NOT NULL DEFAULT 'submitted',
  
  -- Assignment information
  assigned_to UUID REFERENCES auth.users(id),
  assigned_authority TEXT CHECK (
    assigned_authority IN (
      'scheme_body',
      'district_admin',
      'provincial_admin',
      'land_commission',
      'ministry',
      'courts'
    )
  ),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Hearing information
  hearing_date TIMESTAMP WITH TIME ZONE,
  hearing_location TEXT,
  hearing_officer UUID REFERENCES auth.users(id),
  hearing_notes TEXT,
  
  -- Resolution information
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution TEXT,
  resolution_document_id UUID, -- Reference to storage.objects
  resolution_type TEXT CHECK (
    resolution_type IN ('upheld', 'dismissed', 'compromise', 'referred')
  ),
  
  -- Withdrawal information
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  withdrawal_reason TEXT,
  
  -- Digital signatures
  complainant_signature_id UUID,
  respondent_signature_id UUID,
  resolution_signature_id UUID,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disputes_title_id 
  ON apr.disputes(title_id);
CREATE INDEX IF NOT EXISTS idx_disputes_scheme_id 
  ON apr.disputes(scheme_id);
CREATE INDEX IF NOT EXISTS idx_disputes_amendment_id 
  ON apr.disputes(amendment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status 
  ON apr.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_dispute_type 
  ON apr.disputes(dispute_type);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_to 
  ON apr.disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_authority 
  ON apr.disputes(assigned_authority);
CREATE INDEX IF NOT EXISTS idx_disputes_hearing_date 
  ON apr.disputes(hearing_date);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at 
  ON apr.disputes(created_at DESC);

-- Create public views for PostgREST access
DROP VIEW IF EXISTS public.objections CASCADE;
DROP VIEW IF EXISTS public.disputes CASCADE;

CREATE VIEW public.objections AS
SELECT * FROM apr.objections;

CREATE VIEW public.disputes AS
SELECT * FROM apr.disputes;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.objections TO authenticated;
GRANT SELECT ON public.objections TO anon;

GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT SELECT ON public.disputes TO anon;

