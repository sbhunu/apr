/**
 * Property Records Analysis Service
 * Aggregates all records related to a property for comprehensive analysis
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Property analysis result
 */
export interface PropertyAnalysis {
  schemeNumber?: string
  schemeName?: string
  planningPlan?: {
    id: string
    planId: string
    schemeName: string
    plannerId?: string
    plannerName?: string
    planningAuthority?: string
    approvalStatus: string
    approvalDate?: string
    submittedAt?: string
    locked: boolean
    documents?: Array<{
      id: string
      name: string
      type: string
      url: string
      uploadedAt?: string
    }>
  }
  surveyPlan?: {
    id: string
    surveyNumber?: string
    title?: string
    surveyorId?: string
    surveyorName?: string
    status: string
    sealHash?: string
    sealedAt?: string
    approvedBy?: string
    approvedAt?: string
    parentParcelArea?: number
    sectionCount?: number
    documents?: Array<{
      id: string
      name: string
      type: string
      url: string
      uploadedAt?: string
    }>
    validationReport?: {
      isValid: boolean
      errors: string[]
      warnings: string[]
    }
  }
  scheme?: {
    id: string
    schemeNumber: string
    schemeName: string
    communalLandId?: string
    communalLandCustodianName?: string
    registrationDate?: string
    bodyCorporateId?: string
    bodyCorporateNumber?: string
    sections?: Array<{
      id: string
      sectionNumber: string
      area: number
      participationQuota: number
      titleNumber?: string
      holderName?: string
      registrationStatus?: string
    }>
  }
  titles?: Array<{
    id: string
    titleNumber: string
    sectionNumber: string
    holderName?: string
    holderId?: string
    registrationStatus: string
    registrationDate?: string
    certificateUrl?: string
    digitalSignatureId?: string
    examinedAt?: string
    examinedBy?: string
    approvedAt?: string
    approvedBy?: string
  }>
  workflowHistory?: Array<{
    id: string
    fromState: string
    toState: string
    userId: string
    userName?: string
    reason?: string
    createdAt: string
    metadata?: Record<string, unknown>
  }>
  digitalSignatures?: Array<{
    id: string
    documentId: string
    documentType: string
    signedBy: string
    signerName?: string
    role: string
    pkiProvider?: string
    certificateSerial?: string
    signedAt: string
    isValid?: boolean
  }>
  spatialData?: {
    parentParcelGeometry?: string // GeoJSON
    sectionGeometries?: Array<{
      sectionId: string
      sectionNumber: string
      geometry: string // GeoJSON
      area: number
    }>
    centroid?: {
      longitude: number
      latitude: number
    }
  }
}

/**
 * Get comprehensive property analysis by scheme number
 */
