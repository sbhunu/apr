/**
 * Register Title API Route
 * Handles title registration by Registrar
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { registerTitle } from '@/lib/deeds/title-registration'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/deeds/registration/register - Register approved title
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:update'],
  requiredRoles: ['registrar', 'admin'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const { titleId, provinceCode, registrarNotes } = body

    if (!titleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title ID is required',
        },
        { status: 400 }
      )
    }

    if (!provinceCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Province code is required',
        },
        { status: 400 }
      )
    }

    const result = await registerTitle(titleId, userId, provinceCode, registrarNotes)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'update', 'deeds', {
      resourceId: titleId,
      metadata: {
        action: 'title_registration',
        titleNumber: result.titleNumber,
        registrationNumber: result.registrationNumber,
      },
    })

    return NextResponse.json({
      success: true,
      titleNumber: result.titleNumber,
      registrationNumber: result.registrationNumber,
      registrationDate: result.registrationDate,
      message: 'Title registered successfully',
    })
  })
})

