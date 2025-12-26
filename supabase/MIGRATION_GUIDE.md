# Migration Guide - APR Schema Usage

## ⚠️ CRITICAL: All Tables Must Use `apr` Schema

All database tables for the APR system **MUST** be created under the `apr` schema prefix.

## Migration File Template

When creating new migrations, always use this template:

```sql
-- Migration: [Description]
-- All tables created in this migration use the apr schema prefix

-- Example: Creating a table in apr schema
CREATE TABLE apr.table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- other columns...
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON apr.table_name TO authenticated;
GRANT SELECT ON apr.table_name TO anon;

-- Create indexes (if needed)
CREATE INDEX idx_table_name_column ON apr.table_name(column_name);

-- Add RLS policies (if needed)
ALTER TABLE apr.table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON apr.table_name
  FOR SELECT
  TO authenticated
  USING (/* your condition */);
```

## Schema Prefix Rules

### ✅ CORRECT Examples

```sql
-- Table creation
CREATE TABLE apr.sectional_scheme_plans (...);
CREATE TABLE apr.survey_sectional_plans (...);
CREATE TABLE apr.sectional_titles (...);

-- Records schema for audit
CREATE TABLE records.record_registry (...);
```

### ❌ WRONG Examples

```sql
-- DON'T create tables without schema prefix
CREATE TABLE sectional_scheme_plans (...); -- Creates in public schema!

-- DON'T use public schema
CREATE TABLE public.sectional_scheme_plans (...); -- Wrong schema!
```

## Verification Checklist

Before committing a migration, verify:

- [ ] All `CREATE TABLE` statements use `apr.` prefix
- [ ] All `ALTER TABLE` statements use `apr.` prefix  
- [ ] All `CREATE INDEX` statements reference `apr.table_name`
- [ ] All `GRANT` statements reference `apr.table_name`
- [ ] All RLS policies reference `apr.table_name`
- [ ] No tables created in `public` schema
- [ ] Test table creation in migration to verify schema

## Testing Migrations

After running a migration, verify the schema:

```sql
-- Check which schema tables were created in
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'apr'
ORDER BY table_name;

-- Should list all your APR tables
```

## Current Migration Files

1. `001_enable_postgis_and_create_apr_schema.sql` - Foundation setup
2. `002_create_schema_check_function.sql` - Helper functions
3. `003_verify_apr_schema_setup.sql` - Verification and test

All future migrations must follow the `apr` schema prefix rule.

