/**
 * Document Search API Route
 * Search across various document types: plans, SG sectional plans, diagrams, titles, mortgages, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export interface DocumentSearchResult {
  id: string
  title: string
  description?: string
  documentType: string
  documentTypeLabel: string
  url: string
  mimeType: string
  fileSize?: number
  uploadedAt?: string
  relatedEntity?: {
    type: string
    id: string
    identifier: string // e.g., scheme_number, title_number
  }
}

/**
 * Search documents across multiple types
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const documentType = searchParams.get('type')?.trim() // Optional filter by type

    if (!query) {
      return NextResponse.json({ documents: [] }, { status: 200 })
    }

    const searchLower = query.toLowerCase()
    const results: DocumentSearchResult[] = []

    // Search Planning Documents
    if (!documentType || documentType === 'plan') {
      const { data: planDocs } = await supabase
        .from('plan_documents')
        .select(`
          id,
          title,
          description,
          document_type,
          file_size,
          mime_type,
          uploaded_at,
          file_path,
          plan_id,
          sectional_scheme_plans!inner(
            id,
            scheme_name,
            plan_number
          )
        `)
        .or(`title.ilike.%${searchLower}%,description.ilike.%${searchLower}%,document_type.ilike.%${searchLower}%`)
        .limit(50)

      if (planDocs) {
        const bucket = 'planning-documents'
        planDocs.forEach((doc: any) => {
          const plan = doc.sectional_scheme_plans
          const publicUrl = doc.file_path
            ? supabase.storage.from(bucket).getPublicUrl(doc.file_path).data?.publicUrl
            : null

          if (publicUrl) {
            results.push({
              id: `plan-doc-${doc.id}`,
              title: doc.title || 'Planning Document',
              description: doc.description,
              documentType: doc.document_type || 'plan',
              documentTypeLabel: 'Planning Document',
              url: publicUrl,
              mimeType: doc.mime_type || 'application/pdf',
              fileSize: doc.file_size,
              uploadedAt: doc.uploaded_at,
              relatedEntity: plan
                ? {
                    type: 'plan',
                    id: plan.id,
                    identifier: plan.plan_number || plan.scheme_name,
                  }
                : undefined,
            })
          }
        })
      }
    }

    // Search Survey Plans (SG Sectional Plans)
    if (!documentType || documentType === 'survey' || documentType === 'sg_plan') {
      const { data: surveyPlans } = await supabase
        .from('survey_sectional_plans')
        .select(`
          id,
          survey_number,
          title,
          seal_certificate_url,
          sealed_at,
          sectional_scheme_plans!inner(
            id,
            scheme_name,
            plan_number
          )
        `)
        .or(`survey_number.ilike.%${query}%,title.ilike.%${searchLower}%`)
        .limit(50)

      if (surveyPlans) {
        surveyPlans.forEach((plan: any) => {
          const planningPlan = plan.sectional_scheme_plans
          if (plan.seal_certificate_url) {
            results.push({
              id: `survey-seal-${plan.id}`,
              title: `Survey Seal Certificate - ${plan.survey_number}`,
              description: `Sealed survey plan for ${plan.title || planningPlan?.scheme_name || 'scheme'}`,
              documentType: 'sg_plan',
              documentTypeLabel: 'Surveyor-General Sectional Plan',
              url: plan.seal_certificate_url,
              mimeType: 'application/pdf',
              uploadedAt: plan.sealed_at,
              relatedEntity: planningPlan
                ? {
                    type: 'scheme',
                    id: planningPlan.id,
                    identifier: plan.survey_number,
                  }
                : undefined,
            })
          }
        })
      }
    }

    // Search Title Certificates
    if (!documentType || documentType === 'title' || documentType === 'certificate') {
      const { data: titles } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          title_number,
          holder_name,
          certificate_url,
          registration_date,
          sections!inner(
            id,
            section_number,
            sectional_schemes!inner(
              id,
              scheme_number,
              scheme_name
            )
          )
        `)
        .or(`title_number.ilike.%${query}%,holder_name.ilike.%${searchLower}%`)
        .not('certificate_url', 'is', null)
        .limit(50)

      if (titles) {
        titles.forEach((title: any) => {
          const section = title.sections
          const scheme = section?.sectional_schemes
          if (title.certificate_url) {
            results.push({
              id: `title-cert-${title.id}`,
              title: `Title Certificate - ${title.title_number}`,
              description: `Certificate for ${title.holder_name || 'holder'}`,
              documentType: 'title_certificate',
              documentTypeLabel: 'Sectional Title Certificate',
              url: title.certificate_url,
              mimeType: 'application/pdf',
              uploadedAt: title.registration_date,
              relatedEntity: scheme
                ? {
                    type: 'title',
                    id: title.id,
                    identifier: title.title_number,
                  }
                : undefined,
            })
          }
        })
      }
    }

    // Search Mortgage Documents
    if (!documentType || documentType === 'mortgage') {
      const { data: mortgages } = await supabase
        .from('mortgages')
        .select(`
          id,
          mortgage_number,
          lender_name,
          document_url,
          registered_at,
          sectional_titles!inner(
            id,
            title_number
          )
        `)
        .or(`mortgage_number.ilike.%${query}%,lender_name.ilike.%${searchLower}%`)
        .not('document_url', 'is', null)
        .limit(50)

      if (mortgages) {
        mortgages.forEach((mortgage: any) => {
          const title = mortgage.sectional_titles
          if (mortgage.document_url) {
            results.push({
              id: `mortgage-${mortgage.id}`,
              title: `Mortgage Document - ${mortgage.mortgage_number}`,
              description: `Mortgage registered by ${mortgage.lender_name} for title ${title?.title_number || 'N/A'}`,
              documentType: 'mortgage',
              documentTypeLabel: 'Mortgage Document',
              url: mortgage.document_url,
              mimeType: 'application/pdf',
              uploadedAt: mortgage.registered_at,
              relatedEntity: title
                ? {
                    type: 'title',
                    id: title.id,
                    identifier: title.title_number,
                  }
                : undefined,
            })
          }
        })
      }
    }

    // Search Lease Documents
    if (!documentType || documentType === 'lease') {
      const { data: leases } = await supabase
        .from('leases')
        .select(`
          id,
          lease_number,
          lessor_name,
          document_url,
          registered_at,
          sectional_titles!inner(
            id,
            title_number
          )
        `)
        .or(`lease_number.ilike.%${query}%,lessor_name.ilike.%${searchLower}%`)
        .not('document_url', 'is', null)
        .limit(50)

      if (leases) {
        leases.forEach((lease: any) => {
          const title = lease.sectional_titles
          if (lease.document_url) {
            results.push({
              id: `lease-${lease.id}`,
              title: `Lease Document - ${lease.lease_number}`,
              description: `Lease registered by ${lease.lessor_name} for title ${title?.title_number || 'N/A'}`,
              documentType: 'lease',
              documentTypeLabel: 'Lease Document',
              url: lease.document_url,
              mimeType: 'application/pdf',
              uploadedAt: lease.registered_at,
              relatedEntity: title
                ? {
                    type: 'title',
                    id: title.id,
                    identifier: title.title_number,
                  }
                : undefined,
            })
          }
        })
      }
    }

    // Sort by relevance (exact matches first, then by date)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
      const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
      if (aExact !== bExact) return bExact - aExact

      const aDate = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
      const bDate = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
      return bDate - aDate
    })

    return NextResponse.json({ documents: results }, { status: 200 })
  } catch (error) {
    console.error('Document search error:', error)
    return NextResponse.json(
      { error: 'Failed to search documents', documents: [] },
      { status: 500 }
    )
  }
}

