/**
 * Document Upload API Route
 * Handles document uploads with validation and storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { uploadDocumentServer } from '@/lib/storage/documents'
import { validateFile } from '@/lib/storage/validation'
import { getStorageConfig } from '@/lib/storage/config'
import { logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * POST /api/storage/upload - Upload document
 */
export const POST = createRBACMiddleware({
  requiredPermissions: ['planning:create', 'survey:create', 'deeds:create'],
  requireAllPermissions: false,
})(async (request: NextRequest, userId: string) => {
  return withErrorHandler(async () => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string
    const documentType = formData.get('documentType') as string
    const metadataStr = formData.get('metadata') as string

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'File is required',
        },
        { status: 400 }
      )
    }

    if (!folder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Folder is required',
        },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document type is required',
        },
        { status: 400 }
      )
    }

    // Parse metadata if provided
    let metadata: Record<string, unknown> | undefined
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr)
      } catch {
        // Ignore parse errors
      }
    }

    // Get storage config
    const config = getStorageConfig(documentType)

    // Validate file
    const validation = validateFile(file, config)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.errors.join('; '),
        },
        { status: 400 }
      )
    }

    // Upload document
    const result = await uploadDocumentServer({
      file,
      folder,
      documentType,
      metadata,
      userId,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }

    await logActivity(userId, 'create', 'storage', {
      resourceId: result.filePath,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        documentType,
        checksum: result.checksum,
      },
    })

    return NextResponse.json({
      success: true,
      filePath: result.filePath,
      fileUrl: result.fileUrl,
      checksum: result.checksum,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
    })
  })
})

