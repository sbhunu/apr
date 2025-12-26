/**
 * Verification tests for Planning Database Schema
 * Tests table creation, RLS policies, and basic functionality
 */

import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_KEY } from '../scripts/test-connection'

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)

interface TestResult {
  name: string
  passed: boolean
  message?: string
  details?: string
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test 1: Verify tables exist
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'apr'
          AND table_name IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews')
        ORDER BY table_name;
      `,
    })

    if (error) {
      results.push({
        name: 'Planning Tables Exist',
        passed: false,
        message: 'Failed to query tables. Ensure exec_sql function exists.',
        details: error.message,
      })
    } else {
      const tableNames = data ? (data as any[]).map((row) => row.table_name) : []
      const expectedTables = ['plan_documents', 'planning_reviews', 'sectional_scheme_plans']
      const passed = expectedTables.every((table) => tableNames.includes(table))

      results.push({
        name: 'Planning Tables Exist',
        passed: passed,
        message: passed
          ? 'All planning tables found in apr schema'
          : 'Missing some planning tables',
        details: `Found: ${tableNames.join(', ')}. Expected: ${expectedTables.join(', ')}`,
      })
    }
  } catch (e: any) {
    results.push({
      name: 'Planning Tables Exist',
      passed: false,
      message: 'Error during table existence check',
      details: e.message,
    })
  }

  // Test 2: Verify indexes exist
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'apr'
          AND tablename IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews')
          AND indexname LIKE 'idx_%';
      `,
    })

    if (error) {
      results.push({
        name: 'Planning Indexes Exist',
        passed: false,
        message: 'Failed to query indexes',
        details: error.message,
      })
    } else {
      const indexCount = data ? (data as any[])[0]?.index_count : 0
      results.push({
        name: 'Planning Indexes Exist',
        passed: indexCount > 0,
        message: `Found ${indexCount} indexes`,
        details: indexCount > 0 ? 'Indexes created successfully' : 'No indexes found',
      })
    }
  } catch (e: any) {
    results.push({
      name: 'Planning Indexes Exist',
      passed: false,
      message: 'Error during index check',
      details: e.message,
    })
  }

  // Test 3: Verify RLS is enabled
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'apr'
          AND tablename IN ('sectional_scheme_plans', 'plan_documents', 'planning_reviews');
      `,
    })

    if (error) {
      results.push({
        name: 'RLS Enabled',
        passed: false,
        message: 'Failed to query RLS status',
        details: error.message,
      })
    } else {
      const tables = data as any[]
      const allEnabled = tables.every((table) => table.rowsecurity === true)
      results.push({
        name: 'RLS Enabled',
        passed: allEnabled,
        message: allEnabled ? 'RLS enabled on all planning tables' : 'RLS not enabled on all tables',
        details: `Tables: ${tables.map((t) => `${t.tablename}(${t.rowsecurity})`).join(', ')}`,
      })
    }
  } catch (e: any) {
    results.push({
      name: 'RLS Enabled',
      passed: false,
      message: 'Error during RLS check',
      details: e.message,
    })
  }

  // Test 4: Verify spatial columns exist
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'apr'
          AND table_name = 'sectional_scheme_plans'
          AND column_name IN ('boundary_geometry', 'centroid');
      `,
    })

    if (error) {
      results.push({
        name: 'Spatial Columns Exist',
        passed: false,
        message: 'Failed to query spatial columns',
        details: error.message,
      })
    } else {
      const columns = data as any[]
      const hasBoundary = columns.some((c) => c.column_name === 'boundary_geometry')
      const hasCentroid = columns.some((c) => c.column_name === 'centroid')
      results.push({
        name: 'Spatial Columns Exist',
        passed: hasBoundary && hasCentroid,
        message:
          hasBoundary && hasCentroid
            ? 'Spatial columns found'
            : 'Missing spatial columns',
        details: `Found: ${columns.map((c) => c.column_name).join(', ')}`,
      })
    }
  } catch (e: any) {
    results.push({
      name: 'Spatial Columns Exist',
      passed: false,
      message: 'Error during spatial column check',
      details: e.message,
    })
  }

  return results
}

// Run tests
runTests()
  .then((results) => {
    console.log('\n=== Planning Schema Verification Tests ===\n')
    results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name}`)
      if (result.message) {
        console.log(`   ${result.message}`)
      }
      if (result.details) {
        console.log(`   Details: ${result.details}`)
      }
      console.log('')
    })

    const passed = results.filter((r) => r.passed).length
    const total = results.length
    console.log(`\nResults: ${passed}/${total} tests passed\n`)

    if (passed === total) {
      console.log('✅ All planning schema tests passed!')
      process.exit(0)
    } else {
      console.log('❌ Some tests failed. Please review the output above.')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })

