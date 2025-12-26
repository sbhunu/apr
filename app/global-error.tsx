'use client'

/**
 * Global Error Boundary
 * Catches unhandled errors in the application and displays user-friendly error messages
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { isAppError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error for monitoring
    logger.error('Global error boundary caught error', error, {
      digest: error.digest,
      name: error.name,
      message: error.message,
    })

    // In production, you might want to send to error tracking service
    // Example: Sentry.captureException(error)
  }, [error])

  const isAppErrorInstance = isAppError(error)
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle className="text-2xl">Something went wrong</CardTitle>
              </div>
              <CardDescription>
                {isAppErrorInstance
                  ? error.message
                  : 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
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

              {isDevelopment && (
                <Alert>
                  <AlertTitle>Development Details</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div>
                      <strong>Error:</strong> {error.name}
                    </div>
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    {error.digest && (
                      <div>
                        <strong>Digest:</strong> {error.digest}
                      </div>
                    )}
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={reset} variant="default" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Go Home
                  </Link>
                </Button>
              </div>

              {isAppErrorInstance && error.context && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Additional Context
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

