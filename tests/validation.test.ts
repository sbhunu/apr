/**
 * Validation Engine Tests
 * Tests schema validation, business rules, and error formatting
 */

import {
  validateSchema,
  safeParseSchema,
  formatValidationErrors,
  schemeNameSchema,
  areaSchema,
  participationQuotaSchema,
  sectionSchema,
  validateQuotaSum,
  validateAreaConsistency,
  validateSchemeNaming,
  validateLegalDescription,
  validateCrossFieldConsistency,
  SectionData,
} from '@/lib/validation'

describe('Schema Validators', () => {
  test('validates scheme name correctly', () => {
    const valid = safeParseSchema(schemeNameSchema, 'Test Scheme Name')
    expect(valid.success).toBe(true)

    const invalid = safeParseSchema(schemeNameSchema, '')
    expect(invalid.success).toBe(false)
    expect(invalid.errors?.length).toBeGreaterThan(0)
  })

  test('validates area correctly', () => {
    const valid = safeParseSchema(areaSchema, 100.5)
    expect(valid.success).toBe(true)

    const invalid1 = safeParseSchema(areaSchema, -10)
    expect(invalid1.success).toBe(false)

    const invalid2 = safeParseSchema(areaSchema, 0)
    expect(invalid2.success).toBe(false)
  })

  test('validates participation quota correctly', () => {
    const valid = safeParseSchema(participationQuotaSchema, 33.3333)
    expect(valid.success).toBe(true)

    const invalid1 = safeParseSchema(participationQuotaSchema, 101)
    expect(invalid1.success).toBe(false)

    const invalid2 = safeParseSchema(participationQuotaSchema, -1)
    expect(invalid2.success).toBe(false)
  })

  test('validates section schema', () => {
    const validSection = {
      section_number: 'Section 1',
      area: 100.5,
      participation_quota: 33.3333,
    }

    const result = safeParseSchema(sectionSchema, validSection)
    expect(result.success).toBe(true)
  })
})

describe('Business Rules', () => {
  test('validates quota sum to 100%', () => {
    const sections: SectionData[] = [
      { sectionNumber: 'Section 1', area: 100, participationQuota: 33.3333 },
      { sectionNumber: 'Section 2', area: 100, participationQuota: 33.3333 },
      { sectionNumber: 'Section 3', area: 100, participationQuota: 33.3334 },
    ]

    const result = validateQuotaSum(sections)
    expect(result.valid).toBe(true)
  })

  test('rejects quotas that do not sum to 100%', () => {
    const sections: SectionData[] = [
      { sectionNumber: 'Section 1', area: 100, participationQuota: 50 },
      { sectionNumber: 'Section 2', area: 100, participationQuota: 30 },
    ]

    const result = validateQuotaSum(sections)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('validates area consistency', () => {
    const result = validateAreaConsistency(300, 50, 350)
    expect(result.valid).toBe(true)
  })

  test('rejects inconsistent areas', () => {
    const result = validateAreaConsistency(300, 50, 400)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('validates scheme naming', () => {
    const result1 = validateSchemeNaming('Harare Central Scheme')
    expect(result1.valid).toBe(true)

    const result2 = validateSchemeNaming('AB')
    expect(result2.valid).toBe(false)
  })

  test('validates legal description', () => {
    const valid = validateLegalDescription(
      'Section 1 of the Harare Central Scheme, being Unit 1 on the ground floor.'
    )
    expect(valid.valid).toBe(true)

    const invalid = validateLegalDescription('Short')
    expect(invalid.valid).toBe(false)
  })

  test('validates cross-field consistency', () => {
    const data = {
      sections: [
        { sectionNumber: 'Section 1', area: 100, participationQuota: 33.3333 },
        { sectionNumber: 'Section 2', area: 100, participationQuota: 33.3333 },
        { sectionNumber: 'Section 3', area: 100, participationQuota: 33.3334 },
      ],
      totalArea: 300,
      commonArea: 50,
      parentParcelArea: 350,
    }

    const result = validateCrossFieldConsistency(data)
    expect(result.valid).toBe(true)
  })
})

describe('Error Formatting', () => {
  test('formats validation errors for UI', () => {
    const result = safeParseSchema(areaSchema, -10)
    if (!result.success && result.errors) {
      const formatted = formatValidationErrors(result.errors)
      expect(formatted.length).toBeGreaterThan(0)
      expect(formatted[0]).toHaveProperty('field')
      expect(formatted[0]).toHaveProperty('message')
    }
  })
})

// Run basic tests
if (require.main === module) {
  console.log('Running validation tests...\n')

  // Test quota validation
  const sections: SectionData[] = [
    { sectionNumber: 'Section 1', area: 100, participationQuota: 33.3333 },
    { sectionNumber: 'Section 2', area: 100, participationQuota: 33.3333 },
    { sectionNumber: 'Section 3', area: 100, participationQuota: 33.3334 },
  ]

  const quotaResult = validateQuotaSum(sections)
  console.log('✅ Quota validation:', quotaResult.valid ? 'PASS' : 'FAIL')

  // Test area consistency
  const areaResult = validateAreaConsistency(300, 50, 350)
  console.log('✅ Area consistency:', areaResult.valid ? 'PASS' : 'FAIL')

  // Test scheme naming
  const namingResult = validateSchemeNaming('Test Scheme')
  console.log('✅ Scheme naming:', namingResult.valid ? 'PASS' : 'FAIL')

  console.log('\n✅ Validation tests completed')
}

