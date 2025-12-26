/**
 * Title Registration Service
 * Handles title registration by Registrar of Deeds
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { transitionDeedsState } from '@/lib/workflows/deeds-workflow'
import { DeedState } from '@/types/workflows'
import { signDocument } from '@/lib/signatures/signature-service'
import { createHash } from 'crypto'
import { generateTitleCertificate } from '@/lib/deeds/certificate-service'

/**
 * Title number allocation result
 */
export interface TitleNumberAllocation {
  success: boolean
  titleNumber?: string
  allocationId?: string
  year?: number
  provinceCode?: string
  sequenceNumber?: number
  reservationExpiresAt?: string
  error?: string
}

/**
 * Title registration result
 */
export interface TitleRegistrationResult {
  success: boolean
  titleId?: string
  titleNumber?: string
  registrationNumber?: string
  registrationDate?: string
  certificateUrl?: string
  certificateHash?: string
  qrCode?: string
  digitalSignatureId?: string
  error?: string
}

/**
 * Allocate title number
 */
export async function allocateTitleNumber(
  provinceCode: string,
  year?: number,
  reserveDurationHours: number = 24
): Promise<TitleNumberAllocation> {
  return monitor('allocate_title_number', async () => {
    const supabase = await createClient()

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication required',
        }
      }

      // Call RPC function for atomic allocation
      const { data, error } = await supabase.rpc('allocate_title_number', {
        p_province_code: provinceCode,
        p_year: year || null,
        p_user_id: user.id,
        p_reserve_duration_hours: reserveDurationHours,
      })

      if (error) {
        logger.error('Failed to allocate title number', error as Error, {
          provinceCode,
          year,
        })
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        titleNumber: data.title_number,
        allocationId: data.allocation_id,
        year: data.year,
        provinceCode: data.province_code,
        sequenceNumber: data.sequence_number,
        reservationExpiresAt: data.reservation_expires_at,
      }
    } catch (error) {
      logger.error('Exception allocating title number', error as Error, {
        provinceCode,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Register approved title
 */
export async function registerTitle(
  titleId: string,
  userId: string,
  provinceCode: string,
  registrarNotes?: string
): Promise<TitleRegistrationResult> {
  return monitor('register_title', async () => {
    const supabase = await createClient()

    try {
      // Get title with section and scheme data
      const { data: title, error: titleError } = await supabase
        .from('sectional_titles')
        .select(`
          id,
          section_id,
          registration_status,
          sections!inner(
            section_number,
            sectional_schemes!inner(
              scheme_number,
              scheme_name
            )
          )
        `)
        .eq('id', titleId)
        .single()

      if (titleError || !title) {
        return {
          success: false,
          error: 'Title not found',
        }
      }

      // Verify title is approved
      if (title.registration_status !== 'approved') {
        return {
          success: false,
          error: `Title must be approved before registration. Current status: ${title.registration_status}`,
        }
      }

      // Allocate title number
      const allocation = await allocateTitleNumber(provinceCode)
      if (!allocation.success || !allocation.titleNumber || !allocation.allocationId) {
        return {
          success: false,
          error: allocation.error || 'Failed to allocate title number',
        }
      }

      const registrationDate = new Date()
      const registrationNumber = allocation.titleNumber

      // Generate certificate hash (will be updated after certificate generation)
      const certificateHash = createHash('sha256')
        .update(JSON.stringify({
          titleId,
          titleNumber: allocation.titleNumber,
          registrationDate: registrationDate.toISOString(),
          userId,
        }))
        .digest('hex')

      // Apply registrar signature via PKI
      let digitalSignatureId: string | undefined
      try {
        // Get registrar profile for signature metadata
        const { data: registrarProfile } = await supabase
          .from('apr.user_profiles')
          .select('name, role')
          .eq('id', userId)
          .single()

        // Sign document with PKI
        const signatureResult = await signDocument({
          documentId: titleId,
          documentType: 'deeds_registration',
          workflowStage: 'title_registration',
          signerId: userId,
          signerName: registrarProfile?.name || 'Unknown',
          signerRole: registrarProfile?.role || 'registrar',
          signedAt: registrationDate.toISOString(),
          documentHash: certificateHash,
          approvalType: 'register',
          notes: registrarNotes,
        })

        if (signatureResult.success && signatureResult.signatureId) {
          digitalSignatureId = signatureResult.signatureId
          logger.info('PKI signature applied to title registration', {
            titleId,
            signatureId: signatureResult.signatureId,
          })
        } else {
          logger.warn('PKI signature failed, continuing without signature', {
            titleId,
            error: signatureResult.error,
          })
        }
      } catch (pkiError) {
        logger.warn('PKI signature exception, continuing without signature', pkiError as Error, {
          titleId,
        })
      }

      // Transition workflow state
      const transitionResult = await transitionDeedsState(
        'approved',
        'registered',
        {
          userId,
          resourceId: titleId,
          metadata: {
            titleNumber: allocation.titleNumber,
            registrationDate: registrationDate.toISOString(),
            registrarNotes,
          },
        },
        `Title registered: ${allocation.titleNumber}`
      )

      if (!transitionResult.success) {
        return {
          success: false,
          error: `Workflow transition failed: ${transitionResult.error}`,
        }
      }

      // Update title with registration details
      const { error: updateError } = await supabase
        .from('sectional_titles')
        .update({
          registration_status: 'registered',
          title_number: allocation.titleNumber,
          registration_number: registrationNumber,
          registration_date: registrationDate.toISOString(),
          registered_by: userId,
          digital_signature_id: digitalSignatureId,
          certificate_hash: certificateHash,
          updated_at: registrationDate.toISOString(),
          updated_by: userId,
          metadata: {
            ...((title.metadata as Record<string, unknown>) || {}),
            registrationNotes: registrarNotes,
            registrationDate: registrationDate.toISOString(),
          },
        })
        .eq('id', titleId)

      if (updateError) {
        logger.error('Failed to update title', updateError, {
          titleId,
          userId,
        })
        return {
          success: false,
          error: `Failed to update title: ${updateError.message}`,
        }
      }

      // Confirm title number allocation
      const { error: confirmError } = await supabase.rpc('confirm_title_number_allocation', {
        p_allocation_id: allocation.allocationId,
        p_title_id: titleId,
        p_user_id: userId,
      })

      if (confirmError) {
        logger.warn('Failed to confirm title number allocation', confirmError, {
          allocationId: allocation.allocationId,
        })
        // Don't fail registration if confirmation fails
      }

      logger.info('Title registered successfully', {
        titleId,
        titleNumber: allocation.titleNumber,
        userId,
      })

      // Automatically generate certificate after registration
      let certificateUrl: string | undefined
      let finalCertificateHash: string | undefined
      let qrCode: string | undefined
      try {
        logger.info('Generating certificate for registered title', { titleId })
        const certResult = await generateTitleCertificate(titleId, {
          includeQRCode: true,
          includeSignature: true,
        })

        if (certResult.success && certResult.certificateUrl) {
          certificateUrl = certResult.certificateUrl
          finalCertificateHash = certResult.certificateHash || certificateHash
          qrCode = certResult.qrCode

          // Update title with certificate details
          const { error: certUpdateError } = await supabase
            .from('sectional_titles')
            .update({
              certificate_url: certificateUrl,
              certificate_hash: finalCertificateHash,
              qr_code: qrCode,
            })
            .eq('id', titleId)

          if (certUpdateError) {
            logger.warn('Failed to update title with certificate URL', certUpdateError, {
              titleId,
              certificateUrl,
            })
          } else {
            logger.info('Certificate generated and linked to title', {
              titleId,
              certificateUrl,
              certificateHash: finalCertificateHash,
            })
          }
        } else {
          logger.warn('Certificate generation failed, but registration succeeded', {
            titleId,
            error: certResult.error,
          })
        }
      } catch (certError) {
        // Don't fail registration if certificate generation fails
        logger.error('Exception generating certificate after registration', certError as Error, {
          titleId,
        })
      }

      // Trigger workflow to Operations module if title registered (as per Integrated Plan BPMN)
      try {
        const { triggerNextModule } = await import('@/lib/workflows/triggers')
        await triggerNextModule({
          fromModule: 'deeds',
          toModule: 'operations',
          entityId: titleId,
          entityType: 'sectional_title',
          triggerType: 'title_registered',
          triggeredBy: userId,
          metadata: {
            titleId,
            titleNumber: allocation.titleNumber,
            registrationNumber,
            registrationDate: registrationDate.toISOString(),
            sectionId: title.section_id,
            sectionNumber: (title.sections as any)?.section_number,
            schemeNumber: (title.sections as any)?.sectional_schemes?.scheme_number,
            schemeName: (title.sections as any)?.sectional_schemes?.scheme_name,
          },
        })

        logger.info('Workflow triggered: Title Registration → Operations', {
          titleId,
          userId,
        })
      } catch (triggerError) {
        logger.error('Failed to trigger Operations workflow', triggerError as Error, {
          titleId,
        })
        // Don't fail the registration if trigger fails - log and continue
      }

      return {
        success: true,
        titleId,
        titleNumber: allocation.titleNumber,
        registrationNumber,
        registrationDate: registrationDate.toISOString(),
        certificateUrl,
        certificateHash: finalCertificateHash || certificateHash,
        qrCode,
        digitalSignatureId,
      }
    } catch (error) {
      logger.error('Exception registering title', error as Error, {
        titleId,
        userId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get approved titles ready for registration
 */
export async function getApprovedTitlesForRegistration(): Promise<{
  success: boolean
  titles?: Array<{
    id: string
    titleNumber: string
    sectionNumber: string
    holderName: string
    approvedAt: string
    schemeNumber: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: titles, error } = await supabase
      .from('sectional_titles')
      .select(`
        id,
        title_number,
        holder_name,
        approved_at,
        sections!inner(
          section_number,
          sectional_schemes!inner(
            scheme_number
          )
        )
      `)
      .eq('registration_status', 'approved')
      .order('approved_at', { ascending: true })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      titles:
        titles?.map((t: any) => ({
          id: t.id,
          titleNumber: t.title_number || 'DRAFT',
          sectionNumber: t.sections?.section_number || '',
          holderName: t.holder_name,
          approvedAt: t.approved_at || '',
          schemeNumber: (t.sections as any)?.sectional_schemes?.scheme_number || '',
        })) || [],
    }
  } catch (error) {
    logger.error('Exception getting approved titles', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get registration history for a title
 */
export async function getTitleRegistrationHistory(
  titleId: string
): Promise<{
  success: boolean
  history?: Array<{
    registeredAt: string
    registeredBy: string
    titleNumber: string
    registrationNumber: string
  }>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: title, error } = await supabase
      .from('sectional_titles')
      .select('registration_date, registered_by, title_number, registration_number')
      .eq('id', titleId)
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!title.registration_date) {
      return {
        success: true,
        history: [],
      }
    }

    return {
      success: true,
      history: [
        {
          registeredAt: title.registration_date,
          registeredBy: title.registered_by || '',
          titleNumber: title.title_number || '',
          registrationNumber: title.registration_number || '',
        },
      ],
    }
  } catch (error) {
    logger.error('Exception getting registration history', error as Error, {
      titleId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

