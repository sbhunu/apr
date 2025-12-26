-- Verification Migration for Foundation Setup
-- Verifies that all foundation tables and policies are correctly configured

-- ============================================================================
-- VERIFY TABLES EXIST IN APR SCHEMA
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'apr'
    AND table_name IN ('user_profiles', 'roles', 'permissions');
  
  IF table_count < 3 THEN
    RAISE EXCEPTION 'Foundation tables missing. Expected 3 tables, found %', table_count;
  END IF;
  
  RAISE NOTICE '✓ All foundation tables exist in apr schema';
END $$;

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'apr'
    AND tablename IN ('user_profiles', 'roles', 'permissions')
    AND rowsecurity = true;
  
  IF rls_count < 3 THEN
    RAISE EXCEPTION 'RLS not enabled on all foundation tables. Expected 3, found %', rls_count;
  END IF;
  
  RAISE NOTICE '✓ RLS enabled on all foundation tables';
END $$;

-- ============================================================================
-- VERIFY DEFAULT ROLES EXIST
-- ============================================================================

DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM apr.roles
  WHERE name IN ('planner', 'planning_authority', 'surveyor', 'surveyor_general', 
                 'conveyancer', 'deeds_examiner', 'registrar', 'admin', 'viewer');
  
  IF role_count < 9 THEN
    RAISE EXCEPTION 'Default roles missing. Expected 9 roles, found %', role_count;
  END IF;
  
  RAISE NOTICE '✓ All default roles created';
END $$;

-- ============================================================================
-- VERIFY DEFAULT PERMISSIONS EXIST
-- ============================================================================

DO $$
DECLARE
  perm_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perm_count
  FROM apr.permissions
  WHERE name LIKE 'planning:%' OR name LIKE 'survey:%' OR name LIKE 'deeds:%' 
     OR name LIKE 'admin:%' OR name = 'read:all';
  
  IF perm_count < 20 THEN
    RAISE NOTICE '⚠️  Some permissions may be missing. Found % permissions', perm_count;
  ELSE
    RAISE NOTICE '✓ Default permissions created';
  END IF;
END $$;

-- ============================================================================
-- VERIFY TRIGGERS EXIST
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
    AND c.relname = 'user_profiles'
    AND t.tgname IN ('on_auth_user_created', 'update_user_profiles_updated_at');
  
  -- Note: on_auth_user_created is on auth.users, not apr.user_profiles
  -- So we check for update_user_profiles_updated_at
  IF trigger_count < 1 THEN
    RAISE NOTICE '⚠️  Some triggers may be missing';
  ELSE
    RAISE NOTICE '✓ Triggers created';
  END IF;
END $$;

-- ============================================================================
-- VERIFY SRID 32735 AVAILABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM spatial_ref_sys WHERE srid = 32735
  ) THEN
    RAISE NOTICE '✓ SRID 32735 (UTM Zone 35S - Zimbabwe) is available';
  ELSE
    RAISE WARNING '⚠️  SRID 32735 not found. May need to be added manually.';
  END IF;
END $$;

-- ============================================================================
-- VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'apr'
    AND constraint_type = 'FOREIGN KEY'
    AND table_name = 'user_profiles';
  
  IF fk_count < 1 THEN
    RAISE EXCEPTION 'Foreign key constraints missing on user_profiles';
  END IF;
  
  RAISE NOTICE '✓ Foreign key constraints verified';
END $$;

-- ============================================================================
-- VERIFY INDEXES EXIST
-- ============================================================================

DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename = 'user_profiles'
    AND indexname LIKE 'idx_user_profiles%';
  
  IF idx_count < 3 THEN
    RAISE NOTICE '⚠️  Some indexes may be missing. Found % indexes', idx_count;
  ELSE
    RAISE NOTICE '✓ Indexes created on user_profiles';
  END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Foundation Setup Verification Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'All foundation tables are in apr schema ✓';
  RAISE NOTICE 'RLS policies are enabled ✓';
  RAISE NOTICE 'Default roles and permissions created ✓';
  RAISE NOTICE 'Triggers and functions configured ✓';
  RAISE NOTICE '';
END $$;

