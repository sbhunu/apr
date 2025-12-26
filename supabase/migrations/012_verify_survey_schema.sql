-- Verification Migration for Survey Schema
-- Verifies that all survey tables, indexes, and policies were created correctly

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
      'survey_sectional_plans',
      'parent_parcels',
      'section_geometries',
      'survey_computations'
    );

  IF table_count = 4 THEN
    RAISE NOTICE '✓ All survey tables created successfully';
  ELSE
    RAISE WARNING '⚠ Only % of 4 survey tables found', table_count;
  END IF;

  -- Verify indexes exist
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename IN (
      'survey_sectional_plans',
      'parent_parcels',
      'section_geometries',
      'survey_computations'
    )
    AND indexname LIKE 'idx_%';

  RAISE NOTICE '✓ Created % indexes for survey tables', index_count;

  -- Verify RLS policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'apr'
    AND tablename IN (
      'survey_sectional_plans',
      'parent_parcels',
      'section_geometries',
      'survey_computations'
    );

  RAISE NOTICE '✓ Created % RLS policies for survey tables', policy_count;

  -- Verify triggers exist
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'apr'
    AND c.relname IN (
      'survey_sectional_plans',
      'parent_parcels',
      'section_geometries',
      'survey_computations'
    )
    AND t.tgname LIKE '%survey%' OR t.tgname LIKE '%parcel%' OR t.tgname LIKE '%section%';

  RAISE NOTICE '✓ Created % triggers for survey tables', trigger_count;

  -- Verify spatial indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'apr'
    AND tablename IN ('survey_sectional_plans', 'parent_parcels', 'section_geometries')
    AND indexname LIKE '%geometry%' OR indexname LIKE '%centroid%';

  IF index_count >= 5 THEN
    RAISE NOTICE '✓ Spatial indexes created for geometry columns';
  ELSE
    RAISE WARNING '⚠ Spatial indexes may be missing (found %)', index_count;
  END IF;

  -- Verify foreign key to planning plans
  SELECT COUNT(*) INTO table_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'apr'
    AND table_name = 'survey_sectional_plans'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%planning_plan%';

  IF table_count > 0 THEN
    RAISE NOTICE '✓ Foreign key to planning plans created';
  ELSE
    RAISE WARNING '⚠ Foreign key to planning plans may be missing';
  END IF;

  RAISE NOTICE '✓ Survey schema verification complete';
END $$;