export async function getPropertyAnalysisByScheme(
  schemeNumber: string
): Promise<{
  success: boolean
  analysis?: PropertyAnalysis
  error?: string
}> {
  return monitor('get_property_analysis_by_scheme', async () => {
    const supabase = await createClient()

    try {
      // Get scheme with all related data
      // First get the scheme
      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .select(`
          id,
          scheme_number,
          scheme_name,
          communal_land_id,
          metadata,
          registration_date,
          survey_plan_id,
          body_corporate_id
        `)
        .eq('scheme_number', schemeNumber)
        .single()

      if (schemeError || !scheme) {
        return {
          success: false,
          error: 'Scheme not found',
        }
      }

      // Get survey plan separately
      let surveyPlan: any = null
      let planningPlan: any = null
      if (scheme.survey_plan_id) {
        const { data: surveyData } = await supabase
          .from('survey_sectional_plans')
          .select(`
            id,
            survey_number,
            title,
            surveyor_id,
            status,
            seal_hash,
            sealed_at,
            approved_by,
            approval_date,
            planning_plan_id,
            digital_signature_id,
            seal_certificate_url,
            metadata
          `)
          .eq('id', scheme.survey_plan_id)
          .single()

        surveyPlan = surveyData

        // Get planning plan
        if (surveyPlan?.planning_plan_id) {
          const { data: planningData } = await supabase
            .from('sectional_scheme_plans')
            .select(`
              id,
              plan_id,
              scheme_name,
              planner_id,
              planning_authority,
              approval_status,
              approval_date,
              submitted_at,
              locked
            `)
            .eq('id', surveyPlan.planning_plan_id)
            .single()

          planningPlan = planningData
        }
      }

      // Get sections with titles
      const { data: sections } = await supabase
        .from('sections')
        .select(`
          id,
          section_number,
          area,
          participation_quota,
          sectional_titles(
            id,
            title_number,
            holder_name,
            holder_id,
            registration_status,
            registration_date,
            certificate_url,
            digital_signature_id,
            examined_at,
            examined_by,
            approved_at,
            approved_by
          )
        `)
        .eq('scheme_id', scheme.id)

      // Get planner and surveyor names
      let plannerName: string | undefined
      let surveyorName: string | undefined
      if (planningPlan?.planner_id) {
        const { data: plannerProfile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', planningPlan.planner_id)
          .single()
        plannerName = plannerProfile?.name
      }
      if (surveyPlan?.surveyor_id) {
        const { data: surveyorProfile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', surveyPlan.surveyor_id)
          .single()
        surveyorName = surveyorProfile?.name
      }

      // Get planning documents
      const planningDocuments: Array<{ id: string; name: string; type: string; url: string; uploadedAt?: string }> = []
      if (planningPlan?.id) {
        const { data: planDocs } = await supabase
          .from('plan_documents')
          .select('id, file_name, file_type, storage_path, created_at')
          .eq('plan_id', planningPlan.id)

        if (planDocs) {
          for (const doc of planDocs) {
            const { data: urlData } = await supabase.storage
              .from('planning-documents')
              .createSignedUrl(doc.storage_path, 3600)

            planningDocuments.push({
              id: doc.id,
              name: doc.file_name || 'Document',
              type: doc.file_type || 'application/pdf',
              url: urlData?.signedUrl || '',
              uploadedAt: doc.created_at,
            })
          }
        }
      }

      // Get survey documents (seal certificate, etc.)
      const surveyDocuments: Array<{ id: string; name: string; type: string; url: string; uploadedAt?: string }> = []
      if (surveyPlan?.seal_certificate_url) {
        surveyDocuments.push({
          id: 'seal-cert',
          name: 'Survey Seal Certificate',
          type: 'application/pdf',
          url: surveyPlan.seal_certificate_url,
        })
      }

      // Get titles
      const titles = (sectionsData || [])
        .flatMap((section: any) =>
          (section.sectional_titles || []).map((title: any) => ({
            id: title.id,
            titleNumber: title.title_number,
            sectionNumber: section.section_number,
            holderName: title.holder_name,
            holderId: title.holder_id,
            registrationStatus: title.registration_status,
            registrationDate: title.registration_date,
            certificateUrl: title.certificate_url,
            digitalSignatureId: title.digital_signature_id,
            examinedAt: title.examined_at,
            examinedBy: title.examined_by,
            approvedAt: title.approved_at,
            approvedBy: title.approved_by,
          }))
        )
        .filter(Boolean)

      // Get digital signatures
      const signatureIds = [
        ...(surveyPlan?.digital_signature_id ? [surveyPlan.digital_signature_id] : []),
        ...titles.map((t) => t.digitalSignatureId).filter(Boolean),
      ].filter(Boolean) as string[]

      const digitalSignatures: PropertyAnalysis['digitalSignatures'] = []
      if (signatureIds.length > 0) {
        const { data: signatures } = await supabase
          .from('digital_signatures')
          .select('id, document_id, signed_by, role, pki_provider, certificate_serial, signed_at')
          .in('id', signatureIds)

        if (signatures) {
          for (const sig of signatures) {
            const { data: signerProfile } = await supabase
              .from('user_profiles')
              .select('name')
              .eq('user_id', sig.signed_by)
              .single()

            digitalSignatures.push({
              id: sig.id,
              documentId: sig.document_id,
              documentType: 'unknown',
              signedBy: sig.signed_by,
              signerName: signerProfile?.name,
              role: sig.role,
              pkiProvider: sig.pki_provider || undefined,
              certificateSerial: sig.certificate_serial || undefined,
              signedAt: sig.signed_at,
            })
          }
        }
      }

      // Get workflow history (if table exists)
      let workflowHistory: PropertyAnalysis['workflowHistory'] = []
      try {
        const { data: history } = await supabase
          .from('workflow_history')
          .select('id, from_state, to_state, user_id, reason, created_at, metadata')
          .or(`resource_id.eq.${scheme.id},resource_id.eq.${surveyPlan?.id},resource_id.eq.${planningPlan?.id}`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (history) {
          for (const h of history) {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('name')
              .eq('user_id', h.user_id)
              .single()

            workflowHistory.push({
              id: h.id,
              fromState: h.from_state,
              toState: h.to_state,
              userId: h.user_id,
              userName: userProfile?.name,
              reason: h.reason || undefined,
              createdAt: h.created_at,
              metadata: h.metadata as Record<string, unknown> | undefined,
            })
          }
        }
      } catch (error) {
        // Workflow history table may not exist yet
        logger.warn('Could not fetch workflow history', { error })
      }

      // Get spatial data
      const spatialData: PropertyAnalysis['spatialData'] = {}
      if (surveyPlan?.id) {
        // Get parent parcel geometry
        const { data: surveyData } = await supabase
          .from('survey_sectional_plans')
          .select('parent_parcel')
          .eq('id', surveyPlan.id)
          .single()

        // Get section geometries
        const sectionGeometries: PropertyAnalysis['spatialData']['sectionGeometries'] = []
        for (const section of sectionsData) {
          const { data: sectionData } = await supabase
            .from('section_geometries')
            .select('geometry, area')
            .eq('section_id', section.id)
            .single()

          if (sectionData) {
            sectionGeometries.push({
              sectionId: section.id,
              sectionNumber: section.section_number,
              geometry: JSON.stringify(sectionData.geometry),
              area: section.area,
            })
          }
        }

        spatialData.sectionGeometries = sectionGeometries
      }

      // Get validation report if available
      let validationReport: PropertyAnalysis['surveyPlan']['validationReport'] | undefined
      if (surveyPlan?.metadata) {
        const metadata = surveyPlan.metadata as Record<string, unknown>
        if (metadata.validationReport) {
          validationReport = metadata.validationReport as PropertyAnalysis['surveyPlan']['validationReport']
        }
      }

      const schemeMetadata = (scheme.metadata as Record<string, unknown>) || {}

      const analysis: PropertyAnalysis = {
        schemeNumber: scheme.scheme_number,
        schemeName: scheme.scheme_name,
        planningPlan: planningPlan
          ? {
              id: planningPlan.id,
              planId: planningPlan.plan_id,
              schemeName: planningPlan.scheme_name,
              plannerId: planningPlan.planner_id,
              plannerName,
              planningAuthority: planningPlan.planning_authority,
              approvalStatus: planningPlan.approval_status,
              approvalDate: planningPlan.approval_date,
              submittedAt: planningPlan.submitted_at,
              locked: planningPlan.locked,
              documents: planningDocuments,
            }
          : undefined,
        surveyPlan: surveyPlan
          ? {
              id: surveyPlan.id,
              surveyNumber: surveyPlan.survey_number,
              title: surveyPlan.title,
              surveyorId: surveyPlan.surveyor_id,
              surveyorName,
              status: surveyPlan.status,
              sealHash: surveyPlan.seal_hash,
              sealedAt: surveyPlan.sealed_at,
              approvedBy: surveyPlan.approved_by,
              approvedAt: surveyPlan.approval_date,
              sectionCount: sectionsData.length,
              documents: surveyDocuments,
              validationReport,
            }
          : undefined,
        scheme: {
          id: scheme.id,
          schemeNumber: scheme.scheme_number,
          schemeName: scheme.scheme_name,
          communalLandId: scheme.communal_land_id || undefined,
          communalLandCustodianName: (schemeMetadata.communal_land_custodian_name as string) || undefined,
          registrationDate: scheme.registration_date,
          bodyCorporateId: scheme.body_corporate_id || undefined,
          sections: sectionsData.map((s: any) => ({
            id: s.id,
            sectionNumber: s.section_number,
            area: s.area,
            participationQuota: s.participation_quota,
            titleNumber: s.sectional_titles?.[0]?.title_number,
            holderName: s.sectional_titles?.[0]?.holder_name,
            registrationStatus: s.sectional_titles?.[0]?.registration_status,
          })),
        },
        titles: titles.length > 0 ? titles : undefined,
        workflowHistory: workflowHistory.length > 0 ? workflowHistory : undefined,
        digitalSignatures: digitalSignatures.length > 0 ? digitalSignatures : undefined,
        spatialData: Object.keys(spatialData).length > 0 ? spatialData : undefined,
      }

      return {
        success: true,
        analysis,
      }
    } catch (error) {
      logger.error('Exception getting property analysis', error as Error, {
        schemeNumber,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get property analysis by title number
 */
export async function getPropertyAnalysisByTitle(
  titleNumber: string
): Promise<{
  success: boolean
  analysis?: PropertyAnalysis
  error?: string
}> {
  return monitor('get_property_analysis_by_title', async () => {
    const supabase = await createClient()

    try {
      // Get title with section and scheme
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          title_number,
          section_id,
          sections!inner(
            id,
            section_number,
            scheme_id,
            sectional_schemes!inner(
              scheme_number
            )
          )
        `)
        .eq('title_number', titleNumber)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Title not found',
        }
      }

      const scheme = (title as any).sections?.sectional_schemes
      const schemeNumber = scheme?.scheme_number

      if (!schemeNumber) {
        return {
          success: false,
          error: 'Scheme not found for this title',
        }
      }

      // Use the scheme-based analysis
      return getPropertyAnalysisByScheme(schemeNumber)
    } catch (error) {
      logger.error('Exception getting property analysis by title', error as Error, {
        titleNumber,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

