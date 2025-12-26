-- Verification Migration for Deeds Schema
-- Verifies that all deeds tables, indexes, and policies were created correctly

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
    AND table_name IN (
      'sectional_schemes',
      'sections',
      'sectional_titles',
      'body_corporates'
    );

  IF table_count = 4 THEN
    RAISE NOTICE '✓ All deeds tables created successfully';
  ELSE
    RAISE WARNING '⚠ Only % of 4 deeds tables found', table_count;
  END IF;

  -- Verify indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename IN (
      'sectional_schemes',
      'sections',
      'sectional_titles',
      'body_corporates'
    )
    AND indexname LIKE 'idx_%';

  RAISE NOTICE '✓ Created % indexes for deeds tables', index_count;

  -- Verify RLS policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'apr'
    AND tablename IN (
      'sectional_schemes',
      'sections',
      'sectional_titles',
      'body_corporates'
    );

  RAISE NOTICE '✓ Created % RLS policies for deeds tables', policy_count;

  -- Verify triggers exist
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'apr'
    AND c.relname IN (
      'sectional_schemes',
      'sections',
      'sectional_titles',
      'body_corporates'
    )
    AND (t.tgname LIKE '%deeds%' OR t.tgname LIKE '%scheme%' OR t.tgname LIKE '%quota%');

  RAISE NOTICE '✓ Created % triggers for deeds tables', trigger_count;

  -- Verify unique constraints
  SELECT COUNT(*) INTO table_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'apr'
    AND table_name IN ('sectional_schemes', 'sectional_titles', 'body_corporates')
    AND constraint_type = 'UNIQUE';

  IF table_count >= 3 THEN
    RAISE NOTICE '✓ Unique constraints created for scheme/title numbers';
  ELSE
    RAISE WARNING '⚠ Unique constraints may be missing';
  END IF;

  -- Verify foreign keys
  SELECT COUNT(*) INTO table_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'apr'
    AND table_name = 'sectional_schemes'
    AND constraint_type = 'FOREIGN KEY'
    AND (constraint_name LIKE '%survey%' OR constraint_name LIKE '%planning%');

  IF table_count >= 2 THEN
    RAISE NOTICE '✓ Foreign keys to survey and planning modules created';
  ELSE
    RAISE WARNING '⚠ Foreign keys may be missing';
  END IF;

  RAISE NOTICE '✓ Deeds schema verification complete';
END $$;

