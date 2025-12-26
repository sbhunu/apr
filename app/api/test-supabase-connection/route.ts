import { NextResponse } from 'next/server'

/**
 * Test Supabase Connection API Route
 * Helps diagnose connection issues
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        error: 'Missing environment variables',
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
      },
      { status: 500 }
    )
  }

  try {
    // Test connection to Supabase
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: supabaseAnonKey,
      },
    })

    return NextResponse.json({
      success: true,
      supabaseUrl,
      status: response.status,
      statusText: response.statusText,
      message: 'Supabase connection test successful',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        supabaseUrl,
      },
      { status: 500 }
    )
  }
}

