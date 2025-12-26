/**
 * Pending Signatures API Route
 * Returns list of pending signatures awaiting manual signing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { getPendingSignatures } from '@/lib/signatures/manual-signature-service'

export const GET = createRBACMiddleware({
  requiredPermissions: ['admin:read'],
})(async (request: NextRequest) => {
  return withErrorHandler(async () => {
    const result = await getPendingSignatures()
    return NextResponse.json(result)
  })
})

