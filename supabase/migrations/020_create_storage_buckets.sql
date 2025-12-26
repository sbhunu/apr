-- Storage Buckets Migration
-- Creates Supabase Storage buckets and policies for document storage
-- Note: This migration creates buckets if they don't exist and sets up RLS policies

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================
-- Note: Buckets are created via Supabase Storage API or dashboard
-- This migration documents the expected buckets and their policies

-- Expected buckets:
-- 1. planning-documents - For planning module documents
-- 2. survey-documents - For survey module documents
-- 3. deeds-documents - For deeds module documents
-- 4. user-documents - For user-uploaded documents (credentials, etc.)

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
-- These policies are applied via Supabase Storage API
-- They enforce access control based on user roles and ownership

-- Planning Documents Bucket Policies
-- Planners can upload their own documents
-- Planning authority can read all documents
-- Public read access for approved plans (optional)

-- Survey Documents Bucket Policies
-- Surveyors can upload their own documents
-- Surveyor-General can read all documents
-- Public read access for sealed surveys (optional)

-- Deeds Documents Bucket Policies
-- Conveyancers can upload their own documents
-- Deeds examiners and registrars can read all documents
-- Public read access for registered documents (optional)

-- ============================================================================
-- HELPER FUNCTION: Get document folder path
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.get_document_folder(
  p_resource_type TEXT,
  p_resource_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate folder path based on resource type and ID
  -- Format: {resource_type}/{resource_id}
  RETURN LOWER(p_resource_type) || '/' || p_resource_id::TEXT;
END;
$$;

COMMENT ON FUNCTION apr.get_document_folder IS 
  'Generates standardized folder path for document storage';

-- ============================================================================
-- HELPER FUNCTION: Cleanup orphaned documents
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.cleanup_orphaned_documents()
RETURNS TABLE (
  file_path TEXT,
  resource_type TEXT,
  resource_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id UUID;
  v_document_path TEXT;
BEGIN
  -- Find plan documents without corresponding plans
  FOR v_plan_id, v_document_path IN
    SELECT DISTINCT pd.plan_id, pd.file_path
    FROM apr.plan_documents pd
    LEFT JOIN apr.sectional_scheme_plans p ON pd.plan_id = p.id
    WHERE p.id IS NULL
      AND pd.file_path IS NOT NULL
  LOOP
    RETURN QUERY SELECT v_document_path, 'planning'::TEXT, v_plan_id;
  END LOOP;

  -- Add similar queries for other document types as needed
  -- (survey documents, deeds documents, etc.)
END;
$$;

COMMENT ON FUNCTION apr.cleanup_orphaned_documents IS 
  'Identifies orphaned documents that can be safely deleted';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.get_document_folder(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_document_folder(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION apr.cleanup_orphaned_documents() TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Storage helper functions created';
  RAISE NOTICE '⚠️  Note: Storage buckets must be created via Supabase Dashboard or API';
  RAISE NOTICE '⚠️  Storage policies must be configured via Supabase Storage API';
END $$;

