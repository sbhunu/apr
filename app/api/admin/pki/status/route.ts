/**
 * PKI Status API Route
 * Exposes the current PKI provider status to administrators.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { createPKIManager } from '@/lib/pki/pki-manager'

export const GET = createRBACMiddleware({
  requiredRole: 'admin',
})(async () => {
  const manager = createPKIManager()
  const status = await manager.getServiceStatus()

  return NextResponse.json({
    success: true,
    status,
  })
})

