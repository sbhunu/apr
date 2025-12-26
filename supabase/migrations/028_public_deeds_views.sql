-- Create public views for deeds tables to enable PostgREST access

-- Sections view
CREATE VIEW IF NOT EXISTS public.sections AS 
SELECT * FROM apr.sections;

-- Sectional titles view
CREATE VIEW IF NOT EXISTS public.sectional_titles AS 
SELECT * FROM apr.sectional_titles;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.sections TO authenticated;
GRANT SELECT ON public.sections TO anon;

GRANT SELECT, INSERT, UPDATE ON public.sectional_titles TO authenticated;
GRANT SELECT ON public.sectional_titles TO anon;
