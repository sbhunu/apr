-- Create public view for section_geometries so PostgREST can access it without schema prefix
CREATE OR REPLACE VIEW public.section_geometries AS
  SELECT * FROM apr.section_geometries;
GRANT SELECT ON public.section_geometries TO authenticated, anon;
