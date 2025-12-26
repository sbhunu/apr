-- Spatial Validation Function
-- Creates PostGIS function for geometry validation
-- Used by lib/spatial/geometry.ts validateGeometryWithPostGIS()

-- ============================================================================
-- ST_ISVALID RPC FUNCTION
-- ============================================================================
-- Validates geometry using PostGIS ST_IsValid
-- Returns validation result and reason if invalid

CREATE OR REPLACE FUNCTION apr.st_isvalid(
  geometry_wkt TEXT,
  srid INTEGER DEFAULT 32735
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  geom GEOMETRY;
  is_valid BOOLEAN;
  reason TEXT;
BEGIN
  -- Parse WKT to geometry
  BEGIN
    geom := ST_GeomFromText(geometry_wkt, srid);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'reason', 'Invalid WKT format: ' || SQLERRM
    );
  END;

  -- Validate geometry
  BEGIN
    is_valid := ST_IsValid(geom);
    
    IF NOT is_valid THEN
      reason := ST_IsValidReason(geom);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'reason', 'Validation error: ' || SQLERRM
    );
  END;

  -- Return result
  RETURN jsonb_build_object(
    'is_valid', is_valid,
    'reason', reason
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.st_isvalid(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.st_isvalid(TEXT, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION apr.st_isvalid(TEXT, INTEGER) IS 
  'Validates geometry using PostGIS ST_IsValid. Returns JSONB with is_valid boolean and optional reason string.';

