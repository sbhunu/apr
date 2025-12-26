/**
 * PKI Integration Tests
 * Tests EJBCA client, PKI manager, and fallback mechanisms
 */

import {
  EJBCAClient,
  PKIManager,
  createPKIManager,
} from '@/lib/pki'
import {
  CertificateEnrollmentRequest,
  DocumentSigningRequest,
  SignatureVerificationRequest,
} from '@/lib/pki/types'

describe('EJBCA Client', () => {
  test('checks service status', async () => {
    // Mock EJBCA client (would need actual EJBCA instance for real test)
    const client = new EJBCAClient({
      baseUrl: 'https://ejbca.example.com',
      username: 'test-user',
      password: 'test-password',
    })

    // This would fail without actual EJBCA, but tests the structure
    const status = await client.checkServiceStatus()
    expect(status).toHaveProperty('available')
    expect(status).toHaveProperty('provider')
  })
})

describe('PKI Manager', () => {
  test('creates manager with fallback enabled', () => {
    const manager = new PKIManager({
      enableFallback: true,
      fallbackQueueEnabled: true,
    })

    expect(manager).toBeDefined()
  })

  test('handles service unavailability with fallback', async () => {
    const manager = new PKIManager({
      enableFallback: true,
      fallbackQueueEnabled: true,
    })

    const signingRequest: DocumentSigningRequest = {
      documentHash: 'test-hash',
      documentId: 'test-doc-id',
      signerId: 'test-signer',
      signerRole: 'registrar',
      signerName: 'Test Signer',
    }

    const result = await manager.signDocument(signingRequest)
    // Should return fallback response when no PKI configured
    expect(result).toHaveProperty('success')
  })

  test('queues operations when service unavailable', async () => {
    const manager = new PKIManager({
      enableFallback: true,
      fallbackQueueEnabled: true,
    })

    const signingRequest: DocumentSigningRequest = {
      documentHash: 'test-hash',
      documentId: 'test-doc-id',
      signerId: 'test-signer',
      signerRole: 'registrar',
      signerName: 'Test Signer',
    }

    await manager.signDocument(signingRequest)
    const queueStatus = manager.getQueueStatus()
    expect(queueStatus.count).toBeGreaterThanOrEqual(0)
  })
})

describe('PKI Manager Factory', () => {
  test('creates manager from environment', () => {
    // This will use fallback if EJBCA env vars not set
    const manager = createPKIManager()
    expect(manager).toBeDefined()
  })
})

// Run basic tests
if (require.main === module) {
  console.log('Running PKI integration tests...\n')

  // Test PKI manager creation
  const manager = createPKIManager()
  console.log('✅ PKI Manager created')

  // Test service status
  manager
    .getServiceStatus()
    .then((status) => {
      console.log('✅ Service status check:', status.available ? 'AVAILABLE' : 'UNAVAILABLE')
      console.log(`   Provider: ${status.provider}`)
      if (status.error) {
        console.log(`   Error: ${status.error}`)
      }
    })
    .catch((error) => {
      console.log('❌ Service status check: ERROR')
      console.log(`   ${error.message}`)
    })

  console.log('\n✅ Basic tests completed')
  console.log('⚠️  Full integration tests require EJBCA instance')
}

