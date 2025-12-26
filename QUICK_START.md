# ⚡ Quick Start: Run Migrations Now

## 🎯 Fastest Way to Execute Migrations

### 1. Open Supabase SQL Editor

**For Local Supabase:**
- Dashboard: http://localhost:54323
- Or check: `supabase status` for dashboard URL

**For Cloud Supabase:**
- Go to: https://app.supabase.com
- Select your project
- Click **SQL Editor** in left sidebar

### 2. Copy & Paste Migrations

Run these **in order** (copy entire file content):

#### Migration 1: Foundation Setup
```bash
cat supabase/migrations/001_enable_postgis_and_create_apr_schema.sql
```
Copy the entire output and paste into SQL Editor → Click **Run**

#### Migration 2: Helper Functions  
```bash
cat supabase/migrations/002_create_schema_check_function.sql
```
Copy the entire output and paste into SQL Editor → Click **Run**

#### Migration 3: Verification
```bash
cat supabase/migrations/003_verify_apr_schema_setup.sql
```
Copy the entire output and paste into SQL Editor → Click **Run**

### 3. Verify Success

Run this in SQL Editor:
```sql
-- Check schemas
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('apr', 'records');

-- Check PostGIS
SELECT PostGIS_Version();

-- Check test table in apr schema
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = '_schema_test';
```

### 4. Test Connection

```bash
# Update .env.local with correct Supabase credentials first
npm run test:connection
```

## ✅ Done!

Once migrations complete, Task 2 is finished and you're ready for Task 3!

