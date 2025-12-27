/**
 * Public Statistics API Route
 * Returns aggregated statistics for public display
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/public/statistics - Get public statistics
 */
export const GET = withErrorHandler(async () => {
  const supabase = await createClient()

  try {
    // Get total deeds registered (all time)
    const { count: totalDeeds, error: totalError } = await supabase
      .from('sectional_titles')
      .select('*', { count: 'exact', head: true })
      .eq('registration_status', 'registered')

    if (totalError) {
      console.error('Error fetching total deeds:', totalError)
    }

    // Get deeds registered this month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    
    const { count: monthlyDeeds, error: monthlyError } = await supabase
      .from('sectional_titles')
      .select('*', { count: 'exact', head: true })
      .eq('registration_status', 'registered')
      .gte('registration_date', startOfMonth)

    if (monthlyError) {
      console.error('Error fetching monthly deeds:', monthlyError)
    }

    // Return live statistics from database (0 if no records found)
    return NextResponse.json({
      success: true,
      statistics: {
        totalDeedsRegistered: totalDeeds ?? 0,
        monthlyDeedsRegistered: monthlyDeeds ?? 0,
        year: new Date().getFullYear(),
      },
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    // Return 0 on error instead of hardcoded values
    return NextResponse.json({
      success: true,
      statistics: {
        totalDeedsRegistered: 0,
        monthlyDeedsRegistered: 0,
        year: new Date().getFullYear(),
      },
    })
  }
})
