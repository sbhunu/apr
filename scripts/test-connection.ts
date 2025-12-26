/**
 * Test Supabase Connection and Schema Setup
 * 
 * Usage:
 *   npx tsx scripts/test-connection.ts
 */

import { createClient } from '@supabase/supabase-js'
import { APR_SCHEMA } from '../lib/supabase/schema'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials!')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

async function testConnection() {
  console.log('🔍 Testing Supabase Connection and APR Schema Setup...\n')
  console.log(`   URL: ${SUPABASE_URL}\n`)

  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error('Missing Supabase credentials')
      process.exit(1)
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Test 1: Basic Connection
    console.log('1️⃣ Testing basic connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0)

    if (connectionError && connectionError.code !== 'PGRST116' && connectionError.code !== '42P01') {
      console.error('   ❌ Connection failed:', connectionError.message)
      console.error('   Code:', connectionError.code)
      return false
    }
    console.log('   ✅ Connection successful\n')

    // Test 2: Check if we can query (basic test)
    console.log('2️⃣ Testing query capability...')
    const { error: queryError } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0)

    if (queryError && queryError.code !== 'PGRST116' && queryError.code !== '42P01') {
      console.error('   ❌ Query failed:', queryError.message)
      return false
    }
    console.log('   ✅ Query capability verified\n')

    // Test 3: Schema verification (requires migration to be run)
    console.log('3️⃣ Testing APR schema setup...')
    try {
      const { data: schemaCheck, error: schemaError } = await supabase.rpc(
        'check_schema_exists',
        { schema_name: APR_SCHEMA }
      )

      if (schemaError) {
        console.log('   ⚠️  Schema check function not found')
        console.log('   💡 Run migrations to create helper functions')
        console.log('   💡 Or verify manually: SELECT schema_name FROM information_schema.schemata WHERE schema_name = \'apr\';\n')
      } else {
        console.log(`   ✅ APR schema verified: ${schemaCheck}\n`)
      }
    } catch (error) {
      console.log('   ⚠️  Schema check requires migrations to be run first\n')
    }

    // Test 4: PostGIS verification note
    console.log('4️⃣ PostGIS verification...')
    console.log('   💡 To verify PostGIS, run in Supabase SQL Editor:')
    console.log('      SELECT PostGIS_Version();\n')

    console.log('✅ Connection tests completed!')
    console.log('\n📋 Next Steps:')
    console.log('   1. Run migrations in Supabase SQL Editor')
    console.log('   2. Verify schemas: SELECT schema_name FROM information_schema.schemata WHERE schema_name IN (\'apr\', \'records\');')
    console.log('   3. Test PostGIS: SELECT PostGIS_Version();')
    console.log('   4. Visit: http://localhost:3000/api/test-supabase')

    return true
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('\n💡 Troubleshooting:')
    console.error('   - Check .env.local has NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('   - Ensure Supabase is running (local) or project is active (cloud)')
    return false
  }
}

testConnection()

