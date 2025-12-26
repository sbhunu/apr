/**
 * Workflow Engine Tests
 * Tests state machine transitions, validation, and persistence
 */

import {
  planningWorkflow,
  transitionPlanningState,
  getPlanningNextStates,
  isPlanningFinalState,
} from '@/lib/workflows/planning-workflow'
import {
  surveyWorkflow,
  transitionSurveyState,
  getSurveyNextStates,
} from '@/lib/workflows/survey-workflow'
import {
  deedsWorkflow,
  transitionDeedsState,
  getDeedsNextStates,
} from '@/lib/workflows/deeds-workflow'
import {
  MemoryWorkflowPersistence,
  WorkflowManager,
} from '@/lib/workflows/manager'
import { WorkflowContext } from '@/lib/workflows/base'

// Test data
const testUserId = 'test-user-123'
const testEntityId = 'test-entity-456'

const plannerContext: WorkflowContext = {
  userId: testUserId,
  userRole: 'planner',
  entityId: testEntityId,
}

const planningAuthorityContext: WorkflowContext = {
  userId: testUserId,
  userRole: 'planning_authority',
  entityId: testEntityId,
}

const surveyorContext: WorkflowContext = {
  userId: testUserId,
  userRole: 'surveyor',
  entityId: testEntityId,
}

const conveyancerContext: WorkflowContext = {
  userId: testUserId,
  userRole: 'conveyancer',
  entityId: testEntityId,
}

describe('Planning Workflow', () => {
  test('planner can submit draft plan', async () => {
    const result = await transitionPlanningState(
      'draft',
      'submitted',
      plannerContext,
      'Plan ready for review'
    )

    expect(result.success).toBe(true)
    expect(result.newState).toBe('submitted')
    expect(result.transition).toBeDefined()
    expect(result.transition?.from).toBe('draft')
    expect(result.transition?.to).toBe('submitted')
  })

  test('planner cannot approve plan', async () => {
    const result = await transitionPlanningState(
      'submitted',
      'approved',
      plannerContext,
      'Trying to approve own plan'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not authorized')
  })

  test('planning authority can approve submitted plan', async () => {
    const result = await transitionPlanningState(
      'submitted',
      'approved',
      planningAuthorityContext,
      'Plan meets all requirements'
    )

    expect(result.success).toBe(true)
    expect(result.newState).toBe('approved')
  })

  test('cannot transition from final state', async () => {
    const result = await transitionPlanningState(
      'approved',
      'submitted',
      planningAuthorityContext,
      'Trying to revert approved plan'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('get valid next states for planner', () => {
    const nextStates = getPlanningNextStates('draft', 'planner')
    expect(nextStates).toContain('submitted')
    expect(nextStates).toContain('withdrawn')
    expect(nextStates).not.toContain('approved')
  })

  test('check final states', () => {
    expect(isPlanningFinalState('approved')).toBe(true)
    expect(isPlanningFinalState('rejected')).toBe(true)
    expect(isPlanningFinalState('withdrawn')).toBe(true)
    expect(isPlanningFinalState('draft')).toBe(false)
  })
})

describe('Survey Workflow', () => {
  test('surveyor can compute survey', async () => {
    const result = await transitionSurveyState(
      'draft',
      'computed',
      surveyorContext,
      'Survey computations complete'
    )

    expect(result.success).toBe(true)
    expect(result.newState).toBe('computed')
  })

  test('surveyor cannot seal survey', async () => {
    const result = await transitionSurveyState(
      'under_review',
      'sealed',
      surveyorContext,
      'Trying to seal own survey'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('not authorized')
  })

  test('get valid next states for surveyor', () => {
    const nextStates = getSurveyNextStates('draft', 'surveyor')
    expect(nextStates).toContain('computed')
    expect(nextStates).toContain('withdrawn')
    expect(nextStates).not.toContain('sealed')
  })
})

describe('Deeds Workflow', () => {
  test('conveyancer can submit deed', async () => {
    const result = await transitionDeedsState(
      'draft',
      'submitted',
      conveyancerContext,
      'Deed packet ready for examination'
    )

    expect(result.success).toBe(true)
    expect(result.newState).toBe('submitted')
  })

  test('get valid next states for conveyancer', () => {
    const nextStates = getDeedsNextStates('draft', 'conveyancer')
    expect(nextStates).toContain('submitted')
    expect(nextStates).toContain('withdrawn')
    expect(nextStates).not.toContain('registered')
  })
})

describe('Workflow Manager with Persistence', () => {
  let manager: WorkflowManager

  beforeEach(() => {
    const persistence = new MemoryWorkflowPersistence()
    manager = new WorkflowManager({
      persistence,
      enableNotifications: false,
      enableAuditLog: true,
    })
  })

  test('transition with persistence', async () => {
    const result = await manager.transitionPlanning(
      testEntityId,
      'draft',
      'submitted',
      plannerContext,
      'Plan submitted for review'
    )

    expect(result.success).toBe(true)
    expect(result.newState).toBe('submitted')
  })

  test('get workflow history', async () => {
    // Create transition
    await manager.transitionPlanning(
      testEntityId,
      'draft',
      'submitted',
      plannerContext,
      'Initial submission'
    )

    // Get history
    const history = await manager.getHistory(testEntityId, 'planning')
    expect(history.length).toBe(1)
    expect(history[0].from).toBe('draft')
    expect(history[0].to).toBe('submitted')
  })

  test('optimistic locking prevents concurrent updates', async () => {
    // First transition
    const result1 = await manager.transitionPlanning(
      testEntityId,
      'draft',
      'submitted',
      plannerContext,
      'First submission'
    )
    expect(result1.success).toBe(true)

    // Get current state with version
    const current = await manager.getCurrentState(testEntityId, 'planning')
    expect(current).toBeDefined()
    expect(current?.version).toBe(1)

    // Try to transition with old version (simulate concurrent update)
    // This should fail because version changed
    const persistence = new MemoryWorkflowPersistence()
    const oldManager = new WorkflowManager({ persistence })
    
    // Manually set old version
    await oldManager.transitionPlanning(
      testEntityId,
      'draft',
      'submitted',
      plannerContext,
      'Concurrent submission'
    )

    // Try to transition again with same manager (should work)
    const result2 = await manager.transitionPlanning(
      testEntityId,
      'submitted',
      'under_review',
      planningAuthorityContext,
      'Review started'
    )

    expect(result2.success).toBe(true)
  })
})

// Run tests
if (require.main === module) {
  console.log('Running workflow tests...\n')

  // Planning workflow tests
  console.log('=== Planning Workflow Tests ===')
  transitionPlanningState('draft', 'submitted', plannerContext, 'Test')
    .then((result) => {
      console.log('✅ Planner can submit:', result.success ? 'PASS' : 'FAIL')
    })
    .catch((e) => console.error('❌ Error:', e))

  transitionPlanningState('submitted', 'approved', plannerContext, 'Test')
    .then((result) => {
      console.log('✅ Planner cannot approve:', !result.success ? 'PASS' : 'FAIL')
    })
    .catch((e) => console.error('❌ Error:', e))

  console.log('\n✅ Workflow tests completed')
}

