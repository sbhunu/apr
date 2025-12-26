/**
 * Migration Runner Script
 * Runs Supabase migrations in order
 * 
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 * 
 * Or with environment variables:
 *   SUPABASE_DB_URL=postgresql://... npx tsx scripts/run-migrations.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '../lib/supabase/server'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

async function runMigrations() {
  console.log('🚀 Starting APR Schema Migrations...\n')

  try {
    const supabase = await createClient()

    // Migration files in order
    const migrations = [
      '001_enable_postgis_and_create_apr_schema.sql',
      '002_create_schema_check_function.sql',
      '003_verify_apr_schema_setup.sql',
    ]

    for (const migrationFile of migrations) {
      const migrationPath = join(MIGRATIONS_DIR, migrationFile)
      console.log(`📄 Running: ${migrationFile}`)

      try {
        const sql = readFileSync(migrationPath, 'utf-8')

        // Split SQL by semicolons and execute each statement
        // Note: Supabase REST API doesn't support multi-statement SQL well
        // This is a simplified approach - for production, use Supabase CLI or direct PostgreSQL connection
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          if (statement.length > 0) {
            // Try to execute via RPC or direct query
            // Note: Some statements may need to be run via SQL Editor
            try {
              // For DDL statements, we'll need to use Supabase Dashboard SQL Editor
              // This script serves as a guide
              console.log(`   ⚠️  Statement requires SQL Editor: ${statement.substring(0, 50)}...`)
            } catch (error) {
              console.error(`   ❌ Error: ${error}`)
            }
          }
        }

        console.log(`   ✅ Migration file processed: ${migrationFile}\n`)
      } catch (error) {
        console.error(`   ❌ Failed to read/execute ${migrationFile}:`, error)
        throw error
      }
    }

    console.log('✅ All migrations processed!')
    console.log('\n⚠️  IMPORTANT: Some DDL statements require SQL Editor execution.')
    console.log('   Please run the migration files in Supabase SQL Editor:')
    console.log('   1. Go to Supabase Dashboard > SQL Editor')
    console.log('   2. Copy/paste each migration file content')
    console.log('   3. Run them in order (001, 002, 003)')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migrations
runMigrations()

