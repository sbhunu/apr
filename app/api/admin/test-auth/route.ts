/**
 * Test Auth Route
 * Helps debug authentication issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
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
          // Ignore in API routes
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  return NextResponse.json({
    cookies: cookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 })),
    user: user ? { id: user.id, email: user.email } : null,
    error: authError?.message || null,
  })
}

