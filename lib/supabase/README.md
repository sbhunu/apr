# Supabase Client Configuration for APR System

## Schema Usage

**IMPORTANT: All APR project tables MUST be created under the `apr` schema.**

### Schema Prefixes

- **`apr`** - All APR system tables (planning, survey, deeds, etc.)
- **`records`** - Audit trail and record registry tables

### Using the Schema Helpers

```typescript
import { aprTable, recordsTable } from '@/lib/supabase/schema'

// Correct: Use schema helper
const { data } = await supabase
  .from(aprTable('sectional_scheme_plans'))
  .select('*')

// Correct: Explicit schema prefix
const { data } = await supabase
  .from('apr.sectional_scheme_plans')
  .select('*')

// ❌ WRONG: Don't create tables without schema prefix
const { data } = await supabase
  .from('sectional_scheme_plans') // This creates in public schema!
  .select('*')
```

### Migration Guidelines

All migrations must explicitly specify the `apr` schema:

```sql
-- ✅ CORRECT
CREATE TABLE apr.sectional_scheme_plans (
  plan_id UUID PRIMARY KEY,
  ...
);

-- ❌ WRONG - Creates in public schema
CREATE TABLE sectional_scheme_plans (
  plan_id UUID PRIMARY KEY,
  ...
);
```

### Client Usage

#### Browser Client (Client Components)

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { aprTable } from '@/lib/supabase/schema'

export function MyComponent() {
  const supabase = createClient()
  
  const fetchData = async () => {
    const { data, error } = await supabase
      .from(aprTable('sectional_scheme_plans'))
      .select('*')
  }
}
```

#### Server Client (Server Components / API Routes)

```typescript
import { createClient } from '@/lib/supabase/server'
import { aprTable } from '@/lib/supabase/schema'

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from(aprTable('sectional_scheme_plans'))
    .select('*')
    
  return Response.json({ data })
}
```

## Testing Connection

Test the Supabase connection and schema setup:

```bash
# Start dev server
npm run dev

# Test endpoint
curl http://localhost:3000/api/test-supabase
```

Or visit: http://localhost:3000/api/test-supabase

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

