-- Verification Migration for Planning Schema
-- Verifies that all planning tables, indexes, and policies were created correctly

DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  policy_count INTEGER;
  trigger_count INTEGER;
BEGIN
  -- Verify tables exist
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'apr'
    AND table_name IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews');

  IF table_count = 3 THEN
    RAISE NOTICE '✓ All planning tables created successfully';
  ELSE
    RAISE WARNING '⚠ Only % of 3 planning tables found', table_count;
  END IF;

  -- Verify indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews')
    AND indexname LIKE 'idx_%';

  RAISE NOTICE '✓ Created % indexes for planning tables', index_count;

  -- Verify RLS policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'apr'
    AND tablename IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews');

  RAISE NOTICE '✓ Created % RLS policies for planning tables', policy_count;

  -- Verify triggers exist
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'apr'
    AND c.relname IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews')
    AND t.tgname LIKE '%plan%';

  RAISE NOTICE '✓ Created % triggers for planning tables', trigger_count;

  -- Verify spatial indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename = 'sectional_scheme_plans'
    AND indexname LIKE '%geometry%';

  IF index_count >= 2 THEN
    RAISE NOTICE '✓ Spatial indexes created for geometry columns';
  ELSE
    RAISE WARNING '⚠ Spatial indexes may be missing';
  END IF;

  RAISE NOTICE '✓ Planning schema verification complete';
END $$;

