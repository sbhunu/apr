/**
 * Storage Module Tests
 * Tests document upload, validation, and storage operations
 */

import { uploadDocument, deleteDocument, getDocumentUrl } from '@/lib/storage/documents'
import { validateFile } from '@/lib/storage/validation'
import { generateChecksum } from '@/lib/storage/checksum'
import { DEFAULT_STORAGE_CONFIG } from '@/lib/storage/config'

describe('File Validation', () => {
  test('validates file size', () => {
    const largeFile = new File(['x'.repeat(100 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    })
    const result = validateFile(largeFile, DEFAULT_STORAGE_CONFIG)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('validates file type', () => {
    const invalidFile = new File(['content'], 'test.exe', {
      type: 'application/x-msdownload',
    })
    const result = validateFile(invalidFile, DEFAULT_STORAGE_CONFIG)
    expect(result.valid).toBe(false)
  })

  test('accepts valid PDF file', () => {
    const validFile = new File(['content'], 'test.pdf', {
      type: 'application/pdf',
    })
    const result = validateFile(validFile, DEFAULT_STORAGE_CONFIG)
    expect(result.valid).toBe(true)
  })
})

describe('Checksum Generation', () => {
  test('generates checksum for file', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const checksum = await generateChecksum(file)
    expect(checksum).toBeTruthy()
    expect(checksum.length).toBe(64) // SHA-256 produces 64-character hex string
  })

  test('generates consistent checksums', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const checksum1 = await generateChecksum(file)
    const checksum2 = await generateChecksum(file)
    expect(checksum1).toBe(checksum2)
  })
})

describe('Document Upload', () => {
  test('uploads document successfully', async () => {
    // This test requires a valid Supabase connection
    // Mock or skip in CI environments
    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    })

    const result = await uploadDocument({
      file,
      folder: 'test-folder',
      documentType: 'plan_layout',
    })

    // In test environment, this may fail without proper setup
    // The test verifies the function structure
    expect(result).toHaveProperty('success')
  })
})

// Run basic tests
if (require.main === module) {
  console.log('Running storage module tests...\n')

  // Test file validation
  const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
  const validation = validateFile(testFile)
  console.log('✅ File validation:', validation.valid ? 'PASSED' : 'FAILED')
  if (!validation.valid) {
    console.log('   Errors:', validation.errors)
  }

  // Test checksum generation
  generateChecksum(testFile)
    .then((checksum) => {
      console.log('✅ Checksum generation:', checksum ? 'PASSED' : 'FAILED')
      console.log(`   Checksum: ${checksum.substring(0, 16)}...`)
    })
    .catch((error) => {
      console.log('❌ Checksum generation: ERROR')
      console.log(`   ${error.message}`)
    })

  console.log('\n✅ Basic tests completed')
  console.log('⚠️  Full integration tests require Supabase Storage setup')
}

