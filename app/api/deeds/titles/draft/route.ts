/**
 * Title Draft API Route
 * Handles creating and updating title drafts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { saveTitleDraft, getTitleDraft } from '@/lib/deeds/drafting-service'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { TitleDraft } from '@/lib/deeds/types'

/**
 * GET /api/deeds/titles/draft - Get title draft
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get('sectionId')

    if (!sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Section ID is required',
        },
        { status: 400 }
      )
    }

    const result = await getTitleDraft(sectionId)

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
      draft: result.draft,
    })
  })
})

/**
 * POST /api/deeds/titles/draft - Save title draft
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:create'],
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const body = await request.json()
    const draft = body as TitleDraft

    if (!draft.sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Section ID is required',
        },
        { status: 400 }
      )
    }

    const result = await saveTitleDraft(draft, userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      )
    }

    await logActivity(userId, 'create', 'deeds', {
      resourceId: result.draftId,
      metadata: {
        action: 'save_draft',
        sectionId: draft.sectionId,
      },
    })

    return NextResponse.json({
      success: true,
      draftId: result.draftId,
      message: 'Draft saved successfully',
    })
  })
})

