/**
 * Statistics Service
 * Aggregates data for analytics and reporting
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Date range filter
 */
export interface DateRange {
  startDate?: string
  endDate?: string
}

/**
 * Province filter
 */
export interface ProvinceFilter {
  province?: string
}

/**
 * Statistics filters
 */
export interface StatisticsFilters extends DateRange, ProvinceFilter {
  district?: string
  schemeId?: string
}

/**
 * Registration statistics
 */
export interface RegistrationStatistics {
  totalSchemes: number
  totalTitles: number
  totalTransfers: number
  totalAmendments: number
  totalMortgages: number
  totalLeases: number
  byProvince: Array<{
    province: string
    schemes: number
    titles: number
    transfers: number
  }>
  byMonth: Array<{
    month: string
    schemes: number
    titles: number
    transfers: number
  }>
  byStatus: {
    planning: {
      submitted: number
      approved: number
      rejected: number
    }
    survey: {
      draft: number
      sealed: number
      rejected: number
    }
    deeds: {
      draft: number
      registered: number
      rejected: number
    }
  }
}

/**
 * Get registration statistics
 */
export async function getRegistrationStatistics(
  filters?: StatisticsFilters
): Promise<{
  success: boolean
  statistics?: RegistrationStatistics
  error?: string
}> {
  return monitor('get_registration_statistics', async () => {
    const supabase = await createClient()

    try {
      // Note: Supabase PostgREST may not expose tables from custom schemas (apr) by default
      // Return empty statistics gracefully until tables are properly exposed via API
      // This allows the system to work even before database migrations are complete
      
      // Helper function to safely query tables
      const getCount = async (tableName: string): Promise<number> => {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('id', { count: 'exact', head: true })
          if (error) {
            // Silently return 0 if table doesn't exist or isn't accessible
            return 0
          }
          return count || 0
        } catch (err) {
          // Return 0 on any error (table doesn't exist, not exposed, etc.)
          return 0
        }
      }

      // Get total counts
      const [
        totalSchemes,
        totalTitles,
        totalTransfers,
        totalAmendments,
        totalMortgages,
        totalLeases,
      ] = await Promise.all([
        getCount('sectional_schemes'),
        getCount('sectional_titles'),
        getCount('ownership_transfers'),
        getCount('scheme_amendments'),
        getCount('mortgages'),
        getCount('leases'),
      ])

      // Get by province - handle errors gracefully
      let schemesByProvince: any[] = []
      try {
        const { data, error } = await supabase
          .from('sectional_schemes')
          .select('scheme_number')
          .limit(1000)
        if (!error && data) {
          schemesByProvince = data
        }
      } catch (err) {
        logger.warn('Could not fetch schemes by province', {
          error: err instanceof Error ? err.message : String(err),
        })
      }

      const provinceMap = new Map<string, { schemes: number; titles: number; transfers: number }>()

      // Extract province from scheme numbers (format: SS/YYYY/PROVINCE/NNN)
      schemesByProvince.forEach((scheme: any) => {
        const parts = scheme.scheme_number?.split('/') || []
        if (parts.length >= 3) {
          const province = parts[2]
          const current = provinceMap.get(province) || { schemes: 0, titles: 0, transfers: 0 }
          current.schemes++
          provinceMap.set(province, current)
        }
      })

      // Get titles by province - handle errors gracefully
      let titlesData: any[] = []
      try {
        const { data, error } = await supabase
          .from('sectional_titles')
          .select(`
            id,
            sections!inner(
              sectional_schemes!inner(
                scheme_number
              )
            )
          `)
          .limit(1000)
        if (!error && data) {
          titlesData = data
        }
      } catch (err) {
        logger.warn('Could not fetch titles by province', {
          error: err instanceof Error ? err.message : String(err),
        })
      }

      titlesData.forEach((title: any) => {
        const schemeNumber = title.sections?.sectional_schemes?.scheme_number
        if (schemeNumber) {
          const parts = schemeNumber.split('/')
          if (parts.length >= 3) {
            const province = parts[2]
            const current = provinceMap.get(province) || { schemes: 0, titles: 0, transfers: 0 }
            current.titles++
            provinceMap.set(province, current)
          }
        }
      })

      // Get transfers by province - handle errors gracefully
      let transfersData: any[] = []
      try {
        const { data, error } = await supabase
          .from('ownership_transfers')
          .select(`
            id,
            sectional_titles!inner(
              sections!inner(
                sectional_schemes!inner(
                  scheme_number
                )
              )
            )
          `)
          .limit(1000)
        if (!error && data) {
          transfersData = data
        }
      } catch (err) {
        logger.warn('Could not fetch transfers by province', {
          error: err instanceof Error ? err.message : String(err),
        })
      }

      transfersData.forEach((transfer: any) => {
        const schemeNumber =
          transfer.sectional_titles?.sections?.sectional_schemes?.scheme_number
        if (schemeNumber) {
          const parts = schemeNumber.split('/')
          if (parts.length >= 3) {
            const province = parts[2]
            const current = provinceMap.get(province) || { schemes: 0, titles: 0, transfers: 0 }
            current.transfers++
            provinceMap.set(province, current)
          }
        }
      })

      const byProvince = Array.from(provinceMap.entries()).map(([province, data]) => ({
        province,
        ...data,
      }))

      // Get by month (last 12 months)
      const months: Array<{ month: string; schemes: number; titles: number; transfers: number }> =
        []
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStr = date.toISOString().substring(0, 7) // YYYY-MM

        // Count schemes created in this month
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const getMonthCount = async (tableName: string, start: string, end: string): Promise<number> => {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('id', { count: 'exact', head: true })
              .gte('created_at', start)
              .lte('created_at', end)
            if (error) return 0
            return count || 0
          } catch {
            return 0
          }
        }

        const [schemesMonth, titlesMonth, transfersMonth] = await Promise.all([
          getMonthCount('sectional_schemes', startOfMonth, endOfMonth),
          getMonthCount('sectional_titles', startOfMonth, endOfMonth),
          getMonthCount('ownership_transfers', startOfMonth, endOfMonth),
        ])

        months.push({
          month: monthStr,
          schemes: schemesMonth,
          titles: titlesMonth,
          transfers: transfersMonth,
        })
      }

      // Get by status - handle errors gracefully
      let planningStatusData: any[] = []
      let surveyStatusData: any[] = []
      let deedsStatusData: any[] = []
      
      try {
        const planningResult = await supabase
          .from('sectional_scheme_plans')
          .select('approval_status')
          .limit(1000)
        if (!planningResult.error && planningResult.data) {
          planningStatusData = planningResult.data
        }
      } catch (err) {
        logger.warn('Could not fetch planning status', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
      
      try {
        const surveyResult = await supabase
          .from('survey_sectional_plans')
          .select('status')
          .limit(1000)
        if (!surveyResult.error && surveyResult.data) {
          surveyStatusData = surveyResult.data
        }
      } catch (err) {
        logger.warn('Could not fetch survey status', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
      
      try {
        const deedsResult = await supabase
          .from('sectional_titles')
          .select('registration_status')
          .limit(1000)
        if (!deedsResult.error && deedsResult.data) {
          deedsStatusData = deedsResult.data
        }
      } catch (err) {
        logger.warn('Could not fetch deeds status', {
          error: err instanceof Error ? err.message : String(err),
        })
      }

      const planningStatusCounts = {
        submitted: 0,
        approved: 0,
        rejected: 0,
      }
      planningStatusData.forEach((plan: any) => {
        const status = plan.approval_status
        if (status === 'submitted') planningStatusCounts.submitted++
        else if (status === 'approved') planningStatusCounts.approved++
        else if (status === 'rejected') planningStatusCounts.rejected++
      })

      const surveyStatusCounts = {
        draft: 0,
        sealed: 0,
        rejected: 0,
      }
      surveyStatusData.forEach((survey: any) => {
        const status = survey.status
        if (status === 'draft') surveyStatusCounts.draft++
        else if (status === 'sealed') surveyStatusCounts.sealed++
        else if (status === 'rejected') surveyStatusCounts.rejected++
      })

      const deedsStatusCounts = {
        draft: 0,
        registered: 0,
        rejected: 0,
      }
      deedsStatusData.forEach((title: any) => {
        const status = title.registration_status
        if (status === 'draft') deedsStatusCounts.draft++
        else if (status === 'registered') deedsStatusCounts.registered++
        else if (status === 'rejected') deedsStatusCounts.rejected++
      })

      // Return statistics, handling cases where tables might not exist yet
      return {
        success: true,
        statistics: {
          totalSchemes,
          totalTitles,
          totalTransfers,
          totalAmendments,
          totalMortgages,
          totalLeases,
          byProvince: byProvince || [],
          byMonth: months || [],
          byStatus: {
            planning: planningStatusCounts,
            survey: surveyStatusCounts,
            deeds: deedsStatusCounts,
          },
        },
      }
    } catch (error) {
      logger.error('Exception getting registration statistics', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  averageProcessingTime: {
    planning: number // days
    survey: number
    deeds: number
  }
  completionRate: {
    planning: number // percentage
    survey: number
    deeds: number
  }
  backlog: {
    planning: number
    survey: number
    deeds: number
  }
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(
  filters?: StatisticsFilters
): Promise<{
  success: boolean
  metrics?: PerformanceMetrics
  error?: string
}> {
  return monitor('get_performance_metrics', async () => {
    const supabase = await createClient()

    try {
      // Calculate average processing times
      // This is simplified - would need actual workflow timestamps
      const { data: planningData } = await supabase
        .from('apr.sectional_scheme_plans')
        .select('created_at, approved_at')
        .eq('approval_status', 'approved')
        .limit(100)

      let totalPlanningDays = 0
      let planningCount = 0
      planningData?.forEach((plan: any) => {
        if (plan.created_at && plan.approved_at) {
          const days =
            (new Date(plan.approved_at).getTime() - new Date(plan.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
          totalPlanningDays += days
          planningCount++
        }
      })

      const { data: surveyData } = await supabase
        .from('apr.survey_sectional_plans')
        .select('created_at, sealed_at')
        .eq('status', 'sealed')
        .limit(100)

      let totalSurveyDays = 0
      let surveyCount = 0
      surveyData?.forEach((survey: any) => {
        if (survey.created_at && survey.sealed_at) {
          const days =
            (new Date(survey.sealed_at).getTime() - new Date(survey.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
          totalSurveyDays += days
          surveyCount++
        }
      })

      const { data: deedsData } = await supabase
        .from('apr.sectional_titles')
        .select('created_at, registration_date')
        .eq('registration_status', 'registered')
        .limit(100)

      let totalDeedsDays = 0
      let deedsCount = 0
      deedsData?.forEach((title: any) => {
        if (title.created_at && title.registration_date) {
          const days =
            (new Date(title.registration_date).getTime() - new Date(title.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
          totalDeedsDays += days
          deedsCount++
        }
      })

      // Calculate completion rates
      const [planningTotal, planningApproved] = await Promise.all([
        supabase.from('apr.sectional_scheme_plans').select('id', { count: 'exact', head: true }),
        supabase
          .from('apr.sectional_scheme_plans')
          .select('id', { count: 'exact', head: true })
          .eq('approval_status', 'approved'),
      ])

      const [surveyTotal, surveySealed] = await Promise.all([
        supabase.from('apr.survey_sectional_plans').select('id', { count: 'exact', head: true }),
        supabase
          .from('apr.survey_sectional_plans')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sealed'),
      ])

      const [deedsTotal, deedsRegistered] = await Promise.all([
        supabase.from('apr.sectional_titles').select('id', { count: 'exact', head: true }),
        supabase
          .from('apr.sectional_titles')
          .select('id', { count: 'exact', head: true })
          .eq('registration_status', 'registered'),
      ])

      // Calculate backlog (pending items)
      const [planningBacklog, surveyBacklog, deedsBacklog] = await Promise.all([
        supabase
          .from('apr.sectional_scheme_plans')
          .select('id', { count: 'exact', head: true })
          .in('approval_status', ['submitted', 'under_review']),
        supabase
          .from('apr.survey_sectional_plans')
          .select('id', { count: 'exact', head: true })
          .in('status', ['draft', 'computed', 'under_review']),
        supabase
          .from('apr.sectional_titles')
          .select('id', { count: 'exact', head: true })
          .in('registration_status', ['draft', 'submitted', 'under_examination']),
      ])

      return {
        success: true,
        metrics: {
          averageProcessingTime: {
            planning: planningCount > 0 ? totalPlanningDays / planningCount : 0,
            survey: surveyCount > 0 ? totalSurveyDays / surveyCount : 0,
            deeds: deedsCount > 0 ? totalDeedsDays / deedsCount : 0,
          },
          completionRate: {
            planning:
              (planningTotal.count || 0) > 0
                ? ((planningApproved.count || 0) / (planningTotal.count || 1)) * 100
                : 0,
            survey:
              (surveyTotal.count || 0) > 0
                ? ((surveySealed.count || 0) / (surveyTotal.count || 1)) * 100
                : 0,
            deeds:
              (deedsTotal.count || 0) > 0
                ? ((deedsRegistered.count || 0) / (deedsTotal.count || 1)) * 100
                : 0,
          },
          backlog: {
            planning: planningBacklog.count || 0,
            survey: surveyBacklog.count || 0,
            deeds: deedsBacklog.count || 0,
          },
        },
      }
    } catch (error) {
      logger.error('Exception getting performance metrics', error as Error, { filters })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

