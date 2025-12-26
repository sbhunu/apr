/**
 * Document Template Tests
 * Tests template rendering, placeholder replacement, and PDF generation
 */

import {
  CertificateTemplate,
  SchemePlanTemplate,
  templateManager,
} from '@/lib/documents'
import { CertificateData, SchemePlanData } from '@/lib/documents/types'

describe('Certificate Template', () => {
  test('validates required placeholders', () => {
    const template = new CertificateTemplate()
    const validation = template.validateData({})

    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
  })

  test('validates complete certificate data', () => {
    const template = new CertificateTemplate()
    const data: Partial<CertificateData> = {
      titleNumber: 'T/2025/HARARE/001',
      schemeName: 'Test Scheme',
      schemeNumber: 'SS/2025/HARARE/001',
      sectionNumber: 'Section 1',
      holderName: 'John Doe',
      registrationDate: '2025-01-01',
      area: 100.5,
      participationQuota: 33.3333,
      verificationUrl: 'https://example.com/verify/123',
    }

    const validation = template.validateData(data as Record<string, unknown>)
    expect(validation.valid).toBe(true)
  })

  test('renders certificate PDF', async () => {
    const template = new CertificateTemplate()
    const data: CertificateData = {
      titleNumber: 'T/2025/HARARE/001',
      schemeName: 'Test Scheme',
      schemeNumber: 'SS/2025/HARARE/001',
      sectionNumber: 'Section 1',
      holderName: 'John Doe',
      registrationDate: '2025-01-01',
      area: 100.5,
      participationQuota: 33.3333,
      verificationUrl: 'https://example.com/verify/123',
    }

    const pdfBuffer = await template.render(data as Record<string, unknown>)
    expect(pdfBuffer).toBeInstanceOf(Uint8Array)
    expect(pdfBuffer.length).toBeGreaterThan(0)
  })
})

describe('Scheme Plan Template', () => {
  test('validates required placeholders', () => {
    const template = new SchemePlanTemplate()
    const validation = template.validateData({})

    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
  })

  test('renders scheme plan PDF', async () => {
    const template = new SchemePlanTemplate()
    const data: SchemePlanData = {
      schemeNumber: 'SS/2025/HARARE/001',
      schemeName: 'Test Scheme',
      location: 'Harare',
      registrationDate: '2025-01-01',
      surveyNumber: 'SURVEY-2025-001',
      sections: [
        { sectionNumber: 'Section 1', area: 100.5, quota: 33.3333 },
        { sectionNumber: 'Section 2', area: 100.5, quota: 33.3333 },
        { sectionNumber: 'Section 3', area: 100.5, quota: 33.3333 },
      ],
      totalArea: 301.5,
      commonArea: 50.0,
    }

    const pdfBuffer = await template.render(data as Record<string, unknown>)
    expect(pdfBuffer).toBeInstanceOf(Uint8Array)
    expect(pdfBuffer.length).toBeGreaterThan(0)
  })
})

describe('Template Manager', () => {
  test('initializes with default templates', () => {
    templateManager.initialize()
    const templates = templateManager.listTemplates()
    expect(templates.length).toBeGreaterThan(0)
  })

  test('finds certificate template', () => {
    templateManager.initialize()
    const template = templateManager.getTemplate(
      'certificate-sectional-title',
      'certificate'
    )
    expect(template).not.toBeNull()
    expect(template?.getMetadata().type).toBe('certificate')
  })

  test('finds scheme plan template', () => {
    templateManager.initialize()
    const template = templateManager.getTemplate('scheme-plan', 'scheme_plan')
    expect(template).not.toBeNull()
    expect(template?.getMetadata().type).toBe('scheme_plan')
  })
})

// Run basic tests
if (require.main === module) {
  console.log('Running document template tests...\n')

  // Test certificate template
  const certTemplate = new CertificateTemplate()
  console.log('✅ Certificate template created')

  const certValidation = certTemplate.validateData({
    titleNumber: 'T/2025/HARARE/001',
    schemeName: 'Test',
    schemeNumber: 'SS/2025/HARARE/001',
    sectionNumber: 'Section 1',
    holderName: 'John Doe',
    registrationDate: '2025-01-01',
    area: 100,
    participationQuota: 33.33,
    verificationUrl: 'https://example.com',
  })
  console.log('✅ Certificate validation:', certValidation.valid ? 'PASS' : 'FAIL')

  // Test scheme plan template
  const planTemplate = new SchemePlanTemplate()
  console.log('✅ Scheme plan template created')

  console.log('\n✅ Basic tests completed')
  console.log('⚠️  PDF generation tests require full rendering')
}

