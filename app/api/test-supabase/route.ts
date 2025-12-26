import { createClient } from '@/lib/supabase/server'
import { APR_SCHEMA, RECORDS_SCHEMA } from '@/lib/supabase/schema'
import { withErrorHandler } from '@/lib/api-error-handler'

/**
 * Test API route to verify Supabase connection and apr schema setup
 * GET /api/test-supabase
 */
async function GETHandler() {
  try {
    const supabase = await createClient()

    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0)

    // PGRST116 = table not found (expected for _realtime)
    // PGRST301 = authentication/key error
    const isConnectionError = connectionError && 
      connectionError.code !== 'PGRST116' && 
      connectionError.code !== '42P01' // table doesn't exist (PostgreSQL error)

    if (isConnectionError) {
      return Response.json(
        {
          success: false,
          error: 'Connection failed',
          details: connectionError.message,
          code: connectionError.code,
          troubleshooting: {
            checkEnv: 'Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
            checkSupabase: 'Ensure Supabase is running (local) or project is active (cloud)',
            testSQL: 'Run supabase/verify-setup.sql in Supabase SQL Editor to verify schema setup',
          },
        },
        { status: 500 }
      )
    }

    // Test 2: Verify apr schema exists
    // Note: This requires running the migration first
    // We'll use a SQL query to check schema existence
    let schemaCheck: any = null
    let schemaError: any = null
    
    try {
      const result = await supabase.rpc(
        'check_schema_exists',
        { schema_name: APR_SCHEMA }
      )
      schemaCheck = result.data
      schemaError = result.error
    } catch (error) {
      // If RPC doesn't exist, try direct query
      // This is a fallback - the migration should create the schema
      schemaError = { message: 'Run migration first to create apr schema' }
    }

    // Test 3: Check PostGIS (requires SQL execution in Supabase dashboard)
    const postgisNote = {
      message: 'To verify PostGIS, run this SQL in Supabase SQL Editor:',
      sql: 'SELECT PostGIS_Version();',
      expectedOutput: 'Version string (e.g., "3.4.0")',
    }

    return Response.json({
      success: true,
      message: 'Supabase connection successful',
      tests: {
        connection: {
          status: 'success',
          message: 'Successfully connected to Supabase',
        },
        schema: {
          status: schemaError ? 'pending' : 'success',
          message: schemaError
            ? 'Run migration to create apr schema'
            : `Schema '${APR_SCHEMA}' verified`,
          note: 'All tables will be created under the apr schema',
        },
        postgis: {
          status: 'pending',
          ...postgisNote,
        },
      },
      configuration: {
        aprSchema: APR_SCHEMA,
        recordsSchema: RECORDS_SCHEMA,
        note: 'All APR tables must use the apr schema prefix',
      },
      nextSteps: [
        '1. Run migration: supabase/migrations/001_enable_postgis_and_create_apr_schema.sql',
        '2. Verify PostGIS: SELECT PostGIS_Version();',
        '3. Verify schemas: SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (\'apr\', \'records\');',
      ],
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: 'Failed to test Supabase connection',
        details: error instanceof Error ? error.message : 'Unknown error',
        checkEnv: 'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local',
      },
      { status: 500 }
    )
  }
}

export const GET = withErrorHandler(GETHandler)

