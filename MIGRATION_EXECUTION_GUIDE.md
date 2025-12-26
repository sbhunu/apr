# 🚀 Migration Execution Guide

## Current Status

✅ **Supabase is running** on `http://localhost:8000`  
⚠️ **Connection test shows key issue** - Need correct anon key for local Supabase

## Step 1: Get Correct Supabase Credentials

### For Local Supabase:

1. **Find your local Supabase anon key:**
   ```bash
   # If using Supabase CLI
   supabase status
   
   # Or check Supabase dashboard
   # Local dashboard: http://localhost:54323
   ```

2. **Update `.env.local` file:**
   ```bash
   cp .env .env.local
   # Edit .env.local with correct credentials
   ```

### For Cloud Supabase:

1. Go to your Supabase project dashboard
2. Navigate to: **Settings > API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 2: Execute Migrations

### Option A: Supabase Dashboard SQL Editor (Recommended)

1. **Open Supabase Dashboard:**
   - Local: http://localhost:54323
   - Cloud: https://app.supabase.com → Your Project

2. **Navigate to SQL Editor**

3. **Run migrations in order:**

   **Migration 1:** Copy/paste `supabase/migrations/001_enable_postgis_and_create_apr_schema.sql`
   ```sql
   -- Enable PostGIS extension for spatial data support
   CREATE EXTENSION IF NOT EXISTS postgis;
   
   -- Create apr schema for Automated Property Registration system
   CREATE SCHEMA IF NOT EXISTS apr;
   
   -- Create records schema for audit trail and record registry
   CREATE SCHEMA IF NOT EXISTS records;
   
   -- ... (full SQL in file)
   ```
   Click **Run** ✅

   **Migration 2:** Copy/paste `supabase/migrations/002_create_schema_check_function.sql`
   Click **Run** ✅

   **Migration 3:** Copy/paste `supabase/migrations/003_verify_apr_schema_setup.sql`
   Click **Run** ✅

### Option B: View Migration SQL

Run this command to see all migration SQL:
```bash
npm run migrate
```

### Option C: Supabase CLI (If Installed)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to local project
supabase link --project-ref local

# Or for cloud project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Step 3: Verify Setup

### Verify Schemas Created:

Run in SQL Editor:
```sql
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('apr', 'records');
```

**Expected:** Should return 2 rows (apr and records)

### Verify PostGIS:

Run in SQL Editor:
```sql
SELECT PostGIS_Version();
```

**Expected:** Version string (e.g., "3.4.0")

### Verify Test Table:

Run in SQL Editor:
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = '_schema_test';
```

**Expected:** `table_schema` should be `apr` (not `public`)

## Step 4: Test Connection

After migrations are complete:

```bash
# Test via script
npm run test:connection

# Or test via API (if dev server running)
npm run dev
# Then visit: http://localhost:3000/api/test-supabase
```

## Troubleshooting

### Connection Error: "No suitable key or wrong key type"

**Solution:**
1. Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. For local Supabase, get key from: `supabase status` or dashboard
3. Ensure key matches your Supabase instance

### PostGIS Extension Error

**Solution:**
1. Ensure PostGIS is available in your Supabase instance
2. For local: PostGIS should be included by default
3. For cloud: PostGIS is enabled by default

### Schema Already Exists

**Solution:**
- Migrations use `IF NOT EXISTS` - safe to run multiple times
- If issues, drop and recreate:
  ```sql
  DROP SCHEMA IF EXISTS apr CASCADE;
  DROP SCHEMA IF EXISTS records CASCADE;
  ```
  Then re-run migrations

## Quick Reference

### Migration Files Location:
```
supabase/migrations/
├── 001_enable_postgis_and_create_apr_schema.sql
├── 002_create_schema_check_function.sql
└── 003_verify_apr_schema_setup.sql
```

### Verification Script:
```bash
# View SQL verification script
cat supabase/verify-setup.sql

# Run in SQL Editor to verify everything
```

### Test Commands:
```bash
npm run migrate          # View migration SQL
npm run test:connection  # Test connection
npm run test:supabase    # Test API endpoint
```

## ✅ Success Criteria

After completing migrations, you should have:

- ✅ `apr` schema created
- ✅ `records` schema created  
- ✅ PostGIS extension enabled
- ✅ Helper functions created
- ✅ Test table created in `apr` schema
- ✅ Connection test passes

## Next Steps

Once migrations are complete:
- ✅ Task 2: Setup Supabase - **COMPLETE**
- 🎯 Task 3: Create Database Migration Foundation - **READY TO START**

