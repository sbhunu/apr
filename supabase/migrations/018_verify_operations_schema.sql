-- Verify Operations Schema Migration
-- Validates that all operations tables and constraints are created correctly

-- ============================================================================
-- VERIFY TABLES EXIST
-- ============================================================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'apr'
    AND table_name IN (
      'ownership_transfers',
      'mortgages',
      'leases',
      'scheme_amendments'
    );

  IF table_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 operations tables, found %', table_count;
  END IF;

  RAISE NOTICE '✅ All 4 operations tables exist';
END $$;

-- ============================================================================
-- VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  -- Check foreign keys on ownership_transfers
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'apr'
    AND tc.table_name = 'ownership_transfers'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'title_id';

  IF fk_count = 0 THEN
    RAISE EXCEPTION 'Missing foreign key constraint on ownership_transfers.title_id';
  END IF;

  -- Check foreign keys on mortgages
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'apr'
    AND tc.table_name = 'mortgages'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'title_id';

  IF fk_count = 0 THEN
    RAISE EXCEPTION 'Missing foreign key constraint on mortgages.title_id';
  END IF;

  -- Check foreign keys on leases
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'apr'
    AND tc.table_name = 'leases'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'title_id';

  IF fk_count = 0 THEN
    RAISE EXCEPTION 'Missing foreign key constraint on leases.title_id';
  END IF;

  -- Check foreign keys on scheme_amendments
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'apr'
    AND tc.table_name = 'scheme_amendments'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'scheme_id';

  IF fk_count = 0 THEN
    RAISE EXCEPTION 'Missing foreign key constraint on scheme_amendments.scheme_id';
  END IF;

  RAISE NOTICE '✅ All foreign key constraints exist';
END $$;

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Check indexes on ownership_transfers
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename = 'ownership_transfers';

  IF index_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 indexes on ownership_transfers, found %', index_count;
  END IF;

  -- Check indexes on mortgages
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename = 'mortgages';

  IF index_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 indexes on mortgages, found %', index_count;
  END IF;

  -- Check indexes on leases
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename = 'leases';

  IF index_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 indexes on leases, found %', index_count;
  END IF;

  -- Check indexes on scheme_amendments
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename = 'scheme_amendments';

  IF index_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 indexes on scheme_amendments, found %', index_count;
  END IF;

  RAISE NOTICE '✅ All indexes created';
END $$;

-- ============================================================================
-- VERIFY RLS POLICIES
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Check RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'apr'
    AND tablename IN (
      'ownership_transfers',
      'mortgages',
      'leases',
      'scheme_amendments'
    );

  IF policy_count < 8 THEN
    RAISE EXCEPTION 'Expected at least 8 RLS policies, found %', policy_count;
  END IF;

  RAISE NOTICE '✅ RLS policies configured';
END $$;

-- ============================================================================
-- VERIFY TRIGGERS
-- ============================================================================
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'apr'
    AND c.relname IN (
      'ownership_transfers',
      'mortgages',
      'leases',
      'scheme_amendments'
    )
    AND t.tgname LIKE 'update_%_updated_at';

  IF trigger_count != 4 THEN
    RAISE EXCEPTION 'Expected 4 update triggers, found %', trigger_count;
  END IF;

  RAISE NOTICE '✅ Audit triggers configured';
END $$;

RAISE NOTICE '✅ Operations schema verification complete';

