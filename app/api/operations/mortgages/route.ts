/**
 * List Mortgages API Route
 * Returns list of all mortgages (with optional filtering)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/mortgages - Get list of mortgages
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const titleId = searchParams.get('titleId')
    const status = searchParams.get('status')

    try {
      let query = supabase.from('mortgages').select('*')

      if (titleId) {
        query = query.eq('title_id', titleId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      query = query.order('registration_date', { ascending: false })

      const { data: mortgages, error } = await query

      if (error) {
        // If table doesn't exist, return empty array instead of error
        if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
          return NextResponse.json({
            success: true,
            mortgages: [],
          })
        }
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        )
      }

      // Calculate priority for each mortgage
      const mortgagesWithPriority = mortgages?.map((mortgage, index) => {
        // Get all mortgages for the same title, ordered by registration date
        const sameTitleMortgages = mortgages
          ?.filter((m) => m.title_id === mortgage.title_id)
          .sort(
            (a, b) =>
              new Date(a.registration_date).getTime() -
              new Date(b.registration_date).getTime()
          ) || []

        const priority = sameTitleMortgages.findIndex((m) => m.id === mortgage.id) + 1

        return {
          id: mortgage.id,
          mortgageNumber: mortgage.mortgage_number,
          titleId: mortgage.title_id,
          lenderName: mortgage.lender_name,
          borrowerName: mortgage.borrower_name,
          mortgageAmount: mortgage.mortgage_amount,
          mortgageCurrency: mortgage.mortgage_currency || 'USD',
          registrationDate: mortgage.registration_date,
          status: mortgage.status,
          priority,
        }
      })

      return NextResponse.json({
        success: true,
        mortgages: mortgagesWithPriority || [],
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  })
})

