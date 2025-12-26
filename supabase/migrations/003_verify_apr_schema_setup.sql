-- Verification migration to ensure apr schema is properly configured
-- This migration verifies that all setup is correct

DO $$
BEGIN
  -- Verify apr schema exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'apr'
  ) THEN
    RAISE EXCEPTION 'apr schema does not exist. Run migration 001 first.';
  END IF;

  -- Verify records schema exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'records'
  ) THEN
    RAISE EXCEPTION 'records schema does not exist. Run migration 001 first.';
  END IF;

  -- Verify PostGIS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    RAISE EXCEPTION 'PostGIS extension is not enabled. Run migration 001 first.';
  END IF;

  -- Log success
  RAISE NOTICE '✓ apr schema verified';
  RAISE NOTICE '✓ records schema verified';
  RAISE NOTICE '✓ PostGIS extension verified';
  RAISE NOTICE '✓ All APR tables will be created under the apr schema';
END $$;

-- Create a test table in apr schema to verify it works
CREATE TABLE IF NOT EXISTS apr._schema_test (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  test_message TEXT DEFAULT 'apr schema is working correctly'
);

-- Grant permissions on test table
GRANT SELECT, INSERT, UPDATE, DELETE ON apr._schema_test TO authenticated;
GRANT SELECT ON apr._schema_test TO anon;

-- Insert a test record
INSERT INTO apr._schema_test (test_message) 
VALUES ('APR schema setup verified successfully')
ON CONFLICT DO NOTHING;

-- Verify the table was created in the correct schema
DO $$
DECLARE
  table_schema_name TEXT;
BEGIN
  SELECT table_schema INTO table_schema_name
  FROM information_schema.tables
  WHERE table_name = '_schema_test';
  
  IF table_schema_name != 'apr' THEN
    RAISE EXCEPTION 'Test table created in wrong schema: %. Expected: apr', table_schema_name;
  END IF;
  
  RAISE NOTICE '✓ Test table created in apr schema correctly';
END $$;

