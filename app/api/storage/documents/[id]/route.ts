/**
 * Document Management API Route
 * Handles document retrieval and deletion
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { deleteDocument, getSignedUrl } from '@/lib/storage/documents'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * GET /api/storage/documents/[id] - Get document signed URL
 */
export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read', 'survey:read', 'deeds:read'],
  requireAllPermissions: false,
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket')
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600', 10)

    if (!bucket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bucket is required',
        },
        { status: 400 }
      )
    }

    const result = await getSignedUrl(bucket, id, expiresIn)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    await logActivity(userId, 'read', 'storage', {
      resourceId: id,
      metadata: { bucket },
    })

    return NextResponse.json({
      success: true,
      url: result.url,
    })
  })
})

/**
 * DELETE /api/storage/documents/[id] - Delete document
 */
export const DELETE = createRBACMiddleware({
  requiredPermissions: ['planning:update', 'survey:update', 'deeds:update'],
  requireAllPermissions: false,
})(async (
  request: NextRequest,
  userId: string,
  { params }: { params: Promise<{ id: string }> }
) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket')

    if (!bucket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bucket is required',
        },
        { status: 400 }
      )
    }

    const result = await deleteDocument(bucket, id)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    await logActivity(userId, 'delete', 'storage', {
      resourceId: id,
      metadata: { bucket },
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  })
})

