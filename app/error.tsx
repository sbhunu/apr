'use client'

/**
 * Error Boundary for route-level errors
 * Catches errors in specific routes and allows recovery
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { isAppError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error for monitoring
    logger.error('Route error boundary caught error', error, {
      digest: error.digest,
      name: error.name,
      message: error.message,
    })
  }, [error])

  const isAppErrorInstance = isAppError(error)
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Oops! Something went wrong</CardTitle>
          </div>
          <CardDescription>
            {isAppErrorInstance
              ? error.message
              : 'An error occurred while loading this page. Please try again.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAppErrorInstance && error.statusCode && (
            <Alert variant="destructive">
              <AlertTitle>Error Code: {error.code}</AlertTitle>
              <AlertDescription>
                Status: {error.statusCode} - {error.message}
              </AlertDescription>
            </Alert>
          )}

          {isDevelopment && error.stack && (
            <Alert>
              <AlertTitle>Development Details</AlertTitle>
              <AlertDescription>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">
                    {error.stack}
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={reset} variant="default" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

