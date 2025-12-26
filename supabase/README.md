# Supabase Setup for APR System

## Prerequisites

1. Create a Supabase project at https://app.supabase.com
2. Get your project URL and anon key from Project Settings > API

## Setup Steps

### 1. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project details:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Run Database Migrations

#### Option A: Using Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/001_enable_postgis_and_create_apr_schema.sql`
4. Run the SQL script
5. Verify PostGIS is enabled by running: `SELECT PostGIS_Version();`

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Verify PostGIS Installation

Run this SQL query in Supabase SQL Editor:

```sql
SELECT PostGIS_Version();
```

Expected output: Version string (e.g., "3.4.0")

### 4. Verify Schema Creation

Check that schemas were created:

```sql
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('apr', 'records');
```

Expected output: Both `apr` and `records` schemas should be listed.

## Schema Structure

All APR system tables will be prefixed with the `apr` schema:

- `apr.sectional_scheme_plans` - Planning module tables
- `apr.survey_sectional_plans` - Survey module tables
- `apr.sectional_schemes` - Deeds module tables
- `apr.sections` - Section/unit tables
- `apr.sectional_titles` - Title registration tables
- `records.record_registry` - Audit trail tables

## Testing the Connection

Create a test API route to verify the connection:

```typescript
// app/api/test-supabase/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('_realtime').select('*').limit(1)
  
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  
  return Response.json({ 
    success: true, 
    message: 'Supabase connection successful',
    postgisNote: 'Run SELECT PostGIS_Version(); in SQL Editor to verify PostGIS'
  })
}
```

## Next Steps

After completing this setup:
- Task 3: Create Database Migration Foundation
- All future migrations will use the `apr` schema prefix

