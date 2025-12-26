# Module 5: General Operations & Rights Management - Gap Analysis & Implementation Plan

## Current State Assessment

### ✅ Implemented Features

#### 1. Database Schema
- ✅ `apr.ownership_transfers` table
- ✅ `apr.mortgages` table  
- ✅ `apr.leases` table (schema exists, but no service/UI)
- ✅ `apr.scheme_amendments` table

#### 2. Transfer Operations
- ✅ Service: `lib/operations/transfers.ts`
  - Transfer validation
  - Transfer submission
  - Transfer processing
  - Transfer history
- ✅ API Routes:
  - `/api/operations/transfers/pending`
  - `/api/operations/transfers/submit`
  - `/api/operations/transfers/validate`
  - `/api/operations/transfers/[id]`
  - `/api/operations/transfers/[id]/approve`
  - `/api/operations/transfers/[id]/reject`
  - `/api/operations/transfers/[id]/process`
- ✅ UI Pages:
  - `/operations/transfers/page.tsx` (list view)
  - `/operations/transfers/[id]/page.tsx` (detail view - needs verification)
  - `/operations/transfers/submit/page.tsx` (submission form - needs verification)

#### 3. Mortgage Operations
- ✅ Service: `lib/operations/mortgages.ts`
  - Mortgage registration
  - Mortgage discharge
  - Priority management
  - Encumbrance checking
- ❌ API Routes: **MISSING**
- ❌ UI Pages: Only placeholder exists (`/operations/mortgages/page.tsx`)

#### 4. Amendment Operations
- ✅ Service: `lib/operations/amendments.ts`
  - Amendment validation
  - Amendment submission
  - Amendment processing (extension, subdivision, consolidation)
  - Quota recalculation
- ✅ API Routes:
  - `/api/operations/amendments/pending`
  - `/api/operations/amendments/submit`
  - `/api/operations/amendments/validate`
  - `/api/operations/amendments/[id]`
  - `/api/operations/amendments/[id]/approve`
  - `/api/operations/amendments/[id]/reject`
  - `/api/operations/amendments/[id]/process`
- ✅ UI Pages:
  - `/operations/amendments/page.tsx` (list view)
  - `/operations/amendments/[id]/page.tsx` (detail view - needs verification)
  - `/operations/amendments/submit/page.tsx` (submission form - needs verification)

### ❌ Missing Features

#### 1. Lease Registration (5.1)
- ❌ Service: `lib/operations/leases.ts` - **NOT IMPLEMENTED**
- ❌ API Routes: **NOT IMPLEMENTED**
- ❌ UI Pages: **NOT IMPLEMENTED**
- **Requirements:**
  - Register long-term leases on sectional units
  - Validate owner consent
  - Record lease with start/end dates
  - Compute expiry dates
  - Set reminders for lease expiry
  - Link to title records

#### 2. Dispute Resolution & Objections (5.3)
- ❌ Database Schema: **NOT IMPLEMENTED**
  - Need `apr.objections` table
  - Need `apr.disputes` table
- ❌ Service: `lib/operations/disputes.ts` - **NOT IMPLEMENTED**
- ❌ Service: `lib/operations/objections.ts` - **NOT IMPLEMENTED**
- ❌ API Routes: **NOT IMPLEMENTED**
- ❌ UI Pages: **NOT IMPLEMENTED**
- **Requirements:**
  - Objection window management (30-day window after plan submission)
  - Objection submission workflow
  - Dispute workflow involving:
    - Scheme Bodies
    - District & Provincial Administration
    - Land Commission
    - Ministry
  - Hearing scheduling
  - Resolution tracking

#### 3. Mortgage UI Implementation
- ❌ Complete mortgage registration UI
- ❌ Mortgage detail view
- ❌ Mortgage discharge UI
- ❌ Mortgage priority display

#### 4. Workflow Integration
- ❌ Approval/rejection workflows for all operations
- ❌ Digital signature integration for approvals
- ❌ Notification system for workflow state changes
- ❌ Multi-agency workflow routing

#### 5. Financial Institution Integration (5.1)
- ❌ Integration with financial institution records
- ❌ API endpoints for external systems
- ❌ Lender notification system

#### 6. Complete UI Flows
- ⚠️ Transfer detail pages need verification
- ⚠️ Transfer submission forms need verification
- ⚠️ Amendment detail pages need verification
- ⚠️ Amendment submission forms need verification

## Implementation Plan

### Phase 1: Complete Mortgage Operations (Priority: High)
**Goal:** Full mortgage registration and management UI

**Tasks:**
1. Create API routes for mortgages:
   - `/api/operations/mortgages/register`
   - `/api/operations/mortgages/[id]`
   - `/api/operations/mortgages/[id]/discharge`
   - `/api/operations/mortgages/title/[titleId]`
2. Create mortgage registration UI:
   - `/operations/mortgages/register/page.tsx`
   - `/operations/mortgages/[id]/page.tsx`
   - Update `/operations/mortgages/page.tsx` (list view)
