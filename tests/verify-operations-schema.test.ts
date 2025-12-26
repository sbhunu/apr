/**
 * Operations Schema Verification Tests
 * Tests that operations tables are created correctly with proper constraints
 */

import { createClient } from '@/lib/supabase/server'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

async function verifyOperationsSchema(): Promise<TestResult[]> {
  const supabase = await createClient()
  const results: TestResult[] = []

  // Test 1: Verify tables exist
  try {
    const { data: tables, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'apr'
          AND table_name IN (
            'ownership_transfers',
            'mortgages',
            'leases',
            'scheme_amendments'
          )
        ORDER BY table_name;
      `,
    })

    if (error) throw error

    const tableNames = (tables as Array<{ table_name: string }>).map(
      (t) => t.table_name
    )
    const expectedTables = [
      'ownership_transfers',
      'mortgages',
      'leases',
      'scheme_amendments',
    ]

    const allTablesExist = expectedTables.every((name) =>
      tableNames.includes(name)
    )

    results.push({
      name: 'Operations tables exist',
      passed: allTablesExist,
      error: allTablesExist
        ? undefined
        : `Missing tables. Found: ${tableNames.join(', ')}`,
    })
  } catch (error) {
    results.push({
      name: 'Operations tables exist',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Test 2: Verify foreign key constraints
  try {
    const { data: fks, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'apr'
          AND tc.table_name IN (
            'ownership_transfers',
            'mortgages',
            'leases',
            'scheme_amendments'
          )
        ORDER BY tc.table_name, kcu.column_name;
      `,
    })

    if (error) throw error

    const fkData = fks as Array<{
      table_name: string
      column_name: string
      foreign_table_name: string
    }>

    const expectedFKs = [
      { table: 'ownership_transfers', column: 'title_id', ref: 'sectional_titles' },
      { table: 'mortgages', column: 'title_id', ref: 'sectional_titles' },
      { table: 'leases', column: 'title_id', ref: 'sectional_titles' },
      { table: 'scheme_amendments', column: 'scheme_id', ref: 'sectional_schemes' },
    ]

    const allFKsExist = expectedFKs.every((expected) =>
      fkData.some(
        (fk) =>
          fk.table_name === expected.table &&
          fk.column_name === expected.column &&
          fk.foreign_table_name === expected.ref
      )
    )

    results.push({
      name: 'Foreign key constraints exist',
      passed: allFKsExist,
      error: allFKsExist ? undefined : 'Missing expected foreign key constraints',
    })
  } catch (error) {
    results.push({
      name: 'Foreign key constraints exist',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Test 3: Verify RLS is enabled
  try {
    const { data: rls, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'apr'
          AND tablename IN (
            'ownership_transfers',
            'mortgages',
            'leases',
            'scheme_amendments'
          )
        ORDER BY tablename;
      `,
    })

    if (error) throw error

    const rlsData = rls as Array<{ tablename: string; rowsecurity: boolean }>
    const allRLSEnabled = rlsData.every((table) => table.rowsecurity === true)

    results.push({
      name: 'RLS enabled on operations tables',
      passed: allRLSEnabled,
      error: allRLSEnabled
        ? undefined
        : 'Some tables do not have RLS enabled',
    })
  } catch (error) {
    results.push({
      name: 'RLS enabled on operations tables',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return results
}

// Run tests
if (require.main === module) {
  console.log('Running operations schema verification tests...\n')

  verifyOperationsSchema()
    .then((results) => {
      let passed = 0
      let failed = 0

      results.forEach((result) => {
        if (result.passed) {
          console.log(`✅ ${result.name}`)
          passed++
        } else {
          console.log(`❌ ${result.name}`)
          if (result.error) {
            console.log(`   Error: ${result.error}`)
          }
          failed++
        }
      })

      console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

      if (failed > 0) {
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('Test execution failed:', error)
      process.exit(1)
    })
}

export { verifyOperationsSchema }

