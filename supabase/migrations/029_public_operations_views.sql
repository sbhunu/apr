-- Create public views for operations tables to enable PostgREST access

-- Drop views if they exist (to allow re-running migration)
DROP VIEW IF EXISTS public.mortgages CASCADE;
DROP VIEW IF EXISTS public.ownership_transfers CASCADE;
DROP VIEW IF EXISTS public.leases CASCADE;
DROP VIEW IF EXISTS public.scheme_amendments CASCADE;

-- Mortgages view
CREATE VIEW public.mortgages AS
SELECT * FROM apr.mortgages;

-- Ownership transfers view
CREATE VIEW public.ownership_transfers AS
SELECT * FROM apr.ownership_transfers;

-- Leases view
CREATE VIEW public.leases AS
SELECT * FROM apr.leases;

-- Scheme amendments view
CREATE VIEW public.scheme_amendments AS
SELECT * FROM apr.scheme_amendments;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.mortgages TO authenticated;
GRANT SELECT ON public.mortgages TO anon;

GRANT SELECT, INSERT, UPDATE ON public.ownership_transfers TO authenticated;
GRANT SELECT ON public.ownership_transfers TO anon;

GRANT SELECT, INSERT, UPDATE ON public.leases TO authenticated;
GRANT SELECT ON public.leases TO anon;

GRANT SELECT, INSERT, UPDATE ON public.scheme_amendments TO authenticated;
GRANT SELECT ON public.scheme_amendments TO anon;

