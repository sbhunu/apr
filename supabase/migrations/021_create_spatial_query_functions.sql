-- Spatial Query Functions Migration
-- Creates PostGIS RPC functions for spatial queries used by GIS visualization

-- ============================================================================
-- FUNCTION: Get Cadastral Parcels
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.get_cadastral_parcels(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  geometry JSONB,
  area DOUBLE PRECISION,
  properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    ST_AsGeoJSON(p.boundary_geometry)::jsonb AS geometry,
    ST_Area(p.boundary_geometry) AS area,
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'type', 'Feature'
    ) AS properties
  FROM apr.parent_parcels p
  WHERE p.boundary_geometry IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION apr.get_cadastral_parcels IS 
  'Returns cadastral parcels as GeoJSON features for map visualization';

-- ============================================================================
-- FUNCTION: Get Cadastral Parcels by Bounding Box
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.get_cadastral_parcels_bbox(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  geometry JSONB,
  area DOUBLE PRECISION,
  properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bbox GEOMETRY;
BEGIN
  -- Create bounding box geometry (transform from WGS84 to UTM)
  -- Note: Input coordinates are in WGS84 (EPSG:4326), stored geometries are in UTM (EPSG:32735)
  v_bbox := ST_Transform(
    ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326),
    32735
  );

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    ST_AsGeoJSON(p.boundary_geometry)::jsonb AS geometry,
    ST_Area(p.boundary_geometry) AS area,
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'type', 'Feature'
    ) AS properties
  FROM apr.parent_parcels p
  WHERE p.boundary_geometry IS NOT NULL
    AND ST_Intersects(p.boundary_geometry, v_bbox)
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION apr.get_cadastral_parcels_bbox IS 
  'Returns cadastral parcels within a bounding box as GeoJSON features';

-- ============================================================================
-- FUNCTION: Get Scheme Geometry
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.get_scheme_geometry(
  p_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'type', 'Feature',
    'geometry', ST_AsGeoJSON(boundary_geometry)::jsonb,
    'properties', jsonb_build_object(
      'id', id,
      'planNumber', plan_number,
      'title', title,
      'area', ST_Area(boundary_geometry)
    )
  )
  INTO v_result
  FROM apr.sectional_scheme_plans
  WHERE id = p_plan_id
    AND boundary_geometry IS NOT NULL;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION apr.get_scheme_geometry IS 
  'Returns scheme geometry as GeoJSON feature';

-- ============================================================================
-- FUNCTION: Get Section Geometries
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.get_section_geometries(
  p_survey_id UUID
)
RETURNS TABLE (
  id UUID,
  section_number TEXT,
  geometry JSONB,
  area DOUBLE PRECISION,
  quota NUMERIC,
  properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sg.id,
    sg.section_number,
    ST_AsGeoJSON(sg.geometry)::jsonb AS geometry,
    sg.area,
    sg.participation_quota AS quota,
    jsonb_build_object(
      'id', sg.id,
      'sectionNumber', sg.section_number,
      'area', sg.area,
      'quota', sg.participation_quota,
      'type', 'Feature'
    ) AS properties
  FROM apr.section_geometries sg
  WHERE sg.survey_plan_id = p_survey_id
    AND sg.geometry IS NOT NULL
  ORDER BY sg.section_number;
END;
$$;

COMMENT ON FUNCTION apr.get_section_geometries IS 
  'Returns section geometries as GeoJSON features for a survey plan';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.get_cadastral_parcels(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_cadastral_parcels(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION apr.get_cadastral_parcels_bbox(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_cadastral_parcels_bbox(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION apr.get_scheme_geometry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_scheme_geometry(UUID) TO anon;
GRANT EXECUTE ON FUNCTION apr.get_section_geometries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_section_geometries(UUID) TO anon;

