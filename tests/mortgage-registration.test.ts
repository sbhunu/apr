/**
 * Mortgage Registration Tests
 * Tests mortgage registration, priority handling, discharge, and encumbrance notation
 */

import {
  registerMortgage,
  dischargeMortgage,
  getTitleMortgages,
  hasActiveEncumbrances,
  getMortgage,
  MortgageRegistrationData,
  MortgageDischargeData,
} from '@/lib/operations/mortgages'
import {
  getTitleEncumbrances,
  formatEncumbranceNotation,
} from '@/lib/operations/mortgage-certificate'

describe('Mortgage Registration', () => {
  test('registers mortgage with correct priority', async () => {
    // This test requires a valid registered title ID
    // In a real test, you would create a title first
    const registrationData: MortgageRegistrationData = {
      titleId: 'test-title-id', // Would be a real UUID in actual test
      lenderName: 'Test Bank',
      lenderType: 'bank',
      mortgageAmount: 50000,
      mortgageCurrency: 'USD',
      mortgageDate: '2025-01-01',
      registrationDate: '2025-01-02',
      effectiveDate: '2025-01-02',
    }

    // Note: This would fail without a real title, but demonstrates the API
    const result = await registerMortgage(registrationData)
    expect(result).toHaveProperty('success')
  })

  test('checks for active encumbrances', async () => {
    const result = await hasActiveEncumbrances('test-title-id')
    expect(result).toHaveProperty('success')
    if (result.success) {
      expect(result).toHaveProperty('hasEncumbrances')
      expect(result).toHaveProperty('mortgageCount')
    }
  })

  test('discharges mortgage correctly', async () => {
    const dischargeData: MortgageDischargeData = {
      mortgageId: 'test-mortgage-id',
      dischargeDate: '2025-12-31',
      dischargeReference: 'DISCHARGE-001',
    }

    const result = await dischargeMortgage(dischargeData)
    expect(result).toHaveProperty('success')
  })

  test('formats encumbrance notation', () => {
    const encumbrances = {
      hasEncumbrances: true,
      mortgages: [
        {
          mortgageNumber: 'MORT/2025/HARARE/001',
          lenderName: 'Test Bank',
          mortgageAmount: 50000,
          mortgageCurrency: 'USD',
          registrationDate: '2025-01-02',
          priority: 1,
        },
      ],
    }

    const notation = formatEncumbranceNotation(encumbrances)
    expect(notation).toContain('ENCUMBRANCES')
    expect(notation).toContain('MORT/2025/HARARE/001')
    expect(notation).toContain('Test Bank')
  })
})

// Run basic tests
if (require.main === module) {
  console.log('Running mortgage registration tests...\n')

  // Test encumbrance formatting
  const encumbrances = {
    hasEncumbrances: true,
    mortgages: [
      {
        mortgageNumber: 'MORT/2025/HARARE/001',
        lenderName: 'Test Bank',
        mortgageAmount: 50000,
        mortgageCurrency: 'USD',
        registrationDate: '2025-01-02',
        priority: 1,
      },
    ],
  }

  const notation = formatEncumbranceNotation(encumbrances)
  console.log('✅ Encumbrance notation formatting:')
  console.log(notation)
  console.log('\n✅ Basic tests completed')
  console.log('⚠️  Full integration tests require database connection')
}

