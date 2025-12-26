-- Create public view for sectional_schemes to enable PostgREST access
CREATE VIEW IF NOT EXISTS public.sectional_schemes AS 
SELECT * FROM apr.sectional_schemes;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sectional_schemes TO authenticated;
GRANT SELECT ON public.sectional_schemes TO anon;
