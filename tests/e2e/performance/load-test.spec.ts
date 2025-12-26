/**
 * Performance and Load Testing
 * Tests system performance under load
 */

import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('Dashboard loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Statistics API responds quickly', async ({ page }) => {
    const startTime = Date.now()
    const response = await page.request.get('/api/public/statistics')
    const responseTime = Date.now() - startTime

    expect(response.status()).toBe(200)
    // API should respond within 1 second
    expect(responseTime).toBeLessThan(1000)
  })

  test('Certificate verification is fast', async ({ page }) => {
    await page.goto('/verify')

    const startTime = Date.now()
    await page.fill('input[placeholder*="certificate number"]', 'TEST-2024-001')
    await page.click('button:has-text("Verify")')
    await page.waitForResponse((response) => response.url().includes('/api/verify/certificate'))
    const verificationTime = Date.now() - startTime

    // Verification should complete within 2 seconds
    expect(verificationTime).toBeLessThan(2000)
  })

  test('Multiple concurrent requests handled', async ({ page }) => {
    // Make multiple concurrent API requests
    const requests = Array.from({ length: 10 }, () =>
      page.request.get('/api/public/statistics')
    )

    const startTime = Date.now()
    const responses = await Promise.all(requests)
    const totalTime = Date.now() - startTime

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status()).toBe(200)
    })

    // Should handle concurrent requests efficiently
    expect(totalTime).toBeLessThan(5000)
  })
})

