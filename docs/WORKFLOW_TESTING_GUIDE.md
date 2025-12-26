# Workflow Testing Guide

This guide provides step-by-step instructions for testing the workflow triggers across all modules.

---

## Prerequisites

1. **Database Migration Applied**
   - Run the workflow events migration: `031_workflow_events.sql`
   - Verify table exists: `SELECT * FROM apr.workflow_events LIMIT 1;`

2. **Test Data Available**
   - At least one planning plan in draft/submitted status
   - Test user accounts with appropriate roles:
     - Planning Authority user
     - Surveyor user
     - Surveyor-General user
     - Deeds Registry Officer user
     - Registrar user

---

## Test Workflow: End-to-End

### Step 1: Planning Approval → Survey Trigger

**Objective:** Verify that approving a planning plan triggers the Survey module workflow.

**Steps:**
1. Log in as a **Planning Authority** user
2. Navigate to `/planning/review`
3. Select a pending planning plan
4. Review and approve the plan
5. **Verify:**
   - Plan status changes to `approved`
   - Plan `locked` field is set to `true`
   - Workflow event is created:
     ```sql
     SELECT * FROM apr.workflow_events 
     WHERE trigger_type = 'planning_approved' 
     ORDER BY triggered_at DESC LIMIT 1;
     ```
   - Event status is `processed`
   - Event metadata contains plan details

**Expected Result:**
- Workflow event logged with `from_module='planning'`, `to_module='survey'`
- Survey module can now access the approved plan
- Plan is locked and immutable

**Check Workflow Events:**
```bash
curl http://localhost:3000/api/workflows/events?entityId=<plan_id>&entityType=planning_plan
```

---

### Step 2: Survey Sealing → Deeds Trigger

**Objective:** Verify that sealing a survey triggers the Deeds module workflow.

**Prerequisites:**
- Step 1 completed (planning plan approved)
- Survey computation completed for the approved plan

**Steps:**
1. Log in as a **Surveyor** user
2. Navigate to `/survey/computations/upload`
3. Select the approved planning plan
4. Upload parent parcel and compute geometries
5. Submit for Surveyor-General review
6. Log in as **Surveyor-General** user
7. Navigate to `/survey/approval`
8. Review and seal the survey
9. **Verify:**
   - Survey status changes to `sealed`
   - Workflow event is created:
     ```sql
     SELECT * FROM apr.workflow_events 
     WHERE trigger_type = 'survey_sealed' 
     ORDER BY triggered_at DESC LIMIT 1;
     ```
   - Event status is `processed`
   - Event metadata contains survey details

**Expected Result:**
- Workflow event logged with `from_module='survey'`, `to_module='deeds'`
- Deeds module can now access the sealed survey
- Survey is frozen and immutable

**Check Workflow Events:**
```bash
curl http://localhost:3000/api/workflows/events?entityId=<survey_id>&entityType=survey_plan
```

---

### Step 3: Scheme Registration → Title Creation Trigger

**Objective:** Verify that registering a scheme triggers the Title Creation workflow.

**Prerequisites:**
- Step 2 completed (survey sealed)

**Steps:**
1. Log in as a **Deeds Registry Officer** user
2. Navigate to `/deeds/schemes/register`
3. Select the sealed survey
4. Fill in scheme registration details
5. Register the scheme
6. **Verify:**
   - Scheme is registered with a scheme number
   - Workflow event is created:
     ```sql
     SELECT * FROM apr.workflow_events 
     WHERE trigger_type = 'scheme_registered' 
     ORDER BY triggered_at DESC LIMIT 1;
     ```
   - Event status is `processed`
   - Event metadata contains scheme details

**Expected Result:**
- Workflow event logged with `from_module='scheme_registration'`, `to_module='title_creation'`
- Title Creation workflow can now access the registered scheme
- Scheme is available for title creation

**Check Workflow Events:**
```bash
curl http://localhost:3000/api/workflows/events?entityId=<scheme_id>&entityType=sectional_scheme
```

---

### Step 4: Title Registration → Operations Trigger

**Objective:** Verify that registering a title triggers the Operations module workflow.

**Prerequisites:**
- Step 3 completed (scheme registered)
- Title drafted and approved

**Steps:**
1. Log in as a **Conveyancer** user
2. Navigate to `/deeds/titles/draft`
3. Select the registered scheme
4. Draft title and submit for examination
5. Log in as **Deeds Examiner** user
6. Examine and approve the title
7. Log in as **Registrar** user
8. Navigate to `/deeds/registration/register`
9. Register the approved title
10. **Verify:**
    - Title status changes to `registered`
    - Workflow event is created:
      ```sql
      SELECT * FROM apr.workflow_events 
      WHERE trigger_type = 'title_registered' 
      ORDER BY triggered_at DESC LIMIT 1;
      ```
    - Event status is `processed`
    - Event metadata contains title details

**Expected Result:**
- Workflow event logged with `from_module='deeds'`, `to_module='operations'`
- Operations module can now access the registered title
- Title is available for transfers, mortgages, leases, etc.

**Check Workflow Events:**
```bash
curl http://localhost:3000/api/workflows/events?entityId=<title_id>&entityType=sectional_title
```

---

## Monitoring Workflow Events

### Using the Dashboard

