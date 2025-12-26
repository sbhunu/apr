#!/usr/bin/env tsx
/**
 * Create Admin User Script
 * 
 * Creates an admin user in Supabase Auth and inserts the corresponding profile
 * in apr.user_profiles with admin role.
 * 
 * Usage:
 *   npx tsx scripts/create-admin-user.ts
 * 
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
  process.exit(1)
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  console.error('   Please set this in your .env.local or .env file')
  console.error('')
  console.error('   To get your service role key:')
  console.error('   1. Go to Supabase Dashboard → Settings → API')
  console.error('   2. Copy the "service_role" key (NOT the "anon" key)')
  console.error('   3. Add it to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here')
  process.exit(1)
}

// Validate key format (service role keys are JWT tokens starting with 'eyJ')
const trimmedKey = SUPABASE_SERVICE_ROLE_KEY.trim()
if (!trimmedKey.startsWith('eyJ')) {
  console.error('⚠️  Warning: Service role key should start with "eyJ" (JWT format)')
  console.error('   Make sure you are using the SERVICE_ROLE key, not the ANON key')
  console.error('   Service role key is found in: Dashboard → Settings → API → service_role')
  console.error('')
}

// Check if it might be the anon key instead
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === trimmedKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY appears to be the same as ANON_KEY')
  console.error('   You must use the SERVICE_ROLE key, not the ANON key')
  console.error('   Service role key bypasses RLS and is required for admin operations')
  process.exit(1)
}

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, trimmedKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createAdminUser() {
  const email = 'admin@apr.local'
  const password = 'admin123' // Change this after first login!
  const name = 'System Administrator'

  console.log('🔐 Creating admin user...')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log('')

  try {
    // Step 0: Test connection with service role key using REST API
    console.log('📝 Step 0: Testing service role key...')
    
    // Try REST API first to bypass client library issues
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`, {
      headers: {
        'apikey': trimmedKey,
        'Authorization': `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!testResponse.ok && testResponse.status !== 404) {
      const errorText = await testResponse.text()
      console.error('❌ Failed to connect with service role key via REST API')
      console.error(`   Status: ${testResponse.status}`)
      console.error(`   Response: ${errorText.substring(0, 200)}`)
      console.error('')
      console.error('   Trying alternative method...')
      console.error('')
      
      // Fall back to client library test
      const { error: testError } = await supabaseAdmin
        .from('apr.user_profiles')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('❌ Client library also failed:', testError.message)
        console.error('')
        console.error('   Common issues:')
        console.error('   1. Wrong key: Make sure you are using SERVICE_ROLE key, not ANON key')
        console.error('   2. Key format: Check for extra spaces or newlines in .env.local')
        console.error('   3. Project mismatch: Ensure the key matches your Supabase project')
        console.error('   4. Local Supabase: Local instances may need different configuration')
        console.error('')
        console.error('   For local Supabase, try:')
        console.error('   - Check if Supabase is running: docker ps | grep supabase')
        console.error('   - Verify URL: Should be http://localhost:8000')
        console.error('   - Re-extract keys: npm run credentials')
        process.exit(1)
      }
    }
    console.log('✅ Service role key is valid')
    console.log('')

    // Step 1: Create user in Supabase Auth
    console.log('📝 Step 1: Creating user in Supabase Auth...')
    
    // Try REST API first for local Supabase compatibility
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': trimmedKey,
        'Authorization': `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'admin',
        },
      }),
    })

    let userId: string
    let authError: Error | null = null

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.log(`⚠️  REST API failed (${authResponse.status}), trying client library...`)
      console.log(`   Response: ${errorText.substring(0, 200)}`)
      console.log('')
      
      // Fall back to client library
      const { data: authData, error: clientAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: 'admin',
        },
      })

      if (clientAuthError || !authData?.user) {
        console.error('❌ Failed to create user in Supabase Auth')
        if (clientAuthError) {
          console.error('   Error:', clientAuthError.message)
        }
        if (authResponse.status === 409 || errorText.includes('already registered')) {
          console.error('   User already exists. If you want to recreate, delete the user first.')
        }
        process.exit(1)
      }
      userId = authData.user.id
    } else {
      const authData = await authResponse.json()
      if (!authData?.id) {
        console.error('❌ User creation succeeded but no user ID returned')
        process.exit(1)
      }
      userId = authData.id
    }
    console.log(`✅ User created successfully in Auth (ID: ${userId})`)
    console.log('')

    // Step 2: Create user profile in apr.user_profiles
    console.log('📝 Step 2: Creating user profile in apr.user_profiles...')
    const { error: profileError } = await supabaseAdmin
      .from('apr.user_profiles')
      .insert({
        id: userId,
        name,
        email,
        role: 'admin',
        status: 'active',
        organization: 'System Administration',
      })

    if (profileError) {
      console.error('❌ Failed to create user profile:', profileError.message)
      
      // If profile creation fails, try to clean up the auth user
      console.log('🧹 Attempting to clean up auth user...')
      await supabaseAdmin.auth.admin.deleteUser(userId)
      
      process.exit(1)
    }

    console.log('✅ User profile created successfully')
    console.log('')

    // Step 3: Verify the setup
    console.log('📝 Step 3: Verifying setup...')
    const { data: profile, error: verifyError } = await supabaseAdmin
      .from('apr.user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (verifyError || !profile) {
      console.error('⚠️  Warning: Could not verify profile creation:', verifyError?.message)
    } else {
      console.log('✅ Profile verification successful')
      console.log(`   Role: ${profile.role}`)
      console.log(`   Status: ${profile.status}`)
    }

    console.log('')
    console.log('🎉 Admin user created successfully!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   User ID: ${userId}`)
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   Role: admin`)
    console.log(`   Status: active`)
    console.log('')
    console.log('⚠️  IMPORTANT: Change the password after first login!')
    console.log('')
    console.log('🔗 You can now login at: http://localhost:3000/login')
    console.log('')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

