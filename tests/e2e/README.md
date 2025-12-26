# E2E Testing Guide

This directory contains end-to-end tests for the APR system using Playwright.

## Structure

```
tests/e2e/
├── fixtures/          # Test fixtures and helpers
│   ├── test-data.ts   # Test data (users, schemes, coordinates)
│   ├── test-helpers.ts # Utility functions for tests
│   └── database-helpers.ts # Database operations for tests
├── workflows/         # Complete workflow tests
│   ├── complete-workflow.spec.ts # Full planning to certificate workflow
│   └── error-handling.spec.ts # Error scenario tests
├── performance/       # Performance and load tests
│   └── load-test.spec.ts
└── security/          # Security tests
    └── security-test.spec.ts
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Run specific test file
npx playwright test tests/e2e/workflows/complete-workflow.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Data Management

Test data is managed through fixtures:
- `test-data.ts`: Contains test users, schemes, and coordinate data
- `database-helpers.ts`: Functions for creating/cleaning test data

Tests automatically clean up test data using the `test_` prefix.

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from '../fixtures/test-helpers'

test('my test', async ({ page }) => {
  await loginAs(page, 'planner')
  await page.goto('/planning/schemes/new')
  // ... test steps
})
```

### Using Test Helpers

```typescript
import { loginAs, waitForAPIResponse, fillFieldByLabel } from '../fixtures/test-helpers'

// Login as user
await loginAs(page, 'planner')

// Wait for API response
const response = waitForAPIResponse(page, '/api/planning/schemes')
await page.click('button:has-text("Submit")')
await response

// Fill form field
await fillFieldByLabel(page, 'Scheme Name', 'Test Scheme')
```

### Database Operations

```typescript
import { createTestScheme, cleanupTestData } from '../fixtures/database-helpers'

// Create test data
const scheme = await createTestScheme({
  schemeName: 'test_My Scheme',
  location: 'Harare',
  plannerId: 'user-id'
})

// Clean up
await cleanupTestData('test_')
```

## Test Scenarios

### Complete Workflow Test
Tests the full journey from planning submission to certificate issuance:
1. Planner submits scheme
2. Planning Authority approves
3. Surveyor uploads coordinates and computes
4. Surveyor-General seals survey
5. Conveyancer drafts deeds
6. Deeds Examiner approves
7. Registrar registers title and generates certificate
8. Certificate verification in public portal

### Error Handling Tests
- Invalid form submissions
- Unauthorized access attempts
- Invalid workflow transitions
- Invalid file uploads
- Missing required fields

### Performance Tests
- Page load times
- API response times
- Concurrent request handling
- Certificate verification speed

### Security Tests
- SQL injection prevention
- XSS protection
- RBAC enforcement
- Sensitive data exposure
- CSRF protection

## Best Practices

1. **Use test data fixtures**: Always use test data from fixtures rather than hardcoding
2. **Clean up after tests**: Use `afterEach` hooks to clean up test data
3. **Wait for network idle**: Use `waitForLoading()` helper to ensure pages are fully loaded
4. **Use meaningful test names**: Test names should clearly describe what is being tested
5. **Group related tests**: Use `test.describe()` to group related tests
6. **Test error scenarios**: Always test both happy paths and error scenarios
7. **Verify assertions**: Use `expect()` to verify expected outcomes

## CI/CD Integration

E2E tests run automatically in CI/CD pipelines:
- Tests run on multiple browsers (Chromium, Firefox, WebKit)
- Tests run on mobile viewports
- Screenshots captured on failures
- Test reports generated for review

## Troubleshooting

### Tests failing due to timing
- Use `waitForLoading()` helper
- Increase timeout if needed: `test.setTimeout(60000)`
- Wait for specific elements: `await page.waitForSelector('selector')`

### Database cleanup issues
- Ensure test data uses `test_` prefix
- Check database connection in test environment
- Verify cleanup function has proper permissions

### Authentication issues
- Verify test users exist in test database
- Check login credentials in `test-data.ts`
- Ensure auth flow matches production

