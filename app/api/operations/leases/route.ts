/**
 * List Leases API Route
 * Returns list of all leases (with optional filtering)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createClient } from '@/lib/supabase/server'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/operations/leases - Get list of leases
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
      let query = supabase.from('leases').select('*')

      if (titleId) {
        query = query.eq('title_id', titleId)
      }

      if (status) {
        query = query.eq('status', status)
      }

      query = query.order('lease_start_date', { ascending: false })

      const { data: leases, error } = await query

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 }
        )
      }

      const leasesFormatted = leases?.map((lease) => ({
        id: lease.id,
        leaseNumber: lease.lease_number,
        titleId: lease.title_id,
        lessorName: lease.lessor_name,
        lesseeName: lease.lessee_name,
        lesseeType: lease.lessee_type,
        leaseStartDate: lease.lease_start_date,
        leaseEndDate: lease.lease_end_date,
        leaseTermMonths: lease.lease_term_months,
        monthlyRent: lease.monthly_rent,
        rentCurrency: lease.rent_currency || 'USD',
        status: lease.status,
      }))

      return NextResponse.json({
        success: true,
        leases: leasesFormatted || [],
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

