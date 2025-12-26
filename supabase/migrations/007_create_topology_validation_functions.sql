-- Topology Validation Functions
-- Creates PostGIS functions for spatial topology validation
-- Used by lib/spatial/validation.ts

-- ============================================================================
-- ST_OVERLAPS RPC FUNCTION
-- ============================================================================
-- Detects overlapping geometries using PostGIS ST_Overlaps

CREATE OR REPLACE FUNCTION apr.st_overlaps(
  geometry1_wkt TEXT,
  geometry2_wkt TEXT,
  tolerance DOUBLE PRECISION DEFAULT 0.01
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  geom1 GEOMETRY;
  geom2 GEOMETRY;
  has_overlap BOOLEAN;
  overlap_geom GEOMETRY;
  overlap_area DOUBLE PRECISION;
BEGIN
  -- Parse WKT to geometry
  BEGIN
    geom1 := ST_GeomFromText(geometry1_wkt, 32735);
    geom2 := ST_GeomFromText(geometry2_wkt, 32735);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'overlaps', false,
      'error', 'Invalid WKT format: ' || SQLERRM
    );
  END;

  -- Check for overlaps
  has_overlap := ST_Overlaps(geom1, geom2);

  IF has_overlap THEN
    -- Calculate overlap geometry and area
    overlap_geom := ST_Intersection(geom1, geom2);
    overlap_area := ST_Area(overlap_geom);
    
    -- Extract coordinates from overlap geometry
    RETURN jsonb_build_object(
      'overlaps', true,
      'overlap_area', overlap_area,
      'overlap_coordinates', ST_AsGeoJSON(overlap_geom)::jsonb
    );
  ELSE
    RETURN jsonb_build_object(
      'overlaps', false,
      'overlap_area', 0
    );
  END IF;
END;
$$;

-- ============================================================================
-- ST_CONTAINS RPC FUNCTION
-- ============================================================================
-- Validates containment with option to allow touching boundaries

CREATE OR REPLACE FUNCTION apr.st_contains(
  parent_wkt TEXT,
  child_wkt TEXT,
  allow_touching BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_geom GEOMETRY;
  child_geom GEOMETRY;
  contains BOOLEAN;
  touching BOOLEAN;
BEGIN
  -- Parse WKT to geometry
  BEGIN
    parent_geom := ST_GeomFromText(parent_wkt, 32735);
    child_geom := ST_GeomFromText(child_wkt, 32735);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'contains', false,
      'error', 'Invalid WKT format: ' || SQLERRM
    );
  END;

  -- Check containment
  contains := ST_Contains(parent_geom, child_geom);
  
  -- Check if touching boundary
  touching := ST_Touches(parent_geom, child_geom);

  IF contains THEN
    RETURN jsonb_build_object(
      'contains', true,
      'touching', touching
    );
  ELSIF allow_touching AND touching THEN
    RETURN jsonb_build_object(
      'contains', false,
      'touching', true
    );
  ELSE
    RETURN jsonb_build_object(
      'contains', false,
      'touching', false
    );
  END IF;
END;
$$;

-- ============================================================================
-- ST_FIND_GAPS RPC FUNCTION
-- ============================================================================
-- Finds gaps between sections within a parent parcel

CREATE OR REPLACE FUNCTION apr.st_find_gaps(
  sections_wkt TEXT[],
  parent_wkt TEXT,
  min_area DOUBLE PRECISION DEFAULT 1.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_geom GEOMETRY;
  sections_union GEOMETRY;
  gaps GEOMETRY;
  gap_area DOUBLE PRECISION;
  gap_records JSONB[] := '{}';
  i INTEGER;
BEGIN
  -- Parse parent parcel
  BEGIN
    parent_geom := ST_GeomFromText(parent_wkt, 32735);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'gaps', '[]'::jsonb,
      'error', 'Invalid parent WKT format: ' || SQLERRM
    );
  END;

  -- Parse and union all sections
  BEGIN
    sections_union := ST_GeomFromText(sections_wkt[1], 32735);
    FOR i IN 2..array_length(sections_wkt, 1) LOOP
      sections_union := ST_Union(sections_union, ST_GeomFromText(sections_wkt[i], 32735));
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'gaps', '[]'::jsonb,
      'error', 'Invalid sections WKT format: ' || SQLERRM
    );
  END;

  -- Calculate difference (gaps)
  gaps := ST_Difference(parent_geom, sections_union);

  -- If gaps exist and are polygons, extract them
  IF ST_GeometryType(gaps) = 'ST_Polygon' OR ST_GeometryType(gaps) = 'ST_MultiPolygon' THEN
    gap_area := ST_Area(gaps);
    
    IF gap_area >= min_area THEN
      gap_records := ARRAY[jsonb_build_object(
        'geometry', ST_AsText(gaps),
        'area', gap_area,
        'coordinates', ST_AsGeoJSON(gaps)::jsonb
      )];
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'gaps', to_jsonb(gap_records),
    'total_gap_area', COALESCE(gap_area, 0)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.st_overlaps(TEXT, TEXT, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.st_overlaps(TEXT, TEXT, DOUBLE PRECISION) TO anon;

GRANT EXECUTE ON FUNCTION apr.st_contains(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.st_contains(TEXT, TEXT, BOOLEAN) TO anon;

GRANT EXECUTE ON FUNCTION apr.st_find_gaps(TEXT[], TEXT, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.st_find_gaps(TEXT[], TEXT, DOUBLE PRECISION) TO anon;

-- Add comments
COMMENT ON FUNCTION apr.st_overlaps(TEXT, TEXT, DOUBLE PRECISION) IS 
  'Detects overlapping geometries using PostGIS ST_Overlaps. Returns JSONB with overlaps boolean, overlap_area, and overlap_coordinates.';

COMMENT ON FUNCTION apr.st_contains(TEXT, TEXT, BOOLEAN) IS 
  'Validates containment of child geometry within parent geometry. Returns JSONB with contains and touching booleans.';

COMMENT ON FUNCTION apr.st_find_gaps(TEXT[], TEXT, DOUBLE PRECISION) IS 
  'Finds gaps between sections within a parent parcel. Returns JSONB array of gap geometries with area and coordinates.';

