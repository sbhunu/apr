/**
 * Debug RBAC Route
 * Helps diagnose RBAC issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies.getAll()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookies
          },
          setAll() {
            // Ignore in GET requests
          },
        },
      }
    )

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'No user',
        userId: null,
        cookieCount: cookies.length,
        cookieNames: cookies.map(c => c.name),
        hasSessionCookie: cookies.some(c => c.name.includes('sb-') || c.name.includes('supabase')),
      })
    }

    // Try to get profile
    const { data: profile, error: profileError } = await supabase
      .from('apr.user_profiles')
      .select('id, email, role, status')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      userEmail: user.email,
      profile: profile || null,
      profileError: profileError
        ? {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint,
          }
        : null,
      cookieCount: cookies.length,
      cookieNames: cookies.map(c => c.name),
      hasSessionCookie: cookies.some(c => c.name.includes('sb-') || c.name.includes('supabase')),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

