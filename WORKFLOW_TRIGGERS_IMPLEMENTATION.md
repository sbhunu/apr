# Workflow Triggers Implementation Summary

**Date:** 2025-01-XX  
**Status:** ✅ **COMPLETE**

---

## Overview

This document summarizes the implementation of workflow triggers across all modules as per the Integrated Plan BPMN requirements. The workflow philosophy is now fully implemented: each module completion automatically triggers the next module in the workflow chain.

---

## Implementation Details

### 1. Workflow Trigger Service ✅

**File:** `lib/workflows/triggers.ts`

**Features:**
- Centralized workflow trigger service
- Supports 4 trigger types: `planning_approved`, `survey_sealed`, `scheme_registered`, `title_registered`
- Creates workflow event log entries
- Validates entity states before triggering
- Error handling with graceful degradation

**Key Functions:**
- `triggerNextModule()` - Main trigger function
- `processPlanningApprovedTrigger()` - Planning → Survey trigger handler
- `processSurveySealedTrigger()` - Survey → Deeds trigger handler
- `processSchemeRegisteredTrigger()` - Scheme → Title Creation trigger handler
- `processTitleRegisteredTrigger()` - Title → Operations trigger handler
- `getWorkflowEvents()` - Retrieve workflow events for an entity
- `getPendingWorkflowEvents()` - Get pending workflow events

---

### 2. Workflow Events Database Table ✅

**Migration:** `supabase/migrations/031_workflow_events.sql`

**Schema:**
```sql
CREATE TABLE apr.workflow_events (
  id UUID PRIMARY KEY,
  from_module TEXT NOT NULL,
  to_module TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  error TEXT
);
```

**Indexes:**
- `idx_workflow_events_entity` - Fast entity lookups
- `idx_workflow_events_status` - Filter by status
- `idx_workflow_events_trigger_type` - Filter by trigger type
- `idx_workflow_events_from_module` - Filter by source module
- `idx_workflow_events_to_module` - Filter by target module
- `idx_workflow_events_triggered_at` - Time-based queries

**Public View:** `public.workflow_events` for PostgREST access

---

### 3. Planning → Survey Trigger ✅

**Location:** `lib/planning/review-service.ts` (line ~335)

**Implementation:**
- Triggered when planning plan is approved (`decision === 'approved'`)
- Sets `locked = true` on approval (as per Integrated Plan)
- Creates workflow event log entry
- Makes plan available to Survey module

**Trigger Details:**
```typescript
await triggerNextModule({
  fromModule: 'planning',
  toModule: 'survey',
  entityId: planId,
  entityType: 'planning_plan',
  triggerType: 'planning_approved',
  triggeredBy: reviewerId,
  metadata: { planId, schemeName, approvalNumber, approvedAt }
})
```

**Validation:**
- Verifies plan is approved (`approval_status === 'approved'`)
- Verifies plan is locked (`locked === true`)
- Documents workflow handoff in event log

---

### 4. Survey → Deeds Trigger ✅

**Location:** `lib/survey/sealing-service.ts` (line ~215)

**Implementation:**
- Triggered when survey is sealed (`status === 'sealed'`)
- Creates workflow event log entry
- Makes sealed survey available to Deeds module

**Trigger Details:**
```typescript
await triggerNextModule({
  fromModule: 'survey',
  toModule: 'deeds',
  entityId: surveyPlanId,
  entityType: 'survey_plan',
  triggerType: 'survey_sealed',
  triggeredBy: userId,
  metadata: { surveyId, surveyNumber, planId, sealHash, sealedAt }
})
```

**Validation:**
- Verifies survey is sealed (`status === 'sealed'`)
- Documents workflow handoff in event log

---

### 5. Scheme → Title Creation Trigger ✅

**Location:** `lib/deeds/scheme-registration.ts` (line ~315)

**Implementation:**
- Triggered when scheme is registered
- Creates workflow event log entry
- Makes registered scheme available for Title Creation workflow

