-- Create public view for jobs table to enable PostgREST access

-- Drop view if it exists (to allow re-running migration)
DROP VIEW IF EXISTS public.jobs CASCADE;

-- Jobs view
CREATE VIEW public.jobs AS
SELECT * FROM apr.jobs;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;

