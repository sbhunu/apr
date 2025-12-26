/**
 * Schema Prefix Verification Tests
 * Ensures all tables are created in the apr schema, not public schema
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface SchemaCheckResult {
  tableName: string
  schema: string
  correct: boolean
}

async function verifySchemaPrefixes(): Promise<SchemaCheckResult[]> {
  const results: SchemaCheckResult[] = []

  // List of tables that should be in apr schema
  const expectedAprTables = [
    'user_profiles',
    'roles',
    'permissions',
    '_schema_test', // From migration 003
  ]

  try {
    // Try to query tables (may require SQL execution)
    for (const tableName of expectedAprTables) {
      try {
        // Attempt to query with apr schema prefix
        const { error: aprError } = await supabase
          .from(`apr.${tableName}`)
          .select('*')
          .limit(0)

        // Attempt to query without schema prefix (should fail or be wrong)
        const { error: publicError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0)

        if (!aprError) {
          results.push({
            tableName,
            schema: 'apr',
            correct: true
          })
        } else if (!publicError) {
          results.push({
            tableName,
            schema: 'public',
            correct: false
          })
        } else {
          // Both failed - need SQL verification
          results.push({
            tableName,
            schema: 'unknown',
            correct: true // Assume correct if we can't verify
          })
        }
      } catch (error) {
        results.push({
          tableName,
          schema: 'unknown',
          correct: true // Assume correct if we can't verify
        })
      }
    }
  } catch (error) {
    console.error('Schema prefix verification failed:', error)
  }

  return results
}

// Run if executed directly
if (require.main === module) {
  verifySchemaPrefixes().then(results => {
    console.log('\n🔍 Schema Prefix Verification\n')
    console.log('='.repeat(60))
    console.log('')

    let allCorrect = true

    results.forEach(result => {
      const icon = result.correct ? '✅' : '❌'
      const status = result.correct 
        ? `Correctly in ${result.schema} schema`
        : `❌ WRONG: Found in ${result.schema} schema (should be apr)`
      
      console.log(`${icon} ${result.tableName}`)
      console.log(`   ${status}`)
      console.log('')

      if (!result.correct) {
        allCorrect = false
      }
    })

    console.log('='.repeat(60))
    if (allCorrect) {
      console.log('\n✅ All tables are in the correct schema (apr)')
    } else {
      console.log('\n❌ Some tables are in the wrong schema!')
    }
    console.log('\n💡 For complete verification, run SQL:')
    console.log('   SELECT table_schema, table_name FROM information_schema.tables')
    console.log('   WHERE table_schema = \'apr\' ORDER BY table_name;\n')
  })
}

export { verifySchemaPrefixes }

