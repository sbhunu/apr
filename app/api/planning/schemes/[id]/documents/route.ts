/**
 * Planning Scheme Documents API Route
 * Returns document metadata and public URLs for a given scheme
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware, logActivity } from '@/lib/admin/rbac'
import { withErrorHandler } from '@/lib/api-error-handler'
import { createClient } from '@/lib/supabase/server'
import { PLANNING_DOCUMENTS_CONFIG } from '@/lib/storage/config'

export const GET = createRBACMiddleware({
  requiredPermissions: ['planning:read'],
})(async (request: NextRequest, userId: string, { params }: { params: Promise<{ id: string }> }) => {
  return withErrorHandler(async () => {
    const { id } = await params
    const supabase = await createClient()

    const { data: documents, error } = await supabase
      .from('plan_documents')
      .select(
        'id, title, description, document_type, file_size, mime_type, uploaded_at, uploaded_by, version, file_path'
      )
      .eq('plan_id', id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      throw error
    }

    const bucket = PLANNING_DOCUMENTS_CONFIG.bucket

    const documentsWithUrls = (documents || []).map((doc) => {
      const publicUrl =
        doc.file_path && bucket
          ? supabase.storage.from(bucket).getPublicUrl(doc.file_path).data?.publicUrl ?? null
          : null

      return {
        ...doc,
        url: publicUrl,
      }
    })

    await logActivity(userId, 'read', 'planning', {
      resourceId: id,
      metadata: { count: documentsWithUrls.length },
    })

    return NextResponse.json({
      success: true,
      documents: documentsWithUrls,
    })
  })
})

