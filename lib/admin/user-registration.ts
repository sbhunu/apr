/**
 * User Registration Service
 * Handles user registration with credential verification and approval workflow
 */

import { createClient } from '@/lib/supabase/server'
import { ValidationError, ConflictError, SystemError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * User registration request data
 */
export interface UserRegistrationRequest {
  email: string
  name: string
  organization?: string
  requestedRole: string
  professionalRegistrationNumber?: string
  credentialDocumentId?: string
}

/**
 * User registration result
 */
export interface UserRegistrationResult {
  success: boolean
  requestId?: string
  error?: string
}

/**
 * Registration request review data
 */
export interface RegistrationReviewData {
  requestId: string
  action: 'approve' | 'reject'
  notes?: string
}

/**
 * Registration review result
 */
export interface RegistrationReviewResult {
  success: boolean
  userId?: string
  error?: string
}

/**
 * Submit user registration request
 */
export async function submitRegistrationRequest(
  data: UserRegistrationRequest
): Promise<UserRegistrationResult> {
  return monitor('submit_registration_request', async () => {
    const supabase = await createClient()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        error: 'Invalid email format',
      }
    }

    // Validate requested role exists
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('name', data.requestedRole)
      .single()

    if (roleError || !role) {
      return {
        success: false,
        error: `Invalid role: ${data.requestedRole}`,
      }
    }

    // Check if email already registered
    const { data: existingRequest, error: checkError } = await supabase
      .from('user_registration_requests')
      .select('id, status')
      .eq('email', data.email)
      .single()

    if (!checkError && existingRequest) {
      if (existingRequest.status === 'pending' || existingRequest.status === 'under_review') {
        return {
          success: false,
          error: 'Registration request already exists and is pending review',
        }
      }
    }

    // Check if user already exists in auth
    try {
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      if (!listError) {
        const emailLower = data.email.toLowerCase()
        const exists = (usersData?.users || []).some(
          (u) => (u.email || '').toLowerCase() === emailLower
        )
        if (exists) {
          return {
            success: false,
            error: 'User account already exists',
          }
        }
      }
    } catch {
      // If admin list users is unavailable due to permissions/config, fall through.
    }

    // Insert registration request
    const { data: request, error: insertError } = await supabase
      .from('user_registration_requests')
      .insert({
        email: data.email,
        name: data.name,
        organization: data.organization,
        requested_role: data.requestedRole,
        professional_registration_number: data.professionalRegistrationNumber,
        credential_document_id: data.credentialDocumentId,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      logger.error('Failed to submit registration request', insertError, {
        email: data.email,
      })
      return {
        success: false,
        error: insertError.message,
      }
    }

    logger.info('User registration request submitted', {
      requestId: request.id,
      email: data.email,
      requestedRole: data.requestedRole,
    })

    return {
      success: true,
      requestId: request.id,
    }
  })
}

/**
 * Review registration request (approve or reject)
 */
export async function reviewRegistrationRequest(
  data: RegistrationReviewData
): Promise<RegistrationReviewResult> {
  return monitor('review_registration_request', async () => {
    const supabase = await createClient()

    // Get registration request
    const { data: request, error: requestError } = await supabase
      .from('user_registration_requests')
      .select('*')
      .eq('id', data.requestId)
      .single()

    if (requestError || !request) {
      return {
        success: false,
        error: 'Registration request not found',
      }
    }

    if (request.status !== 'pending' && request.status !== 'under_review') {
      return {
        success: false,
        error: `Request cannot be ${data.action}d. Current status: ${request.status}`,
      }
    }

    const updateData: Record<string, unknown> = {
      status: data.action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      review_notes: data.notes,
      updated_at: new Date().toISOString(),
    }

    if (data.action === 'approve') {
      updateData.approved_at = new Date().toISOString()
      updateData.approval_notes = data.notes
    } else {
      updateData.rejected_at = new Date().toISOString()
      updateData.rejection_reason = data.notes
    }

    // Update request
    const { error: updateError } = await supabase
      .from('user_registration_requests')
      .update(updateData)
      .eq('id', data.requestId)

    if (updateError) {
      logger.error('Failed to review registration request', updateError, {
        requestId: data.requestId,
        action: data.action,
      })
      return {
        success: false,
        error: updateError.message,
      }
    }

    // If approved, create user account
    if (data.action === 'approve') {
      try {
        // Create user in Supabase Auth
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email: request.email,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: request.name,
            organization: request.organization,
          },
        })

        if (createError || !authUser?.user) {
          logger.error('Failed to create user account', createError ?? undefined, {
            requestId: data.requestId,
            email: request.email,
          })
          return {
            success: false,
            error: createError?.message || 'Failed to create user account',
          }
        }

        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authUser.user.id,
            name: request.name,
            email: request.email,
            role: request.requested_role,
            organization: request.organization,
            status: 'active',
          })

        if (profileError) {
          logger.error('Failed to create user profile', profileError, {
            userId: authUser.user.id,
          })
          // Don't fail the whole operation, but log the error
        }

        // Link user to registration request
        await supabase
          .from('user_registration_requests')
          .update({ user_id: authUser.user.id })
          .eq('id', data.requestId)

        logger.info('User registration approved and account created', {
          requestId: data.requestId,
          userId: authUser.user.id,
          email: request.email,
        })

        return {
          success: true,
          userId: authUser.user.id,
        }
      } catch (error) {
        logger.error('Exception during user account creation', error as Error, {
          requestId: data.requestId,
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    logger.info('User registration request reviewed', {
      requestId: data.requestId,
      action: data.action,
    })

    return {
      success: true,
    }
  })
}

/**
 * Get registration requests
 */
export async function getRegistrationRequests(filters?: {
  status?: string
  requestedRole?: string
}): Promise<{
  success: boolean
  requests?: Array<Record<string, unknown>>
  error?: string
}> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('user_registration_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.requestedRole) {
      query = query.eq('requested_role', filters.requestedRole)
    }

    const { data: requests, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      requests: requests || [],
    }
  } catch (error) {
    logger.error('Failed to get registration requests', error as Error, { filters })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

