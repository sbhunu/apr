/**
 * Execute Supabase Migrations
 * 
 * This script helps execute migrations for local Supabase
 * For cloud Supabase, use Supabase Dashboard SQL Editor or CLI
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials!')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function executeMigration(filename) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${filename}`)
    return false
  }

  console.log(`\n📄 Executing: ${filename}`)
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  
  // For local Supabase, we can try to execute via RPC
  // But DDL statements typically need direct SQL execution
  console.log('   ⚠️  DDL statements require direct SQL execution')
  console.log('   💡 Please run this migration in Supabase SQL Editor:')
  console.log(`   📁 File: ${migrationPath}\n`)
  
  // Show first few lines of SQL
  const preview = sql.split('\n').slice(0, 5).join('\n')
  console.log('   Preview:')
  console.log('   ' + preview.split('\n').map(l => '   ' + l).join('\n'))
  console.log('   ...\n')
  
  return true
}

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n')
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0)
    
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('   ❌ Connection failed:', error.message)
      console.error('   Code:', error.code)
      return false
    }
    
    console.log('   ✅ Connection successful!')
    console.log(`   URL: ${SUPABASE_URL}\n`)
    return true
  } catch (error) {
    console.error('   ❌ Connection error:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 APR Schema Migration Runner\n')
  console.log('=' .repeat(50))
  
  // Test connection first
  const connected = await testConnection()
  if (!connected) {
    console.log('\n💡 Troubleshooting:')
    console.log('   - Ensure Supabase is running (if local)')
    console.log('   - Check .env.local has correct credentials')
    console.log('   - For local: supabase start')
    process.exit(1)
  }
  
  // Execute migrations
  const migrations = [
    '001_enable_postgis_and_create_apr_schema.sql',
    '002_create_schema_check_function.sql',
    '003_verify_apr_schema_setup.sql',
  ]
  
  console.log('\n📋 Migration Files to Execute:\n')
  
  for (const migration of migrations) {
    await executeMigration(migration)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('\n✅ Migration Guide Complete!')
  console.log('\n📝 Next Steps:')
  console.log('   1. Open Supabase Dashboard: http://localhost:54323 (local) or your cloud dashboard')
  console.log('   2. Go to SQL Editor')
  console.log('   3. Copy/paste each migration file content')
  console.log('   4. Run them in order (001, 002, 003)')
  console.log('   5. Verify with: SELECT schema_name FROM information_schema.schemata WHERE schema_name = \'apr\';')
  console.log('\n🧪 After migrations, test connection:')
  console.log('   npm run test:connection')
}

main().catch(console.error)

