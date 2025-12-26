'use client'

/**
 * Test page for error handling
 * Demonstrates error boundaries and custom error classes
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  SystemError,
} from '@/lib/errors'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { retry } from '@/lib/retry'

export default function TestErrorPage() {
  const [errorMessage, setErrorMessage] = useState<string>('')

  const triggerValidationError = () => {
    try {
      throw new ValidationError('Email is required', 'email')
    } catch (error) {
      logger.error('Validation error triggered', error as Error)
      setErrorMessage((error as ValidationError).message)
    }
  }

  const triggerAuthorizationError = () => {
    try {
      throw new AuthorizationError(
        'You do not have permission to create planning applications',
        'planning',
        'create'
      )
    } catch (error) {
      logger.error('Authorization error triggered', error as Error)
      setErrorMessage((error as AuthorizationError).message)
    }
  }

  const triggerNotFoundError = () => {
    try {
      throw new NotFoundError('User', '12345')
    } catch (error) {
      logger.error('Not found error triggered', error as Error)
      setErrorMessage((error as NotFoundError).message)
    }
  }

  const triggerSystemError = () => {
    try {
      throw new SystemError('Database connection failed', new Error('Connection timeout'))
    } catch (error) {
      logger.error('System error triggered', error as Error)
      setErrorMessage((error as SystemError).message)
    }
  }

  const testMonitoring = async () => {
    const result = await monitor.measure('testOperation', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return { success: true }
    })
    logger.info('Monitoring test completed', { result })
    setErrorMessage('Monitoring test completed - check console')
  }

  const testRetry = async () => {
    let attempts = 0
    try {
      await retry(
        async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('Temporary failure')
          }
          return { success: true }
        },
        {
          maxAttempts: 3,
          initialDelay: 500,
        }
      )
      setErrorMessage(`Retry test succeeded after ${attempts} attempts`)
    } catch (error) {
      logger.error('Retry test failed', error as Error)
      setErrorMessage('Retry test failed - check console')
    }
  }

  const triggerUnhandledError = () => {
    // This will trigger the error boundary
    throw new Error('Unhandled error for testing error boundary')
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Error Handling Test Page</h1>
        <p className="text-muted-foreground">
          Test error handling, logging, monitoring, and retry logic
        </p>
      </div>

      {errorMessage && (
        <Card>
          <CardHeader>
            <CardTitle>Last Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Error Classes</CardTitle>
          <CardDescription>Test custom error classes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={triggerValidationError} variant="outline">
            Validation Error
          </Button>
          <Button onClick={triggerAuthorizationError} variant="outline">
            Authorization Error
          </Button>
          <Button onClick={triggerNotFoundError} variant="outline">
            Not Found Error
          </Button>
          <Button onClick={triggerSystemError} variant="destructive">
            System Error
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitoring & Retry</CardTitle>
          <CardDescription>Test performance monitoring and retry logic</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={testMonitoring} variant="secondary">
            Test Monitoring
          </Button>
          <Button onClick={testRetry} variant="secondary">
            Test Retry Logic
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Boundary</CardTitle>
          <CardDescription>Test global error boundary (will crash page)</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={triggerUnhandledError} variant="destructive">
            Trigger Unhandled Error
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will trigger the global error boundary and show the error page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Console Output</CardTitle>
          <CardDescription>Check browser console for logged errors and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All errors are logged to the console with proper context and sanitization.
            Performance metrics are tracked automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

