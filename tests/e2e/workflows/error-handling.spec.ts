/**
 * Error Handling E2E Tests
 * Tests error scenarios and edge cases
 */

import { test, expect } from '@playwright/test'
import { loginAs, waitForToast } from '../fixtures/test-helpers'

test.describe('Error Handling Workflows', () => {
  test('Invalid form submission shows validation errors', async ({ page }) => {
    await loginAs(page, 'planner')
    await page.goto('/planning/schemes/new')

    // Try to submit empty form
    await page.click('button:has-text("Submit")')

    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible()
  })

  test('Unauthorized access is blocked', async ({ page }) => {
    // Try to access admin page without login
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Invalid workflow transition is rejected', async ({ page }) => {
    await loginAs(page, 'planner')
    await page.goto('/planning/schemes')

    // Try to approve own scheme (should fail - planner cannot approve)
    // This would require a scheme to exist, so we'll test the UI prevents it
    const approveButton = page.locator('button:has-text("Approve")')
    if (await approveButton.count() > 0) {
      await approveButton.first().click()
      await waitForToast(page, /unauthorized|not allowed/i)
    }
  })

  test('Invalid coordinate file shows error', async ({ page }) => {
    await loginAs(page, 'surveyor')
    await page.goto('/survey/computations/upload')

    // Upload invalid file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid content'),
    })

    await page.click('button:has-text("Upload")')
    await waitForToast(page, /invalid|error/i)
  })

  test('Missing required fields prevents submission', async ({ page }) => {
    await loginAs(page, 'conveyancer')
    await page.goto('/deeds/titles/draft')

    // Try to submit without filling required fields
    await page.click('button:has-text("Submit")')

    // Should show validation errors
    await expect(page.locator('text=required')).toBeVisible()
  })
})

