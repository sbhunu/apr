# Cadastral Layer Implementation Guide

## Overview

The cadastral layer has been added to the Property Map Viewer as an overlay layer in the LayersControl. This implementation is **future-proof** and ready for when cadastral data becomes available in the database.

## Current Implementation

### What's Been Added

1. **API Endpoint**: `/api/property/cadastral/route.ts`
   - Accepts bounding box (bbox) parameter
   - Currently returns empty FeatureCollection
   - Includes TODO comments for database implementation

2. **CadastralLayer Component**: `components/maps/CadastralLayer.tsx`
   - Fetches cadastral parcels based on map bounds
   - Automatically refreshes when map moves or zooms
   - Handles loading states and errors gracefully
   - Styles parcels with blue dashed lines to distinguish from other layers

3. **Integration**: Updated `components/maps/PropertyMapViewer.tsx`
   - Added "Cadastral Parcels" overlay to LayersControl
   - Users can toggle the layer on/off via the standard Leaflet layer control
   - Shows status card when layer is active

## How It Works Now

- **Layer Toggle**: Users can enable/disable the cadastral layer via the LayersControl panel (top-right of map)
- **No Data State**: When enabled, the layer shows "No cadastral data available in this area" message
- **Future Ready**: When data is added to the database, it will automatically start displaying

## Implementation Steps for Database Integration

### Step 1: Create Cadastral Parcels Table

```sql
-- Create cadastral parcels table in apr schema
CREATE TABLE apr.cadastral_parcels (
  parcel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_number TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  area_m2 NUMERIC(10, 2),
  land_type TEXT, -- e.g., 'communal', 'freehold', 'leasehold'
  registration_date TIMESTAMP,
  geometry GEOMETRY(Polygon, 32735) NOT NULL, -- UTM Zone 35S for Zimbabwe
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create spatial index for performance
CREATE INDEX idx_cadastral_parcels_geometry ON apr.cadastral_parcels 
  USING GIST (geometry);

-- Create public view for PostgREST access
CREATE VIEW public.cadastral_parcels AS
SELECT 
  parcel_id,
  parcel_number,
  owner_name,
  area_m2,
  land_type,
  registration_date,
  ST_AsGeoJSON(geometry)::jsonb AS geometry,
  created_at,
  updated_at
FROM apr.cadastral_parcels;

-- Grant permissions
GRANT SELECT ON public.cadastral_parcels TO authenticated;
GRANT SELECT ON public.cadastral_parcels TO anon;
```

### Step 2: Create PostGIS Function for Bounding Box Queries

```sql
-- Create function to get cadastral parcels within bounding box
CREATE OR REPLACE FUNCTION public.get_cadastral_parcels_in_bbox(
  sw_lat DOUBLE PRECISION,
  sw_lng DOUBLE PRECISION,
  ne_lat DOUBLE PRECISION,
  ne_lng DOUBLE PRECISION
)
RETURNS TABLE (
  parcel_id UUID,
  parcel_number TEXT,
  owner_name TEXT,
  area_m2 NUMERIC,
  land_type TEXT,
  registration_date TIMESTAMP,
  geometry JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.parcel_id,
    cp.parcel_number,
    cp.owner_name,
    cp.area_m2,
    cp.land_type,
    cp.registration_date,
    ST_AsGeoJSON(cp.geometry)::jsonb AS geometry
  FROM apr.cadastral_parcels cp
  WHERE ST_Intersects(
    cp.geometry,
    ST_MakeEnvelope(
      sw_lng, sw_lat,  -- Southwest corner
      ne_lng, ne_lat,  -- Northeast corner
      4326  -- WGS84 (Leaflet uses lat/lng)
    )::geometry
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_cadastral_parcels_in_bbox TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cadastral_parcels_in_bbox TO anon;
```

### Step 3: Update API Route

Uncomment and update the TODO section in `app/api/property/cadastral/route.ts`:

```typescript
// Replace the empty return with:
const { data: parcels, error } = await supabase.rpc('get_cadastral_parcels_in_bbox', {
  sw_lat: swLat,
  sw_lng: swLng,
  ne_lat: neLat,
  ne_lng: neLng,
})

if (error) {
  console.error('Error fetching cadastral parcels:', error)
  return NextResponse.json(
    { error: 'Failed to fetch cadastral parcels', parcels: [] },
    { status: 500 }
  )
}

// Transform to GeoJSON FeatureCollection format
const features = parcels.map((parcel) => ({
  type: 'Feature',
  properties: {
    id: parcel.parcel_id,
    parcel_number: parcel.parcel_number,
    owner: parcel.owner_name,
    area: parcel.area_m2,
    land_type: parcel.land_type,
    registration_date: parcel.registration_date,
  },
  geometry: parcel.geometry, // Already in GeoJSON format from PostGIS
}))

return NextResponse.json({
  type: 'FeatureCollection',
  features,
})
```

### Step 4: Coordinate System Conversion (if needed)

If your cadastral data is stored in UTM Zone 35S (SRID 32735) but Leaflet needs WGS84 (SRID 4326), you'll need to transform:

```sql
-- In the PostGIS function, transform geometry:
ST_Transform(
  ST_SetSRID(cp.geometry, 32735),
  4326
) AS geometry
```

## Best Practices

1. **Spatial Indexing**: Always use GIST indexes on geometry columns for performance
2. **Bounding Box Queries**: Use `ST_Intersects` with bounding boxes to limit queries to visible map area
3. **Coordinate Systems**: Ensure consistent SRID usage (32735 for Zimbabwe UTM, 4326 for Leaflet)
4. **Performance**: Limit results per query (e.g., max 1000 parcels) to prevent slow rendering
5. **Caching**: Consider caching cadastral data for frequently viewed areas

## Testing

1. **Without Data**: Verify layer toggle works and shows "no data" message
2. **With Sample Data**: Add a few test parcels and verify they display correctly
3. **Performance**: Test with large datasets (1000+ parcels) to ensure acceptable performance
4. **Edge Cases**: Test at different zoom levels, map bounds, and coordinate systems

## Future Enhancements

- **Clustering**: For areas with many parcels, implement marker clustering
- **Filtering**: Add filters by land type, owner, or registration date
- **Popup Details**: Enhance popup with more parcel information
- **Highlighting**: Highlight parcels on search or selection
- **Export**: Allow users to export visible cadastral data

## Notes

- The cadastral layer uses **blue dashed lines** to distinguish it from other parcel layers
- The layer automatically refreshes when users pan or zoom the map
- Currently defaults to **unchecked** in LayersControl since no data is available yet
- When data is added, users can check the "Cadastral Parcels" checkbox to enable it

