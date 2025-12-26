/**
 * Survey Service
 * Provides helpers for survey plan management
 */

import { createClient } from '@/lib/supabase/server'
import { monitor } from '@/lib/monitoring'

export interface SurveyPlanSummary {
  id: string
  plan_number: string
  planner_name: string
  status: string
  approved_at?: string
  sealed_at?: string
  seal_hash?: string
}

export async function getPendingSurveyPlans(): Promise<{
  success: boolean
  plans?: SurveyPlanSummary[]
  error?: string
}> {
  return monitor('get_pending_survey_plans', async () => {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase
        .from('survey_sectional_plans')
        .select(`
          id,
          plan_number,
          planner_name,
          status,
          approved_at,
          sealed_at,
          seal_hash
        `)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })

      if (error) {
        throw error
      }

      return {
        success: true,
        plans: data || [],
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

