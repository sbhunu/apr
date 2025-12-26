/**
 * Certificate Generation Service
 * Handles generation of QR-coded, hash-secured title certificates
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { templateManager } from '@/lib/documents/template-manager'
import { BaseTemplate } from '@/lib/documents/base-template'
import { uploadDocumentServer } from '@/lib/storage/documents'
import { createPKIManager } from '@/lib/pki/pki-manager'
import { createHash } from 'crypto'
import { CertificateData } from '@/lib/documents/types'

/**
 * Certificate generation result
 */
export interface CertificateGenerationResult {
  success: boolean
  certificateUrl?: string
  certificateHash?: string
  qrCode?: string
  verificationUrl?: string
  digitalSignatureId?: string
  error?: string
}

/**
 * Generate verification URL for a certificate
 */
export function generateVerificationUrl(
  titleId: string,
  certificateHash: string,
  baseUrl?: string
): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base}/verify/certificate/${titleId}?hash=${certificateHash}`
}

/**
 * Generate certificate for a registered title
 */
export async function generateTitleCertificate(
  titleId: string,
  options?: {
    templateVersion?: string
    includeQRCode?: boolean
    includeSignature?: boolean
  }
): Promise<CertificateGenerationResult> {
  return monitor('generate_title_certificate', async () => {
    const supabase = await createClient()

    try {
      // Get title with all related data
      // Use separate queries to avoid complex nested joins
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          title_number,
          registration_number,
          registration_date,
          holder_name,
          holder_type,
          holder_id_number,
          conditions,
          restrictions,
          certificate_url,
          certificate_hash,
          qr_code,
          section_id
        `)
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Title not found',
        }
      }

      // Get section data
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select(`
          id,
          section_number,
          area,
          participation_quota,
          scheme_id
        `)
        .eq('id', title.section_id)
        .single()

      if (sectionError || !section) {
        return {
          success: false,
          error: 'Section not found',
        }
      }

      // Get scheme data
      const { data: scheme, error: schemeError } = await supabase
        .from('sectional_schemes')
        .select(`
          id,
          scheme_number,
          scheme_name
        `)
        .eq('id', section.scheme_id)
        .single()

      if (schemeError || !scheme) {
        return {
          success: false,
          error: 'Scheme not found',
        }
      }

      // Get planning plan location if available
      let location: string | undefined
      try {
        const { data: surveyPlan } = await supabase
          .from('survey_sectional_plans')
          .select('planning_plan_id')
          .eq('id', scheme.survey_plan_id || '')
          .single()

        if (surveyPlan?.planning_plan_id) {
          const { data: planningPlan } = await supabase
            .from('sectional_scheme_plans')
            .select('location')
            .eq('id', surveyPlan.planning_plan_id)
            .single()

          location = planningPlan?.location
        }
      } catch (error) {
        // Location is optional, continue without it
        logger.warn('Could not fetch planning plan location', { titleId })
      }

      // Verify title is registered
      if (title.registration_status !== 'registered') {
        return {
          success: false,
          error: `Title must be registered before generating certificate. Current status: ${title.registration_status || 'unknown'}`,
        }
      }

      // Prepare certificate data
      const certData: CertificateData = {
        titleNumber: title.title_number || '',
        schemeName: scheme?.scheme_name || '',
        schemeNumber: scheme?.scheme_number || '',
        sectionNumber: section?.section_number || '',
        holderName: title.holder_name,
        holderId: title.holder_id_number || undefined,
        registrationDate: title.registration_date || new Date().toISOString(),
        area: section?.area || 0,
        participationQuota: section?.participation_quota || 0,
        conditions: title.conditions || undefined,
        restrictions: title.restrictions || undefined,
        verificationUrl: '', // Will be set after hash calculation
      }

      // Get template (use selected template or default)
      const templateId = options?.templateVersion || 'certificate-sectional-title'
      const template = templateManager.getTemplate(templateId, 'certificate')
      
      if (!template) {
        return {
          success: false,
          error: `Template not found: ${templateId}`,
        }
      }

      // Generate certificate using selected template
      const pdfBuffer = await template.render(certData)

      // Calculate document hash
      const certificateHash = createHash('sha256').update(pdfBuffer).digest('hex')

      // Generate verification URL
      const verificationUrl = generateVerificationUrl(titleId, certificateHash)
      certData.verificationUrl = verificationUrl

      // QR code is already included in the template render
      const finalPdfBuffer = pdfBuffer

      // Generate QR code data
      const qrCodeData = verificationUrl

      // Apply digital signature if requested
      let digitalSignatureId: string | undefined
      if (options?.includeSignature !== false) {
        try {
          const pkiManager = createPKIManager()
          const signatureResult = await pkiManager.signDocument({
            documentHash: certificateHash,
            documentId: titleId,
            signerId: 'system',
            signerName: 'APR System',
            signerRole: 'registrar',
            metadata: {
              titleId,
              titleNumber: certData.titleNumber,
              registrationDate: certData.registrationDate,
            },
          })

          if (signatureResult.success && signatureResult.signatureId) {
            digitalSignatureId = signatureResult.signatureId
          } else {
            logger.warn('PKI signature failed, continuing without signature', {
              titleId,
              error: signatureResult.error,
            })
          }
        } catch (pkiError) {
          logger.warn('PKI signature exception, continuing without signature', {
            titleId,
            error: pkiError instanceof Error ? pkiError.message : String(pkiError),
          })
        }
      }

      // Upload certificate to Supabase Storage
      const filePrefix = certificateHash.substring(0, 16)
      const bytes = new Uint8Array(finalPdfBuffer)
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const pdfFile = new File([copy.buffer], `${filePrefix}.pdf`, {
        type: 'application/pdf',
      })

      const uploadResult = await uploadDocumentServer({
        file: pdfFile,
        folder: `certificates/${titleId}`,
        documentType: 'deeds_certificate',
        userId: 'system',
        metadata: {
          titleId,
          titleNumber: certData.titleNumber,
          certificateHash,
          generatedAt: new Date().toISOString(),
          templateVersion: template.getMetadata().version,
          templateId: template.getMetadata().id,
        },
      })

      if (!uploadResult.success || !uploadResult.fileUrl) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload certificate',
        }
      }
      
      const certificateUrl = uploadResult.fileUrl

      // Update title with certificate information
      const { error: updateError } = await supabase
        .from('sectional_titles')
        .update({
          certificate_url: certificateUrl,
          certificate_hash: certificateHash,
          qr_code: qrCodeData,
          digital_signature_id: digitalSignatureId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', titleId)

      if (updateError) {
        logger.error('Failed to update title with certificate info', updateError, {
          titleId,
        })
        // Don't fail - certificate is generated and uploaded
      }

      logger.info('Certificate generated successfully', {
        titleId,
        titleNumber: certData.titleNumber,
        certificateHash,
        certificateUrl,
      })

      return {
        success: true,
        certificateUrl,
        certificateHash,
        qrCode: qrCodeData,
        verificationUrl,
        digitalSignatureId,
      }
    } catch (error) {
      logger.error('Exception generating certificate', error as Error, {
        titleId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Generate certificates for multiple titles (batch)
 */
export async function generateCertificatesBatch(
  titleIds: string[],
  options?: {
    templateVersion?: string
    includeQRCode?: boolean
    includeSignature?: boolean
  }
): Promise<{
  success: boolean
  results: Array<{
    titleId: string
    result: CertificateGenerationResult
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}> {
  const results: Array<{ titleId: string; result: CertificateGenerationResult }> = []

  for (const titleId of titleIds) {
    const result = await generateTitleCertificate(titleId, options)
    results.push({ titleId, result })
  }

  const successful = results.filter((r) => r.result.success).length
  const failed = results.length - successful

  return {
    success: failed === 0,
    results,
    summary: {
      total: titleIds.length,
      successful,
      failed,
    },
  }
}

/**
 * Get certificate for a title
 */
export async function getTitleCertificate(
  titleId: string
): Promise<{
  success: boolean
  certificateUrl?: string
  certificateHash?: string
  qrCode?: string
  verificationUrl?: string
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: title, error } = await supabase
      .from('apr.sectional_titles')
      .select('certificate_url, certificate_hash, qr_code')
      .eq('id', titleId)
      .single()

    if (error || !title) {
      return {
        success: false,
        error: 'Title not found',
      }
    }

    if (!title.certificate_url || !title.certificate_hash) {
      return {
        success: false,
        error: 'Certificate not yet generated',
      }
    }

    const verificationUrl = title.qr_code || generateVerificationUrl(titleId, title.certificate_hash)

    return {
      success: true,
      certificateUrl: title.certificate_url,
      certificateHash: title.certificate_hash,
      qrCode: title.qr_code || undefined,
      verificationUrl,
    }
  } catch (error) {
    logger.error('Exception getting certificate', error as Error, { titleId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Regenerate certificate (for versioning/updates)
 */
export async function regenerateCertificate(
  titleId: string,
  reason: string,
  options?: {
    templateVersion?: string
    includeQRCode?: boolean
    includeSignature?: boolean
  }
): Promise<CertificateGenerationResult> {
  // Archive old certificate (store in metadata)
  const supabase = await createClient()
  const { data: oldTitle } = await supabase
    .from('apr.sectional_titles')
    .select('certificate_hash, certificate_url, metadata')
    .eq('id', titleId)
    .single()

  if (oldTitle?.certificate_hash) {
    const metadata = (oldTitle.metadata as Record<string, unknown>) || {}
    const certificateHistory = (metadata.certificateHistory as Array<{
      hash: string
      url: string
      regeneratedAt: string
      reason: string
    }>) || []

    certificateHistory.push({
      hash: oldTitle.certificate_hash,
      url: oldTitle.certificate_url || '',
      regeneratedAt: new Date().toISOString(),
      reason,
    })

    await supabase
      .from('apr.sectional_titles')
      .update({
        metadata: {
          ...metadata,
          certificateHistory,
        },
      })
      .eq('id', titleId)
  }

  // Generate new certificate
  return await generateTitleCertificate(titleId, options)
}