**Trigger Details:**
```typescript
await triggerNextModule({
  fromModule: 'scheme_registration',
  toModule: 'title_creation',
  entityId: scheme.id,
  entityType: 'sectional_scheme',
  triggerType: 'scheme_registered',
  triggeredBy: user.id,
  metadata: { schemeId, schemeNumber, schemeName, surveyPlanId, bodyCorporateId, registrationDate }
})
```

**Validation:**
- Verifies scheme is registered
- Documents workflow handoff in event log

---

### 6. Title → Operations Trigger ✅

**Location:** `lib/deeds/title-registration.ts` (line ~345)

**Implementation:**
- Triggered when title is registered (`registration_status === 'registered'`)
- Creates workflow event log entry
- Makes registered title available to Operations module

**Trigger Details:**
```typescript
await triggerNextModule({
  fromModule: 'deeds',
  toModule: 'operations',
  entityId: titleId,
  entityType: 'sectional_title',
  triggerType: 'title_registered',
  triggeredBy: userId,
  metadata: { titleId, titleNumber, registrationNumber, registrationDate, sectionId, sectionNumber, schemeNumber, schemeName }
})
```

**Validation:**
- Verifies title is registered (`registration_status === 'registered'`)
- Documents workflow handoff in event log

---

### 7. Workflow Manager Enhancement ✅

**Location:** `lib/workflows/manager.ts`

**Changes:**
- Updated `sendNotification()` method to use actual workflow triggers
- Integrated with workflow trigger service
- Handles planning → survey and survey → deeds transitions automatically
- Maintains backward compatibility

**Note:** Scheme and title registration triggers are handled directly in their respective service functions for better context and metadata.

---

### 8. Workflow Events API Route ✅

**File:** `app/api/workflows/events/route.ts`

**Endpoints:**
- `GET /api/workflows/events?entityId=<id>&entityType=<type>` - Get events for an entity
- `GET /api/workflows/events?pending=true` - Get pending workflow events

**Access:** Requires `admin:read` permission

**Use Cases:**
- Monitor workflow handoffs
- Debug workflow issues
- View workflow history
- Track pending triggers

---

## Workflow Flow Diagram

```
Planning Module (Module 1)
  │
  ├─ Plan Submitted
  │
  ├─ Plan Approved + Locked ✅
  │   │
  │   └─ [TRIGGER] → Survey Module (Module 2)
  │
Survey Module (Module 2)
  │
  ├─ Survey Computed
  │
  ├─ Survey Sealed ✅
  │   │
  │   └─ [TRIGGER] → Deeds Module (Module 3)
  │
Deeds Module - Scheme Registration (Module 3)
  │
  ├─ Scheme Registered ✅
  │   │
  │   └─ [TRIGGER] → Title Creation (Module 4)
  │
Deeds Module - Title Registration (Module 4)
  │
  ├─ Title Registered ✅
  │   │
  │   └─ [TRIGGER] → Operations Module (Module 5)
  │
Operations Module (Module 5)
  │
  └─ Ready for transfers, mortgages, leases, amendments
```

---

## Testing Checklist

### Unit Tests
- [ ] Test `triggerNextModule()` with valid triggers
- [ ] Test trigger validation (entity state checks)
- [ ] Test workflow event log creation
- [ ] Test error handling in trigger service

### Integration Tests
- [ ] Test Planning → Survey trigger end-to-end
  - Approve plan → Verify workflow event created → Verify survey can access plan
- [ ] Test Survey → Deeds trigger end-to-end
  - Seal survey → Verify workflow event created → Verify deeds can access survey
- [ ] Test Scheme → Title Creation trigger end-to-end
  - Register scheme → Verify workflow event created → Verify title creation available
- [ ] Test Title → Operations trigger end-to-end
  - Register title → Verify workflow event created → Verify operations can access title

### E2E Tests
- [ ] Complete workflow: Planning → Survey → Deeds → Operations
- [ ] Verify all triggers fire correctly
- [ ] Verify workflow event log entries created
- [ ] Verify entities are accessible to next modules

---

## Monitoring & Debugging

### Workflow Event Log Queries

