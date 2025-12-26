/**
 * Documents Service for Module 4
 * Fetches related documents for schemes, sections, and titles
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import type { Document } from '@/components/documents/DocumentViewer'

/**
 * Get documents related to a scheme
 * Includes planning documents, survey plans, certificates, etc.
 */
export async function getSchemeDocuments(schemeId: string): Promise<{
  success: boolean
  documents?: Document[]
  error?: string
}> {
  return monitor('get_scheme_documents', async () => {
    const supabase = await createClient()

    try {
      // Get scheme with survey plan
      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .select(`
          id,
          scheme_number,
          scheme_name,
          survey_plan_id,
          survey_sectional_plans!inner(
            id,
            planning_plan_id,
            seal_certificate_url
          )
        `)
        .eq('id', schemeId)
        .single()

      if (schemeError || !scheme) {
        logger.error('Failed to get scheme', schemeError, { schemeId })
        return {
          success: false,
          error: schemeError?.message || 'Scheme not found',
        }
      }

      // Get planning plan ID separately
      const surveyPlan = (scheme as any).survey_sectional_plans
      const planningPlanId = surveyPlan?.planning_plan_id

      const documents: Document[] = []

      // Get planning documents
      if (planningPlanId) {
        const { data: planDocs } = await supabase
          .from('plan_documents')
          .select('id, title, description, document_type, file_size, mime_type, uploaded_at, file_path')
          .eq('plan_id', planningPlanId)
          .order('uploaded_at', { ascending: false })

        if (planDocs) {
          const bucket = 'planning-documents' // From storage config
          planDocs.forEach((doc: any) => {
            const publicUrl = doc.file_path
              ? supabase.storage.from(bucket).getPublicUrl(doc.file_path).data?.publicUrl
              : null

            if (publicUrl) {
              documents.push({
                id: `plan-${doc.id}`,
                title: doc.title || 'Planning Document',
                description: doc.description,
                url: publicUrl,
                mimeType: doc.mime_type,
                fileSize: doc.file_size,
                documentType: doc.document_type,
                uploadedAt: doc.uploaded_at,
              })
            }
          })
        }
      }

      // Get seal certificate if available
      if (surveyPlan?.seal_certificate_url) {
        documents.push({
          id: `seal-${surveyPlan.id}`,
          title: 'Survey Seal Certificate',
          description: 'Digital seal certificate from Surveyor-General',
          url: surveyPlan.seal_certificate_url,
          mimeType: 'application/pdf',
          documentType: 'seal_certificate',
        })
      }

      // Get title certificates for sections in this scheme
      // First get section IDs for this scheme
      const { data: sections } = await supabase
        .from('sections')
        .select('id')
        .eq('scheme_id', schemeId)

      const sectionIds = sections?.map((s: any) => s.id) || []

      if (sectionIds.length > 0) {
        const { data: titles } = await supabase
          .from('sectional_titles')
          .select('id, title_number, certificate_url')
          .in('section_id', sectionIds)
          .not('certificate_url', 'is', null)

        if (titles) {
          titles.forEach((title: any) => {
            if (title.certificate_url) {
              documents.push({
                id: `cert-${title.id}`,
                title: `Title Certificate - ${title.title_number}`,
                description: 'Certificate of Sectional Title',
                url: title.certificate_url,
                mimeType: 'application/pdf',
                documentType: 'title_certificate',
              })
            }
          })
        }
      }

      return {
        success: true,
        documents,
      }
    } catch (error) {
      logger.error('Exception getting scheme documents', error as Error, { schemeId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get documents for a specific title
 */
export async function getTitleDocuments(titleId: string): Promise<{
  success: boolean
  documents?: Document[]
  error?: string
}> {
  return monitor('get_title_documents', async () => {
    const supabase = await createClient()

    try {
      // Get title with section
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          title_number,
          certificate_url,
          section_id,
          sections!inner(
            id,
            scheme_id
          )
        `)
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: titleError?.message || 'Title not found',
        }
      }

      const documents: Document[] = []
      const section = (title as any).sections
      const schemeId = section?.scheme_id

      // Add certificate if available
      if (title.certificate_url) {
        documents.push({
          id: `cert-${title.id}`,
          title: `Certificate - ${title.title_number}`,
          description: 'Certificate of Sectional Title',
          url: title.certificate_url,
          mimeType: 'application/pdf',
          documentType: 'title_certificate',
        })
      }

      // Get scheme documents (planning, survey, etc.)
      if (schemeId) {
        const schemeDocs = await getSchemeDocuments(schemeId)
        if (schemeDocs.success && schemeDocs.documents) {
          documents.push(...schemeDocs.documents)
        }
      }

      return {
        success: true,
        documents,
      }
    } catch (error) {
      logger.error('Exception getting title documents', error as Error, { titleId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

