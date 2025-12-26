-- Create helper function to check if schema exists
-- This helps verify the apr schema was created correctly

CREATE OR REPLACE FUNCTION check_schema_exists(schema_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schema_to_check TEXT := check_schema_exists.schema_name;
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE information_schema.schemata.schema_name = schema_to_check
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_schema_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_schema_exists(TEXT) TO anon;

-- Verify apr schema exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'apr'
  ) THEN
    RAISE EXCEPTION 'apr schema does not exist. Run migration 001 first.';
  END IF;
  
  RAISE NOTICE 'apr schema verified successfully';
END $$;