**Get all workflow events for a plan:**
```sql
SELECT * FROM apr.workflow_events 
WHERE entity_id = '<plan_id>' 
ORDER BY triggered_at DESC;
```

**Get pending workflow events:**
```sql
SELECT * FROM apr.workflow_events 
WHERE status = 'pending' 
ORDER BY triggered_at ASC;
```

**Get failed workflow events:**
```sql
SELECT * FROM apr.workflow_events 
WHERE status = 'failed' 
ORDER BY triggered_at DESC;
```

**Get workflow events by trigger type:**
```sql
SELECT * FROM apr.workflow_events 
WHERE trigger_type = 'planning_approved' 
ORDER BY triggered_at DESC;
```

### API Endpoints

**Get workflow events:**
```bash
GET /api/workflows/events?entityId=<id>&entityType=planning_plan
```

**Get pending events:**
```bash
GET /api/workflows/events?pending=true
```

---

## Error Handling

**Graceful Degradation:**
- If workflow trigger fails, the main operation (approval/sealing/registration) still succeeds
- Errors are logged but don't block the workflow
- Failed triggers are marked in the workflow event log with error details

**Error Recovery:**
- Failed triggers can be retried manually
- Workflow events can be reprocessed
- System continues to function even if triggers fail

---

## Future Enhancements

### Medium Priority
1. **Email Notifications**
   - Send email when workflow triggers occur
   - Notify relevant stakeholders (surveyors, conveyancers, etc.)

2. **Workflow Dashboard**
   - Create dashboard showing workflow status across modules
   - Show pending handoffs and bottlenecks
   - Visualize workflow flow

3. **Retry Mechanism**
   - Automatic retry for failed triggers
   - Configurable retry intervals and max attempts

### Low Priority
4. **Webhook Support**
   - Allow external systems to subscribe to workflow events
   - Webhook delivery for workflow triggers

5. **Workflow Analytics**
   - Track average time between modules
   - Identify bottlenecks
   - Performance metrics

---

## Files Created/Modified

### New Files
- `lib/workflows/triggers.ts` - Workflow trigger service
- `supabase/migrations/031_workflow_events.sql` - Database migration
- `app/api/workflows/events/route.ts` - API route for workflow events
- `WORKFLOW_TRIGGERS_IMPLEMENTATION.md` - This document

### Modified Files
- `lib/planning/review-service.ts` - Added Planning → Survey trigger + locked field
- `lib/survey/sealing-service.ts` - Added Survey → Deeds trigger
- `lib/deeds/scheme-registration.ts` - Added Scheme → Title Creation trigger
- `lib/deeds/title-registration.ts` - Added Title → Operations trigger
- `lib/workflows/manager.ts` - Enhanced notification system

---

## Verification

### ✅ All Critical Gaps Addressed

1. ✅ **Planning → Survey Trigger** - Implemented in `review-service.ts`
2. ✅ **Survey → Deeds Trigger** - Implemented in `sealing-service.ts`
3. ✅ **Scheme → Title Creation Trigger** - Implemented in `scheme-registration.ts`
4. ✅ **Title → Operations Trigger** - Implemented in `title-registration.ts`
5. ✅ **Workflow Event Log** - Database table created
6. ✅ **Workflow Manager** - Enhanced with actual triggers
7. ✅ **Plan Locking** - Added `locked = true` on approval

### ✅ Workflow Philosophy Maintained

- Each module completion triggers the next module
- Workflow events are logged for audit trail
- Entity states are validated before triggering
- Error handling ensures system continues to function

---

## Conclusion

**Status:** ✅ **ALL WORKFLOW TRIGGERS IMPLEMENTED**

The workflow trigger philosophy from the Integrated Plan BPMN is now fully implemented. All 4 critical workflow triggers are in place:

1. Planning Approved → Survey Module ✅
2. Survey Sealed → Deeds Module ✅
3. Scheme Registered → Title Creation ✅
4. Title Registered → Operations Module ✅

The system now maintains the workflow philosophy where each module completion automatically triggers the next module, with full audit trail via workflow event logs.