3. Integrate mortgage display in title certificates
4. Add mortgage priority visualization

### Phase 2: Lease Registration (Priority: High)
**Goal:** Complete lease registration functionality

**Tasks:**
1. Create lease service: `lib/operations/leases.ts`
   - `registerLease()` - Register new lease
   - `validateLease()` - Validate lease data
   - `getTitleLeases()` - Get leases for a title
   - `dischargeLease()` - Discharge/terminate lease
   - `getExpiringLeases()` - Get leases expiring soon
2. Create API routes:
   - `/api/operations/leases/register`
   - `/api/operations/leases/[id]`
   - `/api/operations/leases/[id]/discharge`
   - `/api/operations/leases/title/[titleId]`
   - `/api/operations/leases/expiring`
3. Create UI pages:
   - `/operations/leases/page.tsx` (list view)
   - `/operations/leases/register/page.tsx`
   - `/operations/leases/[id]/page.tsx`
4. Add lease expiry reminders/notifications

### Phase 3: Dispute Resolution & Objections (Priority: Medium)
**Goal:** Complete dispute and objection workflow

**Tasks:**
1. Create database schema:
   - `apr.objections` table
   - `apr.disputes` table
   - Migration file
2. Create objection service: `lib/operations/objections.ts`
   - `submitObjection()` - Submit objection
   - `getObjectionsForPlan()` - Get objections for a plan
   - `scheduleHearing()` - Schedule hearing
   - `resolveObjection()` - Resolve objection
3. Create dispute service: `lib/operations/disputes.ts`
   - `createDispute()` - Create dispute record
   - `assignDispute()` - Assign to authority
   - `updateDisputeStatus()` - Update dispute status
   - `resolveDispute()` - Resolve dispute
4. Create API routes:
   - `/api/operations/objections/submit`
   - `/api/operations/objections/plan/[planId]`
   - `/api/operations/objections/[id]`
   - `/api/operations/disputes/create`
   - `/api/operations/disputes/[id]`
   - `/api/operations/disputes/[id]/assign`
5. Create UI pages:
   - `/operations/objections/page.tsx`
   - `/operations/objections/submit/page.tsx`
   - `/operations/disputes/page.tsx`
   - `/operations/disputes/[id]/page.tsx`
6. Implement objection window management (30-day window)

### Phase 4: Workflow Integration (Priority: Medium)
**Goal:** Complete approval workflows with digital signatures

**Tasks:**
1. Integrate workflow engine for all operations
2. Add digital signature requirements for approvals
3. Implement notification system for state changes
4. Add multi-agency routing logic
5. Create workflow visualization UI

### Phase 5: Financial Institution Integration (Priority: Low)
**Goal:** External system integration

**Tasks:**
1. Design API endpoints for external systems
2. Implement lender notification system
3. Create webhook endpoints for status updates
4. Add API authentication/authorization

### Phase 6: UI Polish & Verification (Priority: Medium)
**Goal:** Complete and verify all UI flows

**Tasks:**
1. Verify and complete transfer UI flows
2. Verify and complete amendment UI flows
3. Add GIS viewer integration for amendments
4. Add document viewer integration
5. Improve error handling and user feedback

## Database Schema Additions Needed

### Objections Table
```sql
CREATE TABLE apr.objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_plan_id UUID REFERENCES apr.sectional_scheme_plans(id),
  objector_name TEXT NOT NULL,
  objector_id_number TEXT,
  objector_contact_email TEXT,
  objector_contact_phone TEXT,
  objection_type TEXT CHECK (objection_type IN ('boundary', 'rights', 'environmental', 'other')),
  description TEXT NOT NULL,
  supporting_documents JSONB,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'scheduled', 'resolved', 'dismissed')),
  hearing_date TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

### Disputes Table
```sql
CREATE TABLE apr.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_type TEXT CHECK (dispute_type IN ('boundary', 'ownership', 'rights', 'amendment', 'other')),
  title_id UUID REFERENCES apr.sectional_titles(id),
  scheme_id UUID REFERENCES apr.sectional_schemes(id),
  complainant_name TEXT NOT NULL,
  complainant_id_number TEXT,
  respondent_name TEXT,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'assigned', 'under_review', 'hearing_scheduled', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_authority TEXT CHECK (assigned_authority IN ('scheme_body', 'district_admin', 'provincial_admin', 'land_commission', 'ministry')),
  hearing_date TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

## Next Steps

1. **Start with Phase 1** (Mortgage UI) - Highest priority, builds on existing service
2. **Then Phase 2** (Lease Registration) - Completes Rights Management section
3. **Then Phase 3** (Disputes & Objections) - Completes Module 5.3
4. **Then Phase 4** (Workflow Integration) - Enhances all operations
5. **Finally Phase 5 & 6** (Integration & Polish)

## Dependencies

- Module 4 (Deeds) must be complete (registered titles required)
- Workflow engine must be available
- PKI integration must be available (for digital signatures)
- Notification system must be available

