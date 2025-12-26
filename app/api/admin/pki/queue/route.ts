/**
 * PKI Queue API Route
 * Allows administrators to process any queued PKI operations when the external service comes back online.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createPKIManager } from '@/lib/pki/pki-manager'

export const POST = createRBACMiddleware({
  requiredRole: 'admin',
})(async () => {
  const manager = createPKIManager()
  const result = await manager.processQueue()

  return NextResponse.json({
    success: true,
    summary: result,
  })
})

