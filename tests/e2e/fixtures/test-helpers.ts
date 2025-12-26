/**
 * E2E Test Helpers
 * Utility functions for E2E tests
 */

import { Page, expect } from '@playwright/test'
import { testUsers, TestUser } from './test-data'

/**
 * Login as a specific user role
 */
export async function loginAs(page: Page, userRole: keyof typeof testUsers) {
  const user = testUsers[userRole]
  // Navigate to login page (adjust route as needed)
  await page.goto('/login')
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
  // Wait for navigation after login
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
) {
  return page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}

/**
 * Fill form field by label
 */
export async function fillFieldByLabel(page: Page, label: string, value: string) {
  const field = page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea')
  await field.fill(value)
}

/**
 * Select option by label
 */
export async function selectOptionByLabel(page: Page, label: string, option: string) {
  const select = page.locator(`label:has-text("${label}")`).locator('..').locator('select')
  await select.selectOption(option)
}

/**
 * Click button by text
 */
export async function clickButtonByText(page: Page, text: string) {
  await page.click(`button:has-text("${text}")`)
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, message?: string, timeout: number = 5000) {
  const toast = page.locator('[role="alert"], .toast, [data-toast]')
  if (message) {
    await expect(toast.filter({ hasText: message })).toBeVisible({ timeout })
  } else {
    await expect(toast.first()).toBeVisible({ timeout })
  }
}

/**
 * Upload file
 */
export async function uploadFile(page: Page, inputSelector: string, filePath: string) {
  const fileInput = page.locator(inputSelector)
  await fileInput.setInputFiles(filePath)
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page) {
  await page.waitForLoadState('networkidle')
  // Wait for any loading spinners to disappear
  await page.waitForSelector('[data-loading="true"]', { state: 'hidden' }).catch(() => {})
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector)
  await element.waitFor({ state: 'visible' })
  return (await element.textContent()) || ''
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout: 1000 })
    return true
  } catch {
    return false
  }
}

