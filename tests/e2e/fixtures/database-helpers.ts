/**
 * Database Helpers for E2E Tests
 * Functions for managing test data in database
 */

import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for E2E tests')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Clean up test data
 */
export async function cleanupTestData(testPrefix: string = 'test_') {
  const supabase = getSupabaseClient()
  // Delete test schemes
  const { data: schemes } = await supabase
    .from('apr.sectional_scheme_plans')
    .select('id')
    .like('scheme_name', `${testPrefix}%`)

  if (schemes && schemes.length > 0) {
    const schemeIds = schemes.map((s) => s.id)
    // Delete related data first (cascade deletes)
    await supabase.from('apr.sectional_scheme_plans').delete().in('id', schemeIds)
  }

  // Delete test users (if created)
  // Note: This requires admin access
}

/**
 * Create test scheme
 */
export async function createTestScheme(data: {
  schemeName: string
  location: string
  description?: string
  plannerId: string
}) {
  const supabase = getSupabaseClient()
  const { data: scheme, error } = await supabase
    .from('apr.sectional_scheme_plans')
    .insert({
      scheme_name: data.schemeName,
      location: data.location,
      description: data.description,
      planner_id: data.plannerId,
      status: 'draft',
      workflow_state: 'draft',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test scheme: ${error.message}`)
  }

  return scheme
}

/**
 * Get test scheme by name
 */
export async function getTestScheme(schemeName: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('apr.sectional_scheme_plans')
    .select('*')
    .eq('scheme_name', schemeName)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Wait for workflow state
 */
export async function waitForWorkflowState(
  entityId: string,
  entityType: 'planning' | 'survey' | 'deeds',
  targetState: string,
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now()
  const tableMap = {
    planning: 'apr.sectional_scheme_plans',
    survey: 'apr.survey_sectional_plans',
    deeds: 'apr.sectional_titles',
  }

  const table = tableMap[entityType]
  const supabase = getSupabaseClient()

  while (Date.now() - startTime < timeout) {
    const { data } = await supabase.from(table).select('workflow_state').eq('id', entityId).single()

    if (data && data.workflow_state === targetState) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return false
}

