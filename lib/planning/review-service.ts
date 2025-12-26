/**
 * Planning Review Service
 * Handles review operations for Planning Authority
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'
import { createWorkflowManager } from '@/lib/workflows/manager'
import { PlanningState } from '@/types/workflows'
import { signDocument } from '@/lib/signatures/signature-service'
import { createHash } from 'crypto'

/**
 * Review checklist item
 */
export interface ReviewChecklistItem {
  id: string
  category: string
  item: string
  required: boolean
  checked: boolean
  notes?: string
}

/**
 * Review submission data
 */
export interface ReviewSubmissionData {
  planId: string
  reviewType: 'initial_review' | 'technical_review' | 'compliance_review' | 'amendment_review' | 'final_review'
  checklist: ReviewChecklistItem[]
  reviewNotes: string
  findings: Array<{
    severity: 'info' | 'warning' | 'error'
    category: string
    description: string
    location?: string
  }>
  recommendations?: string
  decision: 'approved' | 'rejected' | 'requires_amendment'
  reason?: string
}

/**
 * Review result
 */
export interface ReviewResult {
  success: boolean
  reviewId?: string
  error?: string
}

/**
 * Get pending schemes for review
 */
export async function getPendingSchemes(filters?: {
  reviewerId?: string
  status?: string
}): Promise<{
  success: boolean
  schemes?: Array<Record<string, unknown>>
  error?: string
}> {
  return monitor('get_pending_schemes', async () => {
    const supabase = await createClient()

    try {
      let query = supabase
        .from('sectional_scheme_plans')
        .select('*')
        .in('status', ['submitted', 'under_review_planning_authority', 'returned_for_amendment'])
        .order('submitted_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      const { data: schemes, error } = await query

      if (error) {
        throw error
      }

      return {
        success: true,
        schemes: schemes || [],
      }
    } catch (error) {
      logger.error('Failed to get pending schemes', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Start review
 */
export async function startReview(
  planId: string,
  reviewerId: string,
  reviewType: ReviewSubmissionData['reviewType']
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  return monitor('start_review', async () => {
    const supabase = await createClient()

    try {
      // Get reviewer name
      const { data: reviewer } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', reviewerId)
        .single()

      // Create review record
      const { data: review, error } = await supabase
        .from('planning_reviews')
        .insert({
          plan_id: planId,
          reviewer_id: reviewerId,
          reviewer_name: reviewer?.name,
          review_type: reviewType,
          status: 'in_progress',
        })
        .select('id')
        .single()

      if (error) {
        throw error
      }

      // Update plan status to under_review
      const workflowManager = createWorkflowManager(supabase)
      await workflowManager.transitionPlanning(
        planId,
        'submitted',
        'under_review',
        {
          userId: reviewerId,
          userRole: 'planning_authority',
          entityId: planId,
        },
        `Review started: ${reviewType}`
      )

      logger.info('Review started', {
        reviewId: review.id,
        planId,
        reviewerId,
        reviewType,
      })

      return {
        success: true,
        reviewId: review.id,
      }
    } catch (error) {
      logger.error('Failed to start review', error as Error, {
        planId,
        reviewerId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Submit review decision
 */
export async function submitReview(
  data: ReviewSubmissionData,
  reviewerId: string
): Promise<ReviewResult> {
  return monitor('submit_review', async () => {
    const supabase = await createClient()

    try {
      // Update review record
      const { error: reviewError } = await supabase
        .from('planning_reviews')
        .update({
          status: data.decision === 'approved' ? 'approved' : data.decision === 'rejected' ? 'rejected' : 'requires_amendment',
          review_notes: data.reviewNotes,
          findings: data.findings,
          recommendations: data.recommendations,
          completed_at: new Date().toISOString(),
          metadata: {
            checklist: data.checklist,
          },
        })
        .eq('plan_id', data.planId)
        .eq('reviewer_id', reviewerId)
        .eq('status', 'in_progress')

      if (reviewError) {
        throw reviewError
      }

      // Update plan status via workflow
      const workflowManager = createWorkflowManager(supabase)
      let newState: PlanningState

      if (data.decision === 'approved') {
        newState = 'approved'
      } else if (data.decision === 'rejected') {
        newState = 'rejected'
      } else {
        newState = 'revision_requested'
      }

      const transitionResult = await workflowManager.transitionPlanning(
        data.planId,
        'under_review',
        newState,
        {
          userId: reviewerId,
          userRole: 'planning_authority',
          entityId: data.planId,
        },
        data.reason || data.reviewNotes
      )

      if (!transitionResult.success) {
        throw new Error(transitionResult.error || 'Workflow transition failed')
      }

      // Map workflow state to database status
      // Database uses 'approved_planning_authority' but workflow uses 'approved'
      let dbStatus: string
      if (newState === 'approved') {
        dbStatus = 'approved_planning_authority'
      } else if (newState === 'rejected') {
        dbStatus = 'rejected_planning_authority'
      } else if (newState === 'revision_requested') {
        dbStatus = 'returned_for_amendment'
      } else if (newState === 'under_review') {
        dbStatus = 'under_review_planning_authority'
      } else {
        dbStatus = newState
      }

      // Update plan with review decision details
      const updateData: Record<string, unknown> = {
        status: dbStatus,
        workflow_state: newState,
        updated_at: new Date().toISOString(),
        updated_by: reviewerId,
      }

      if (data.decision === 'approved') {
        updateData.approved_at = new Date().toISOString()
        updateData.approved_by = reviewerId
        updateData.approval_number = `APPROVAL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`
      } else if (data.decision === 'rejected') {
        updateData.rejected_at = new Date().toISOString()
        updateData.rejected_by = reviewerId
        updateData.rejection_reason = data.reason || data.reviewNotes
      } else {
        updateData.amendment_requested_at = new Date().toISOString()
        updateData.amendment_requested_by = reviewerId
        updateData.amendment_notes = data.reviewNotes
      }

      const { error: planError } = await supabase
        .from('sectional_scheme_plans')
        .update(updateData)
        .eq('id', data.planId)

      if (planError) {
        throw planError
      }

      // Add digital signature for approval/rejection decisions
      if (data.decision === 'approved' || data.decision === 'rejected') {
        try {
          // Get reviewer profile for signature metadata
          const { data: reviewerProfile } = await supabase
            .from('user_profiles')
            .select('name, role')
            .eq('id', reviewerId)
            .single()

          // Generate document hash
          const documentHash = createHash('sha256')
            .update(
              JSON.stringify({
                planId: data.planId,
                decision: data.decision,
                reviewNotes: data.reviewNotes,
                timestamp: new Date().toISOString(),
              })
            )
            .digest('hex')

          // Sign document
          const signatureResult = await signDocument({
            documentId: data.planId,
            documentType: 'planning_approval',
            workflowStage: 'planning_review',
            signerId: reviewerId,
            signerName: reviewerProfile?.name || 'Unknown',
            signerRole: reviewerProfile?.role || 'planning_officer',
            signedAt: new Date().toISOString(),
            documentHash,
            approvalType: data.decision === 'approved' ? 'approve' : 'reject',
            notes: data.reviewNotes,
          })

          if (!signatureResult.success) {
            logger.warn('Digital signature failed for planning approval', {
              planId: data.planId,
              error: signatureResult.error,
            })
            // Continue without signature - don't fail the approval
          } else {
            logger.info('Digital signature applied to planning approval', {
              planId: data.planId,
              signatureId: signatureResult.signatureId,
            })
          }
        } catch (sigError) {
          logger.warn('Exception applying digital signature', sigError as Error, {
            planId: data.planId,
          })
          // Continue without signature - don't fail the approval
        }
      }

      logger.info('Review submitted', {
        planId: data.planId,
        reviewerId,
        decision: data.decision,
      })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Failed to submit review', error as Error, {
        planId: data.planId,
        reviewerId,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Get review history for a plan
 */
export async function getReviewHistory(
  planId: string
): Promise<{
  success: boolean
  reviews?: Array<Record<string, unknown>>
  error?: string
}> {
  const supabase = await createClient()

  try {
    const { data: reviews, error } = await supabase
      .from('apr.planning_reviews')
      .select('*')
      .eq('plan_id', planId)
      .order('started_at', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      reviews: reviews || [],
    }
  } catch (error) {
    logger.error('Failed to get review history', error as Error, { planId })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch approve/reject schemes
 */
export async function batchReviewSchemes(
  planIds: string[],
  decision: 'approved' | 'rejected',
  reviewerId: string,
  reason: string
): Promise<{
  success: boolean
  results: Array<{ planId: string; success: boolean; error?: string }>
}> {
  const results = await Promise.all(
    planIds.map(async (planId) => {
      const reviewData: ReviewSubmissionData = {
        planId,
        reviewType: 'initial_review',
        checklist: [],
        reviewNotes: reason,
        findings: [],
        decision,
        reason,
      }

      const result = await submitReview(reviewData, reviewerId)
      return {
        planId,
        success: result.success,
        error: result.error,
      }
    })
  )

  return {
    success: results.every((r) => r.success),
    results,
  }
}

