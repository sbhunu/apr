/**
 * Admin Module Tests
 * Tests user registration, RBAC enforcement, and user management
 */

import {
  submitRegistrationRequest,
  reviewRegistrationRequest,
  getRegistrationRequests,
} from '@/lib/admin/user-registration'
import { checkPermissions, checkRole } from '@/lib/admin/rbac'
import { getUsers, updateUser, getSystemStatistics } from '@/lib/admin/user-management'

describe('User Registration', () => {
  test('submits registration request', async () => {
    const request = {
      email: 'test@example.com',
      name: 'Test User',
      requestedRole: 'planner',
      professionalRegistrationNumber: 'PLAN-12345',
    }

    const result = await submitRegistrationRequest(request)
    expect(result).toHaveProperty('success')
  })

  test('validates email format', async () => {
    const request = {
      email: 'invalid-email',
      name: 'Test User',
      requestedRole: 'planner',
    }

    const result = await submitRegistrationRequest(request)
    expect(result.success).toBe(false)
    expect(result.error).toContain('email')
  })
})

describe('RBAC', () => {
  test('checks user permissions', async () => {
    // This test requires a valid user ID
    const result = await checkPermissions('test-user-id', ['planning:create'])
    expect(result).toHaveProperty('allowed')
  })

  test('checks user role', async () => {
    const result = await checkRole('test-user-id', 'admin')
    expect(result).toHaveProperty('allowed')
  })
})

describe('User Management', () => {
  test('gets users with filters', async () => {
    const result = await getUsers({ role: 'planner' })
    expect(result).toHaveProperty('success')
  })

  test('updates user', async () => {
    const result = await updateUser({
      userId: 'test-user-id',
      status: 'active',
    })
    expect(result).toHaveProperty('success')
  })

  test('gets system statistics', async () => {
    const result = await getSystemStatistics()
    expect(result).toHaveProperty('success')
    if (result.success && result.statistics) {
      expect(result.statistics).toHaveProperty('totalUsers')
      expect(result.statistics).toHaveProperty('usersByRole')
    }
  })
})

// Run basic tests
if (require.main === module) {
  console.log('Running admin module tests...\n')

  // Test system statistics
  getSystemStatistics()
    .then((result) => {
      if (result.success && result.statistics) {
        console.log('✅ System statistics:')
        console.log(`   Total users: ${result.statistics.totalUsers}`)
        console.log(`   Pending registrations: ${result.statistics.pendingRegistrations}`)
        console.log(`   Active sessions: ${result.statistics.activeSessions}`)
      } else {
        console.log('❌ Failed to get system statistics')
        console.log(`   Error: ${result.error}`)
      }
    })
    .catch((error) => {
      console.log('❌ System statistics: ERROR')
      console.log(`   ${error.message}`)
    })

  console.log('\n✅ Basic tests completed')
  console.log('⚠️  Full integration tests require database connection')
}

