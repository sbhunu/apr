/**
 * Liveness Probe
 * Simple endpoint to check if the application is running
 */

import { NextResponse } from 'next/server'

/**
 * GET /api/health/live - Liveness probe
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
      },
    }
  )
}

