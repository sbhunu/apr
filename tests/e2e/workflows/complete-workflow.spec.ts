/**
 * Complete Workflow E2E Test
 * Tests the full workflow from planning submission to certificate issuance
 */

import { test, expect } from '@playwright/test'
import { loginAs, waitForAPIResponse, waitForLoading } from '../fixtures/test-helpers'
import { testSchemes, testUsers } from '../fixtures/test-data'
import { createTestScheme, waitForWorkflowState, cleanupTestData } from '../fixtures/database-helpers'

test.describe('Complete Workflow: Planning to Certificate', () => {
  let schemeId: string | null = null

  test.beforeEach(async ({ page }) => {
    // Clean up any existing test data
    await cleanupTestData('test_')
  })

  test.afterEach(async () => {
    // Clean up test data after each test
    if (schemeId) {
      await cleanupTestData('test_')
    }
  })

  test('Complete workflow from planning to certificate issuance', async ({ page }) => {
    const testScheme = testSchemes[0]

    // Step 1: Planner submits scheme
    await test.step('Planner submits scheme', async () => {
      await loginAs(page, 'planner')
      await page.goto('/planning/schemes/new')

      // Fill scheme form
      await page.fill('input[name="schemeName"]', `test_${testScheme.schemeName}`)
      await page.fill('input[name="location"]', testScheme.location)
      await page.fill('textarea[name="description"]', testScheme.description || '')

      // Submit form
      const submitResponse = waitForAPIResponse(page, '/api/planning/schemes')
      await page.click('button:has-text("Submit")')
      await submitResponse

      // Verify submission success
      await expect(page.locator('text=Scheme submitted successfully')).toBeVisible()

      // Get scheme ID from URL or response
      const url = page.url()
      const match = url.match(/schemes\/([^/]+)/)
      if (match) {
        schemeId = match[1]
      }
    })

    // Step 2: Planning Authority reviews and approves
    await test.step('Planning Authority approves scheme', async () => {
      await loginAs(page, 'planningAuthority')
      await page.goto('/planning/review')

      // Find and click on the test scheme
      await page.click(`text=test_${testScheme.schemeName}`)

      // Complete review checklist
      const checkboxes = page.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check()
      }

      // Add review notes
      await page.fill('textarea[name="reviewNotes"]', 'Test approval notes')

      // Approve scheme
      const approveResponse = waitForAPIResponse(page, '/api/planning/review/submit')
      await page.click('button:has-text("Approve")')
      await approveResponse

      // Verify approval
      await expect(page.locator('text=Scheme approved')).toBeVisible()

      // Wait for workflow state to update
      if (schemeId) {
        const approved = await waitForWorkflowState(schemeId, 'planning', 'approved', 30000)
        expect(approved).toBe(true)
      }
    })

    // Step 3: Surveyor uploads coordinates and computes survey
    await test.step('Surveyor uploads coordinates and computes survey', async () => {
      await loginAs(page, 'surveyor')
      await page.goto('/survey/computations/upload')

      // Select approved scheme
      await page.selectOption('select[name="schemeId"]', schemeId || '')

      // Upload coordinate file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'coordinates.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(`x,y\n300000,8000000\n300100,8000000\n300100,8000100\n300000,8000100\n300000,8000000`),
      })

      // Submit coordinates
      const uploadResponse = waitForAPIResponse(page, '/api/survey/parent-parcel/upload')
      await page.click('button:has-text("Upload")')
      await uploadResponse

      // Execute computation
      const computeResponse = waitForAPIResponse(page, '/api/survey/computation/execute')
      await page.click('button:has-text("Compute")')
      await computeResponse

      // Verify computation success
      await expect(page.locator('text=Computation completed')).toBeVisible()
    })

    // Step 4: Surveyor-General reviews and seals survey
    await test.step('Surveyor-General seals survey', async () => {
      await loginAs(page, 'surveyorGeneral')
      await page.goto('/survey/approval')

      // Find and review survey
      await page.click('text=test_')

      // Complete compliance checklist
      const checkboxes = page.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check()
      }

      // Seal survey
      const sealResponse = waitForAPIResponse(page, '/api/survey/review/decision')
      await page.click('button:has-text("Seal")')
      await sealResponse

      // Verify sealing
      await expect(page.locator('text=Survey sealed')).toBeVisible()
    })

    // Step 5: Conveyancer drafts deeds
    await test.step('Conveyancer drafts deeds', async () => {
      await loginAs(page, 'conveyancer')
      await page.goto('/deeds/titles/draft')

      // Select sealed survey
      await page.selectOption('select[name="surveyId"]', schemeId || '')

      // Fill legal description
      await page.fill('textarea[name="legalDescription"]', 'Test legal description')

      // Fill holder information
      await page.fill('input[name="holderName"]', 'Test Holder')
      await page.selectOption('select[name="holderType"]', 'individual')
      await page.fill('input[name="holderIdNumber"]', '123456789X')

      // Save draft
      const saveResponse = waitForAPIResponse(page, '/api/deeds/titles')
      await page.click('button:has-text("Save Draft")')
      await saveResponse

      // Submit for examination
      const submitResponse = waitForAPIResponse(page, '/api/deeds/titles/submit')
      await page.click('button:has-text("Submit")')
      await submitResponse
    })

    // Step 6: Deeds Examiner examines and approves
    await test.step('Deeds Examiner approves deeds', async () => {
      await loginAs(page, 'deedsExaminer')
      await page.goto('/deeds/examination')

      // Find and examine title
      await page.click('text=Test Holder')

      // Complete examination checklist
      const checkboxes = page.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check()
      }

      // Approve
      const approveResponse = waitForAPIResponse(page, '/api/deeds/examination/approve')
      await page.click('button:has-text("Approve")')
      await approveResponse
    })

    // Step 7: Registrar registers title and generates certificate
    await test.step('Registrar registers title', async () => {
      await loginAs(page, 'registrar')
      await page.goto('/deeds/registration')

      // Find and register title
      await page.click('text=Test Holder')

      // Register title
      const registerResponse = waitForAPIResponse(page, '/api/deeds/registration/register')
      await page.click('button:has-text("Register")')
      await registerResponse

      // Verify registration and certificate generation
      await expect(page.locator('text=Title registered')).toBeVisible()
      await expect(page.locator('text=Certificate generated')).toBeVisible()
    })

    // Step 8: Verify certificate in public portal
    await test.step('Verify certificate in public portal', async () => {
      await page.goto('/verify')

      // Get certificate number from previous step (would need to extract from page)
      // For now, we'll test the verification page loads
      await expect(page.locator('text=Certificate Verification Portal')).toBeVisible()
      await expect(page.locator('input[placeholder*="certificate number"]')).toBeVisible()
    })
  })
})

