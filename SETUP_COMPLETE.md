# ✅ Task 2 Setup Complete: Supabase with APR Schema

## What Was Configured

### 1. Supabase Client Files ✅
- `lib/supabase/client.ts` - Browser client for Client Components
- `lib/supabase/server.ts` - Server client for Server Components/API routes
- `lib/supabase/middleware.ts` - Session management middleware
- `lib/supabase/schema.ts` - Schema helper functions (ensures `apr` prefix)
- `lib/supabase/test-postgis.ts` - PostGIS testing utility

### 2. Database Migrations ✅
- `001_enable_postgis_and_create_apr_schema.sql` - Creates `apr` and `records` schemas
- `002_create_schema_check_function.sql` - Helper function to verify schemas
- `003_verify_apr_schema_setup.sql` - Verification migration with test table

### 3. Schema Enforcement ✅
**All tables MUST use the `apr` schema prefix:**
- ✅ Migration files enforce `apr.` prefix
- ✅ Helper functions (`aprTable()`) ensure correct usage
- ✅ Documentation and guides created
- ✅ Verification scripts provided

### 4. Testing & Documentation ✅
- `app/api/test-supabase/route.ts` - API endpoint to test connection
- `supabase/verify-setup.sql` - SQL script to verify schema setup
- `supabase/MIGRATION_GUIDE.md` - Guide for future migrations
- `lib/supabase/README.md` - Client usage documentation

## ⚠️ Important: Schema Prefix Requirement

**ALL APR project tables MUST be created under the `apr` schema:**

```sql
-- ✅ CORRECT
CREATE TABLE apr.sectional_scheme_plans (...);

-- ❌ WRONG - Creates in public schema
CREATE TABLE sectional_scheme_plans (...);
```

## Next Steps to Complete Setup

### Step 1: Configure Environment Variables

You have `.env` file, but Next.js prefers `.env.local` for local development:

```bash
# Option A: Copy your existing .env to .env.local
cp .env .env.local

# Option B: Create .env.local from template
cp .env.local.example .env.local
# Then edit .env.local with your Supabase credentials
```

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 2: Run Database Migrations

#### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run migrations in order:
   - Copy/paste `supabase/migrations/001_enable_postgis_and_create_apr_schema.sql`
   - Copy/paste `supabase/migrations/002_create_schema_check_function.sql`
   - Copy/paste `supabase/migrations/003_verify_apr_schema_setup.sql`

#### Option B: Supabase CLI
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to project (if using cloud) or start local (if using local)
supabase link --project-ref your-project-ref
# OR
supabase start

# Push migrations
supabase db push
```

### Step 3: Verify Setup

Run the verification SQL script in Supabase SQL Editor:
```sql
-- Copy and run: supabase/verify-setup.sql
```

Or test via API:
```bash
# Start dev server
npm run dev

# Test connection
curl http://localhost:3000/api/test-supabase
# Or visit: http://localhost:3000/api/test-supabase
```

### Step 4: Verify PostGIS

Run in Supabase SQL Editor:
```sql
SELECT PostGIS_Version();
```

Expected: Version string (e.g., "3.4.0")

## Schema Structure

```
apr schema (all APR tables):
├── apr.sectional_scheme_plans (Planning module)
├── apr.survey_sectional_plans (Survey module)
├── apr.sectional_schemes (Deeds module)
├── apr.sections (Unit/section tables)
├── apr.sectional_titles (Title registration)
└── ... (all future APR tables)

records schema (audit trail):
└── records.record_registry (Immutable audit logs)
```

## Usage Examples

### In Migrations
```sql
-- Always use apr schema prefix
CREATE TABLE apr.sectional_scheme_plans (
  plan_id UUID PRIMARY KEY,
  scheme_name TEXT NOT NULL,
  ...
);
```

### In TypeScript Code
```typescript
import { createClient } from '@/lib/supabase/server'
import { aprTable } from '@/lib/supabase/schema'

const supabase = await createClient()
const { data } = await supabase
  .from(aprTable('sectional_scheme_plans'))
  .select('*')
```

## Files Created

```
lib/supabase/
├── client.ts              ✅ Browser client
├── server.ts              ✅ Server client  
├── middleware.ts          ✅ Session middleware
├── schema.ts              ✅ Schema helpers (apr prefix)
├── test-postgis.ts        ✅ PostGIS test utility
└── README.md              ✅ Usage documentation

supabase/
├── migrations/
│   ├── 001_enable_postgis_and_create_apr_schema.sql  ✅ Foundation
│   ├── 002_create_schema_check_function.sql          ✅ Helpers
│   └── 003_verify_apr_schema_setup.sql               ✅ Verification
├── verify-setup.sql       ✅ SQL verification script
├── README.md              ✅ Setup guide
└── MIGRATION_GUIDE.md     ✅ Migration guidelines

app/api/
└── test-supabase/
    └── route.ts           ✅ Connection test endpoint
```

## ✅ Task Status

- **Task 1**: Initialize Next.js Project - ✅ DONE
- **Task 2**: Setup Supabase Project with PostGIS Extension - ✅ DONE

**Ready for Task 3**: Create Database Migration Foundation

