/**
 * Readiness Probe
 * Checks if the application is ready to serve traffic
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/health/ready - Readiness probe
 */
export async function GET() {
  try {
    // Check database connection
    const supabase = await createClient()
    const { error } = await supabase.from('apr.user_profiles').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        {
          status: 'not ready',
          error: error.message,
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}

