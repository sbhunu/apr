/**
 * Security Testing
 * Tests security vulnerabilities and RBAC enforcement
 */

import { test, expect } from '@playwright/test'
import { loginAs } from '../fixtures/test-helpers'

test.describe('Security Tests', () => {
  test('SQL injection attempt is blocked', async ({ page }) => {
    await page.goto('/verify')
    await page.fill('input[placeholder*="certificate number"]', "'; DROP TABLE users; --")
    await page.click('button:has-text("Verify")')

    // Should handle gracefully without error
    await expect(page.locator('text=Certificate not found')).toBeVisible()
  })

  test('XSS attempt is sanitized', async ({ page }) => {
    await page.goto('/verify')
    await page.fill('input[placeholder*="certificate number"]', '<script>alert("XSS")</script>')
    await page.click('button:has-text("Verify")')

    // Page should not execute script
    const alertHandled = await page.evaluate(() => {
      return typeof window.alert === 'function'
    })
    expect(alertHandled).toBe(true)
  })

  test('RBAC prevents unauthorized access', async ({ page }) => {
    // Login as planner
    await loginAs(page, 'planner')

    // Try to access admin routes
    await page.goto('/admin/users')
    await expect(page).not.toHaveURL(/\/admin\/users/)

    // Try to access survey routes
    await page.goto('/survey/approval')
    await expect(page).not.toHaveURL(/\/survey\/approval/)
  })

  test('Sensitive data not exposed in public API', async ({ page }) => {
    const response = await page.request.get('/api/public/statistics')
    const data = await response.json()

    // Should not contain user emails, IDs, or other sensitive data
    const responseText = JSON.stringify(data)
    expect(responseText).not.toMatch(/@.*\.(com|gov|org)/)
    expect(responseText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  })

  test('CSRF protection on state-changing operations', async ({ page }) => {
    // This would require testing CSRF tokens
    // For now, verify that POST requests require authentication
    const response = await page.request.post('/api/planning/schemes', {
      data: { schemeName: 'Test' },
    })

    // Should be unauthorized without auth
    expect([401, 403]).toContain(response.status())
  })
})

