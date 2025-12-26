# 🚀 Run Migrations Now - Quick Guide

## ✅ Credentials Extracted!

Your Supabase credentials have been extracted from Docker and saved to `.env.local`.

## 📋 Step 1: View Migration SQL

To see all migration SQL files ready to copy/paste:

```bash
npm run migrate:show
```

Or view individual files:
```bash
cat supabase/migrations/001_enable_postgis_and_create_apr_schema.sql
cat supabase/migrations/002_create_schema_check_function.sql
cat supabase/migrations/003_verify_apr_schema_setup.sql
```

## 📋 Step 2: Execute Migrations

### Option A: Supabase Studio (Recommended)

1. **Open Supabase Studio:**
   ```bash
   # Check Studio URL
   docker port supabase-studio
   # Usually: http://localhost:3000 or http://localhost:54323
   ```

2. **Go to SQL Editor** (left sidebar)

3. **Run migrations in order:**
   - Copy/paste Migration 1 → Click **Run**
   - Copy/paste Migration 2 → Click **Run**  
   - Copy/paste Migration 3 → Click **Run**

### Option B: Direct PostgreSQL Connection

If you have `psql` installed:

```bash
# Get database connection details
docker exec supabase-db env | grep POSTGRES

# Connect and run migrations
docker exec -i supabase-db psql -U postgres < supabase/migrations/001_enable_postgis_and_create_apr_schema.sql
docker exec -i supabase-db psql -U postgres < supabase/migrations/002_create_schema_check_function.sql
docker exec -i supabase-db psql -U postgres < supabase/migrations/003_verify_apr_schema_setup.sql
```

## ✅ Step 3: Verify Setup

Run in SQL Editor:

```sql
-- Check schemas
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('apr', 'records');

-- Check PostGIS
SELECT PostGIS_Version();

-- Check test table
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = '_schema_test';
```

## 🧪 Step 4: Test Connection

After migrations complete:

```bash
npm run test:connection
```

## 📝 Quick Commands Reference

```bash
# Extract credentials from Docker
npm run credentials

# View all migration SQL
npm run migrate:show

# View specific migration
cat supabase/migrations/001_enable_postgis_and_create_apr_schema.sql

# Test connection
npm run test:connection
```

## 🎯 Expected Results

After running migrations:
- ✅ `apr` schema created
- ✅ `records` schema created
- ✅ PostGIS extension enabled
- ✅ Test table in `apr` schema
- ✅ Connection test passes

