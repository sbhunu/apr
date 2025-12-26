/**
 * Property Description Upload API Route
 * Handles uploading property description files for title drafts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { createClient } from '@/lib/supabase/server'
import { uploadDocumentServer } from '@/lib/storage/documents'
import { DEEDS_DOCUMENTS_CONFIG } from '@/lib/storage/config'
import { logger } from '@/lib/logger'

export const POST = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
})(
  async (
    request: NextRequest,
    userId: string,
    { params }: { params: Promise<{ titleId: string }> }
  ) => {
    return withErrorHandler(async () => {
      const { titleId } = await params
      const supabase = await createClient()

      // Verify title exists and user has access
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('id, section_id, registration_status')
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return NextResponse.json(
          {
            success: false,
            error: 'Title not found',
          },
          { status: 404 }
        )
      }

      // Only allow uploads for draft titles
      if (title.registration_status !== 'draft') {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot upload property description for title with status: ${title.registration_status}`,
          },
          { status: 400 }
        )
      }

      // Parse form data
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const description = formData.get('description') as string | null

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            error: 'No file provided',
          },
          { status: 400 }
        )
      }

      // Upload file to storage
      const uploadResult = await uploadDocumentServer({
        file,
        folder: `property-descriptions/${titleId}`,
        documentType: 'deeds_property_description',
        metadata: {
          titleId,
          description: description || undefined,
          uploadedBy: userId,
        },
        userId,
      })

      if (!uploadResult.success || !uploadResult.filePath) {
        return NextResponse.json(
          {
            success: false,
            error: uploadResult.error || 'Failed to upload file',
          },
          { status: 500 }
        )
      }

      // Get current metadata
      const { data: currentTitle } = await supabase
        .from('sectional_titles')
        .select('metadata')
        .eq('id', titleId)
        .single()

      const metadata = (currentTitle?.metadata as Record<string, unknown>) || {}
      const propertyDescriptions = (metadata.propertyDescriptions as Array<{
        filePath: string
        fileName: string
        fileSize: number
        mimeType: string
        uploadedAt: string
        uploadedBy: string
        description?: string
      }>) || []

      // Add new file reference
      propertyDescriptions.push({
        filePath: uploadResult.filePath,
        fileName: file.name,
        fileSize: uploadResult.fileSize || file.size,
        mimeType: uploadResult.mimeType || file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId,
        description: description || undefined,
      })

      // Update title metadata
      const { error: updateError } = await supabase
        .from('sectional_titles')
        .update({
          metadata: {
            ...metadata,
            propertyDescriptions,
          },
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', titleId)

      if (updateError) {
        logger.error('Failed to update title metadata', updateError, {
          titleId,
          userId,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to save file reference',
          },
          { status: 500 }
        )
      }

      logger.info('Property description uploaded successfully', {
        titleId,
        fileName: file.name,
        filePath: uploadResult.filePath,
        userId,
      })

      return NextResponse.json({
        success: true,
        file: {
          filePath: uploadResult.filePath,
          fileName: file.name,
          fileSize: uploadResult.fileSize || file.size,
          mimeType: uploadResult.mimeType || file.type,
          url: uploadResult.fileUrl,
          uploadedAt: new Date().toISOString(),
        },
      })
    })
  }
)

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(
  async (
    request: NextRequest,
    userId: string,
    { params }: { params: Promise<{ titleId: string }> }
  ) => {
    return withErrorHandler(async () => {
      const { titleId } = await params
      const supabase = await createClient()

      // Get title metadata
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('metadata')
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return NextResponse.json(
          {
            success: false,
            error: 'Title not found',
          },
          { status: 404 }
        )
      }

      const metadata = (title.metadata as Record<string, unknown>) || {}
      const propertyDescriptions =
        (metadata.propertyDescriptions as Array<{
          filePath: string
          fileName: string
          fileSize: number
          mimeType: string
          uploadedAt: string
          uploadedBy: string
          description?: string
        }>) || []

      // Generate signed URLs for files
      const filesWithUrls = await Promise.all(
        propertyDescriptions.map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from(DEEDS_DOCUMENTS_CONFIG.bucket)
            .createSignedUrl(file.filePath, 3600) // 1 hour expiry

          return {
            ...file,
            url: urlData?.signedUrl || null,
          }
        })
      )

      return NextResponse.json({
        success: true,
        files: filesWithUrls,
      })
    })
  }
)

export const DELETE = createRBACMiddleware({
  requiredPermissions: ['deeds:write'],
})(
  async (
    request: NextRequest,
    userId: string,
    { params }: { params: Promise<{ titleId: string }> }
  ) => {
    return withErrorHandler(async () => {
      const { titleId } = await params
      const { searchParams } = new URL(request.url)
      const filePath = searchParams.get('filePath')

      if (!filePath) {
        return NextResponse.json(
          {
            success: false,
            error: 'filePath parameter is required',
          },
          { status: 400 }
        )
      }

      const supabase = await createClient()

      // Get current metadata
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select('metadata, registration_status')
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return NextResponse.json(
          {
            success: false,
            error: 'Title not found',
          },
          { status: 404 }
        )
      }

      // Only allow deletion for draft titles
      if (title.registration_status !== 'draft') {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot delete property description for title with status: ${title.registration_status}`,
          },
          { status: 400 }
        )
      }

      const metadata = (title.metadata as Record<string, unknown>) || {}
      const propertyDescriptions = (metadata.propertyDescriptions as Array<{
        filePath: string
        fileName: string
      }>) || []

      // Remove file from metadata
      const updatedDescriptions = propertyDescriptions.filter((f) => f.filePath !== filePath)

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from(DEEDS_DOCUMENTS_CONFIG.bucket)
        .remove([filePath])

      if (deleteError) {
        logger.warn('Failed to delete file from storage', deleteError, {
          titleId,
          filePath,
        })
        // Continue with metadata update even if storage deletion fails
      }

      // Update title metadata
      const { error: updateError } = await supabase
        .from('sectional_titles')
        .update({
          metadata: {
            ...metadata,
            propertyDescriptions: updatedDescriptions,
          },
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', titleId)

      if (updateError) {
        logger.error('Failed to update title metadata', updateError, {
          titleId,
          userId,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to update file references',
          },
          { status: 500 }
        )
      }

      logger.info('Property description deleted successfully', {
        titleId,
        filePath,
        userId,
      })

      return NextResponse.json({
        success: true,
      })
    })
  }
)

