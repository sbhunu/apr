# Workflow Events Migration Instructions

This document provides instructions for applying the workflow events database migration.

---

## Migration File

**Location:** `supabase/migrations/031_workflow_events.sql`

**Purpose:** Creates the `apr.workflow_events` table to track workflow triggers between modules.

---

## Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration SQL**
   - Open `supabase/migrations/031_workflow_events.sql`
   - Copy all contents

4. **Paste and Execute**
   - Paste the SQL into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

5. **Verify Migration**
   - Run this query to verify:
     ```sql
     SELECT * FROM apr.workflow_events LIMIT 1;
     ```
   - Should return empty result (no error = success)

---

## Method 2: Using Supabase CLI

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Authenticated with Supabase: `supabase login`

**Steps:**
1. Navigate to project root:
   ```bash
   cd /home/sbhunu/production/apr
   ```

2. Link to your Supabase project (if not already linked):
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. Apply migration:
   ```bash
   supabase db push
   ```

   Or apply specific migration:
   ```bash
   supabase migration up
   ```

---

## Method 3: Using psql Directly

**Prerequisites:**
- PostgreSQL client (`psql`) installed
- Database connection string

**Steps:**
1. Set database URL:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```

2. Apply migration:
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/031_workflow_events.sql
   ```

---

## Method 4: Using Migration Script

**Prerequisites:**
- Bash shell
- Supabase CLI or psql available

**Steps:**
1. Make script executable:
   ```bash
   chmod +x scripts/apply-workflow-migration.sh
   ```

2. Run script:
   ```bash
   ./scripts/apply-workflow-migration.sh
   ```

   The script will:
   - Check if migration file exists
   - Attempt to apply via Supabase CLI
   - Provide manual instructions if CLI is not available

---

## Verification

After applying the migration, verify it was successful:

### Check Table Exists
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'apr' 
  AND table_name = 'workflow_events'
);
```
**Expected:** `true`

### Check Table Structure
```sql
\d apr.workflow_events
```
**Expected:** Shows table columns and constraints

### Check Indexes
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'workflow_events' 
AND schemaname = 'apr';
```
**Expected:** 6 indexes created

### Check Public View
```sql
SELECT * FROM public.workflow_events LIMIT 1;
```
**Expected:** Empty result (no error = success)

---

## Troubleshooting

### Error: "relation already exists"

**Cause:** Migration was already applied

**Solution:**
- Migration is idempotent - safe to ignore
- Or drop and recreate:
  ```sql
  DROP VIEW IF EXISTS public.workflow_events;
  DROP TABLE IF EXISTS apr.workflow_events CASCADE;
  ```
  Then re-run migration

### Error: "permission denied"

**Cause:** Database user lacks permissions

**Solution:**
- Ensure you're using a user with CREATE TABLE permissions
- Or run as database owner/superuser

### Error: "schema 'apr' does not exist"

**Cause:** APR schema not created

**Solution:**
- Create schema first:
  ```sql
  CREATE SCHEMA IF NOT EXISTS apr;
  ```
- Or ensure earlier migrations have been applied

---

## Rollback (If Needed)

To rollback the migration:

```sql
-- Drop public view
DROP VIEW IF EXISTS public.workflow_events;

-- Drop table (cascade to drop indexes and triggers)
DROP TABLE IF EXISTS apr.workflow_events CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS apr.update_workflow_events_updated_at();
```

**Warning:** This will delete all workflow event data. Only use if necessary.

---

## Post-Migration Checklist

- [ ] Table `apr.workflow_events` exists
- [ ] Public view `public.workflow_events` exists
- [ ] All indexes created (6 indexes)
- [ ] Trigger function created
- [ ] Permissions granted (authenticated, anon)
- [ ] Can query table without errors
- [ ] Can insert test record
- [ ] Can query via API endpoint

---

## Next Steps

After migration is applied:

1. **Test Workflow Triggers**
   - Follow: `docs/WORKFLOW_TESTING_GUIDE.md`
   - Run: `./scripts/test-workflow-triggers.sh`

2. **Monitor Workflow Events**
   - Navigate to: `/admin/workflows`
   - View workflow event dashboard

3. **Verify Integration**
   - Approve a planning plan
   - Check workflow event is created
   - Verify event appears in dashboard

---

## Support

If you encounter issues:

1. Check migration file syntax
2. Verify database connection
3. Check user permissions
4. Review Supabase logs
5. Consult: `docs/WORKFLOW_TESTING_GUIDE.md`

