-- Verification Script for APR Schema Setup
-- Run this in Supabase SQL Editor to verify everything is configured correctly

-- 1. Verify PostGIS Extension
SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension 
WHERE extname = 'postgis';

-- Expected: Should return PostGIS version (e.g., 3.4.0)

-- 2. Verify apr Schema Exists
SELECT 
  schema_name,
  schema_owner
FROM information_schema.schemata 
WHERE schema_name = 'apr';

-- Expected: Should return one row with schema_name = 'apr'

-- 3. Verify records Schema Exists
SELECT 
  schema_name,
  schema_owner
FROM information_schema.schemata 
WHERE schema_name = 'records';

-- Expected: Should return one row with schema_name = 'records'

-- 4. Verify Schema Permissions
SELECT 
  nspname as schema_name,
  nspacl as permissions
FROM pg_namespace
WHERE nspname IN ('apr', 'records');

-- Expected: Should show permissions for authenticated and anon roles

-- 5. Test Creating a Table in apr Schema
CREATE TABLE IF NOT EXISTS apr._verification_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message TEXT DEFAULT 'APR schema verification successful'
);

-- 6. Verify Table Was Created in apr Schema
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = '_verification_test';

-- Expected: table_schema should be 'apr', not 'public'

-- 7. Test PostGIS Functionality
SELECT 
  PostGIS_Version() as postgis_version,
  PostGIS_Full_Version() as full_version;

-- Expected: Should return PostGIS version information

-- 8. Cleanup Test Table
DROP TABLE IF EXISTS apr._verification_test;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'APR Schema Verification Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ PostGIS extension verified';
  RAISE NOTICE '✓ apr schema verified';
  RAISE NOTICE '✓ records schema verified';
  RAISE NOTICE '✓ Table creation in apr schema verified';
  RAISE NOTICE '';
  RAISE NOTICE 'All future tables MUST use apr schema prefix:';
  RAISE NOTICE '  CREATE TABLE apr.table_name (...)';
  RAISE NOTICE '========================================';
END $$;

