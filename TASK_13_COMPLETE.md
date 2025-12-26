# ✅ Task 13 Complete: Create Planning Database Schema

## 🎉 Summary

Successfully implemented comprehensive database schema for the planning module with tables, RLS policies, indexes, triggers, and audit trail functionality.

## ✅ What Was Accomplished

### 1. **Planning Tables Created**
   - ✅ `apr.sectional_scheme_plans` - Main table for plan submissions
   - ✅ `apr.plan_documents` - Documents attached to plans
   - ✅ `apr.planning_reviews` - Review records for planning applications

### 2. **Sectional Scheme Plans Table**
   - ✅ Plan identification (plan_number, title, description)
   - ✅ Spatial data (boundary_geometry, centroid) with PostGIS
   - ✅ Planner information (planner_id, planner_name, registration_number)
   - ✅ Workflow status tracking (status, workflow_state)
   - ✅ Review, approval, rejection, and amendment tracking
   - ✅ Version tracking and parent plan relationships
   - ✅ Metadata JSONB field for flexible storage

### 3. **Plan Documents Table**
   - ✅ Multiple document types (plan_drawing, site_plan, elevation, etc.)
   - ✅ File storage integration (file_path, file_size, mime_type)
   - ✅ Version tracking (version, is_current)
   - ✅ Upload tracking (uploaded_by, uploaded_at)

### 4. **Planning Reviews Table**
   - ✅ Review types (initial, technical, compliance, amendment, final)
   - ✅ Review status tracking
   - ✅ Findings and recommendations storage
   - ✅ Reviewer information and timestamps

### 5. **Indexes Created**
   - ✅ Status indexes for fast filtering
   - ✅ Planner ID indexes for user queries
   - ✅ Date indexes for chronological queries
   - ✅ Plan number unique index
   - ✅ Spatial indexes (GIST) for geometry columns
   - ✅ Document type and current version indexes

### 6. **RLS Policies Implemented**
   - ✅ Planners can view/create/update their own plans
   - ✅ Planning authority can view all plans
   - ✅ Planning authority can review/approve/reject plans
   - ✅ Document access based on plan access
   - ✅ Review access control

### 7. **Triggers and Functions**
   - ✅ `update_updated_at_column()` - Auto-update timestamps
   - ✅ `calculate_plan_centroid()` - Auto-calculate centroid from boundary
   - ✅ `increment_plan_version()` - Auto-increment version on changes
   - ✅ `get_plan_status_history()` - Status history helper

### 8. **TypeScript Types Updated**
   - ✅ Added `SectionalSchemePlans` interface
   - ✅ Added `PlanDocuments` interface
   - ✅ Added `PlanningReviews` interface
   - ✅ Updated database type definitions

### 9. **Verification Tests**
   - ✅ `tests/verify-planning-schema.test.ts` - Schema verification tests
   - ✅ `supabase/migrations/009_verify_planning_schema.sql` - SQL verification

## 📁 Files Created

```
supabase/migrations/
├── 008_planning_schema.sql          # Main planning schema migration
└── 009_verify_planning_schema.sql   # Verification migration

types/
└── database.ts                       # Updated with planning types

tests/
└── verify-planning-schema.test.ts   # Schema verification tests
```

## 🎯 Key Features

### Spatial Data Support

```sql
-- Boundary geometry stored as PostGIS Polygon
boundary_geometry GEOMETRY(POLYGON, 32735)

-- Centroid automatically calculated via trigger
centroid GEOMETRY(POINT, 32735)
```

### Workflow State Management

```typescript
status: 'draft' | 'submitted' | 'under_review_planning_authority' | 
        'approved_planning_authority' | 'rejected_planning_authority' | 
        'returned_for_amendment' | 'finalized' | 'withdrawn'
```

### RLS Policy Examples

```sql
-- Planners can only update their own plans in draft/amendment status
CREATE POLICY "Planners can update own plans"
  ON apr.sectional_scheme_plans
  FOR UPDATE
  USING (
    planner_id = auth.uid() AND
    status IN ('draft', 'returned_for_amendment')
  )
```

### Audit Trail

- Automatic `updated_at` and `updated_by` tracking
- Version incrementing on status/geometry changes
- Parent plan relationships for amendments

## ✅ Verification Checklist

- [x] Tables created in apr schema
- [x] Foreign keys to auth.users
- [x] RLS policies for planners and planning authority
- [x] Indexes on frequently queried columns
- [x] Spatial indexes on geometry columns
- [x] Audit triggers for change tracking
- [x] Centroid calculation trigger
- [x] Version tracking
- [x] Document versioning support
- [x] Review tracking functionality
- [x] TypeScript types updated
- [x] Verification tests created

## 🧪 Testing

### Run Verification Tests

```bash
npm run test:planning
```

### Verify in Database

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'apr' 
  AND table_name LIKE '%plan%';

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'apr' 
  AND tablename IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'apr' 
  AND tablename LIKE '%plan%';
```

## 🚀 Next Steps

**Ready for:**
- Task 10: Implement Workflow Engine State Machines (will use planning workflow states)
- Task 14: Create Survey Database Schema (similar structure)
- Task 15: Create Deeds Database Schema (similar structure)

## 📚 Usage Examples

### Create a Plan

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase
  .from('sectional_scheme_plans')
  .insert({
    plan_number: 'PLAN-2024-001',
    title: 'Harare Central Sectional Scheme',
    planner_id: userId,
    status: 'draft',
    boundary_geometry: polygonGeometry, // GeoJSON Polygon
  })
```

### Query Plans

```typescript
// Get planner's own plans
const { data } = await supabase
  .from('sectional_scheme_plans')
  .select('*')
  .eq('planner_id', userId)
  .order('created_at', { ascending: false })

// Get plans for review (planning authority)
const { data } = await supabase
  .from('sectional_scheme_plans')
  .select('*')
  .eq('status', 'submitted')
```

### Upload Document

```typescript
const { data, error } = await supabase
  .from('plan_documents')
  .insert({
    plan_id: planId,
    document_type: 'plan_drawing',
    title: 'Site Plan',
    file_name: 'site-plan.pdf',
    file_path: '/plans/plan-001/site-plan.pdf',
    uploaded_by: userId,
  })
```

## 🎯 Task Status: COMPLETE ✅

All requirements met:
- ✅ Tables created with proper schema
- ✅ Foreign keys to auth.users
- ✅ RLS policies for access control
- ✅ Indexes on frequently queried columns
- ✅ Audit triggers for change tracking
- ✅ Spatial data support with PostGIS
- ✅ Version tracking
- ✅ Document management
- ✅ Review tracking
- ✅ TypeScript types updated
- ✅ Verification tests created

