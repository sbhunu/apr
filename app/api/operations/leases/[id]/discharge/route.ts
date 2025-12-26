/**
 * Lease Discharge API Route
 * Discharge/terminate a lease
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { dischargeLease, LeaseDischargeData } from '@/lib/operations/leases'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/operations/leases/[id]/discharge - Discharge a lease
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
  requiredRoles: ['deeds_registrar', 'admin'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const body = await request.json()

    const dischargeData: LeaseDischargeData = {
      leaseId: id,
      terminationDate: body.terminationDate || new Date().toISOString().split('T')[0],
      terminationReason: body.terminationReason,
      terminationReference: body.terminationReference,
    }

    const result = await dischargeLease(dischargeData)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      terminatedAt: result.terminatedAt,
    })
  })
})