1. Navigate to `/admin/workflows`
2. View all workflow events
3. Filter by:
   - Status (pending, processed, failed)
   - Trigger type
   - Entity ID
4. View statistics:
   - Total events
   - Processed events
   - Pending events
   - Failed events

### Using the API

**Get all events for an entity:**
```bash
GET /api/workflows/events?entityId=<id>&entityType=<type>
```

**Get pending events:**
```bash
GET /api/workflows/events?pending=true
```

**Example Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "from_module": "planning",
      "to_module": "survey",
      "entity_id": "plan-id",
      "entity_type": "planning_plan",
      "trigger_type": "planning_approved",
      "triggered_at": "2025-01-XX...",
      "triggered_by": "user-id",
      "status": "processed",
      "processed_at": "2025-01-XX...",
      "metadata": {
        "planId": "...",
        "schemeName": "..."
      }
    }
  ]
}
```

### Using SQL

**Get all workflow events:**
```sql
SELECT * FROM apr.workflow_events 
ORDER BY triggered_at DESC;
```

**Get pending events:**
```sql
SELECT * FROM apr.workflow_events 
WHERE status = 'pending' 
ORDER BY triggered_at ASC;
```

**Get failed events:**
```sql
SELECT * FROM apr.workflow_events 
WHERE status = 'failed' 
ORDER BY triggered_at DESC;
```

**Get events by trigger type:**
```sql
SELECT * FROM apr.workflow_events 
WHERE trigger_type = 'planning_approved' 
ORDER BY triggered_at DESC;
```

---

## Troubleshooting

### Workflow Event Not Created

**Symptoms:**
- Approval/sealing/registration succeeds but no workflow event

**Check:**
1. Verify migration was applied:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'apr' 
     AND table_name = 'workflow_events'
   );
   ```
2. Check application logs for trigger errors
3. Verify trigger service is imported correctly

**Fix:**
- Re-run migration if table doesn't exist
- Check error logs for import/execution errors
- Verify user has proper permissions

### Workflow Event Status is "Failed"

**Symptoms:**
- Workflow event created but status is `failed`

**Check:**
1. Query the event for error details:
   ```sql
   SELECT error, metadata FROM apr.workflow_events 
   WHERE status = 'failed' 
   ORDER BY triggered_at DESC LIMIT 1;
   ```
2. Check entity state matches expected state
3. Verify database constraints

**Fix:**
- Address the error condition
- Retry the trigger manually if needed
- Check entity state requirements

### Workflow Event Status is "Pending"

**Symptoms:**
- Workflow event created but status remains `pending`

**Check:**
1. Verify trigger processing completed:
   ```sql
   SELECT * FROM apr.workflow_events 
   WHERE status = 'pending' 
   ORDER BY triggered_at ASC;
   ```
2. Check if processing function encountered an error
3. Review application logs

**Fix:**
- Check trigger processing logic
- Verify entity state validation
- Review error logs

---

## Test Checklist

### Planning → Survey Trigger
- [ ] Plan approval creates workflow event
- [ ] Plan is locked (`locked = true`)
- [ ] Event status is `processed`
- [ ] Survey module can access approved plan
- [ ] Event metadata contains plan details

### Survey → Deeds Trigger
- [ ] Survey sealing creates workflow event
- [ ] Survey status is `sealed`
- [ ] Event status is `processed`
- [ ] Deeds module can access sealed survey
- [ ] Event metadata contains survey details

### Scheme → Title Creation Trigger
- [ ] Scheme registration creates workflow event
- [ ] Scheme has scheme number
- [ ] Event status is `processed`
- [ ] Title Creation can access registered scheme
- [ ] Event metadata contains scheme details

### Title → Operations Trigger
- [ ] Title registration creates workflow event
- [ ] Title status is `registered`
- [ ] Event status is `processed`
- [ ] Operations module can access registered title
- [ ] Event metadata contains title details

### Monitoring
- [ ] Workflow events dashboard accessible
- [ ] Events can be filtered by status
- [ ] Events can be filtered by trigger type
- [ ] Events can be searched by entity ID
- [ ] Statistics display correctly

---

## Performance Testing

### Load Test

**Test concurrent workflow triggers:**
1. Create multiple planning plans
2. Approve them concurrently
3. Verify all workflow events are created
4. Check for race conditions or deadlocks

**Expected:**
- All events created successfully
- No database deadlocks
- Consistent event status

### Stress Test

**Test high-volume workflow:**
1. Create 100+ planning plans
2. Approve them in batches
3. Monitor workflow event creation rate
4. Check database performance

**Expected:**
- Events created within acceptable time
- Database indexes utilized efficiently
- No performance degradation

---

## Success Criteria

✅ All 4 workflow triggers fire correctly  
✅ Workflow events are logged for audit trail  
✅ Entities are accessible to next modules  
✅ Workflow event dashboard displays correctly  
✅ Error handling works gracefully  
✅ Performance is acceptable under load  

---

## Next Steps After Testing

1. **Monitor Production**
   - Set up alerts for failed workflow events
   - Monitor pending events queue
   - Track workflow performance metrics

2. **Optimize**
   - Review slow queries
   - Optimize indexes if needed
   - Consider batch processing for high volume

3. **Document**
   - Document any issues found
   - Update runbooks with troubleshooting steps
   - Share learnings with team

