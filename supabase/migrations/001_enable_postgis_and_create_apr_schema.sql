-- Enable PostGIS extension for spatial data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create apr schema for Automated Property Registration system
-- All APR tables will be prefixed with apr schema
CREATE SCHEMA IF NOT EXISTS apr;

-- Create records schema for audit trail and record registry
CREATE SCHEMA IF NOT EXISTS records;

-- Set search path to include apr schema (for convenience)
-- Note: Explicit schema prefix (apr.table_name) is still required for clarity
ALTER DATABASE postgres SET search_path TO public, apr, records;

-- Grant usage and create permissions on schemas
GRANT USAGE ON SCHEMA apr TO authenticated;
GRANT USAGE ON SCHEMA apr TO anon;
GRANT CREATE ON SCHEMA apr TO authenticated; -- Allow creating tables in apr schema
GRANT USAGE ON SCHEMA records TO authenticated;
GRANT USAGE ON SCHEMA records TO anon;
GRANT CREATE ON SCHEMA records TO authenticated; -- Allow creating tables in records schema

-- Set default schema for authenticated users (optional, but helps ensure apr schema usage)
ALTER ROLE authenticated SET search_path TO apr, records, public;

-- Verify PostGIS installation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    RAISE EXCEPTION 'PostGIS extension failed to install';
  END IF;
END $$;

-- Log successful setup
DO $$
BEGIN
  RAISE NOTICE 'PostGIS extension enabled successfully';
  RAISE NOTICE 'APR schema created: apr';
  RAISE NOTICE 'Records schema created: records';
END $$;

