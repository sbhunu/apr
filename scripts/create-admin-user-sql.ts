#!/usr/bin/env tsx
/**
 * Create Admin User Script (SQL Method)
 * 
 * Creates an admin user directly via SQL for local Supabase instances
 * where JWT authentication might have issues.
 * 
 * Usage:
 *   npx tsx scripts/create-admin-user-sql.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
  process.exit(1)
}

async function createAdminUserSQL() {
  const email = 'admin@apr.local'
  const password = 'admin123'
  const name = 'System Administrator'

  console.log('🔐 Creating admin user via SQL...')
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
  console.log('')

  try {
    // Check if Supabase DB container is running
    const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' })
    if (!containers.includes('supabase-db')) {
      console.error('❌ Supabase DB container not found')
      console.error('   Make sure Supabase is running: docker ps | grep supabase')
      process.exit(1)
    }

    console.log('📝 Step 1: Creating user in auth.users via SQL...')
    
    // Use Supabase's built-in function to create user
    // For local Supabase, we can use the anon key to call RPC functions
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found')
      process.exit(1)
    }

    const supabase = createClient(SUPABASE_URL, anonKey)

    // Try using GoTrue Admin API directly (bypasses email confirmation)
    console.log('   Attempting to create user via GoTrue Admin API...')
    
    // Get service role key for admin operations
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    if (!serviceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found')
      console.error('   Run: npm run credentials')
      process.exit(1)
    }

    // Call GoTrue Admin API directly
    const goTrueResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true, // Auto-confirm
        user_metadata: {
          name,
          role: 'admin',
        },
      }),
    })

    let signUpData: any = null
    let signUpError: any = null

    if (goTrueResponse.ok) {
      signUpData = await goTrueResponse.json()
      console.log('   ✅ User created via Admin API')
    } else {
      const errorText = await goTrueResponse.text()
      console.log(`   ⚠️  Admin API failed (${goTrueResponse.status}), trying signup...`)
      
      // Fall back to regular signup
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'admin',
          },
        },
      })
      signUpData = signUpResult.data
      signUpError = signUpResult.error
      
      if (signUpError) {
        console.log('   SignUp error:', signUpError.message)
      }
    }

    let userId: string | null = null

    if (signUpError) {
      // Email confirmation errors are OK in local Supabase - user is created but email not confirmed
      if (signUpError.message.includes('confirmation email') || signUpError.message.includes('sending email')) {
        console.log('⚠️  Email confirmation failed (expected in local Supabase)')
        
        if (signUpData?.user?.id) {
          userId = signUpData.user.id
          console.log(`✅ User created (ID: ${userId})`)
          console.log('   Confirming email via SQL...')
          
          // Confirm email via direct SQL update
          try {
            execSync(
              `docker exec supabase-db psql -U postgres -d postgres -c "UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${userId}';"`,
              { encoding: 'utf-8', stdio: 'pipe' }
            )
            console.log('✅ Email confirmed via SQL')
          } catch (sqlError) {
            console.log('⚠️  Could not confirm email via SQL (may need manual confirmation)')
            console.log('   You can confirm manually: UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = ...')
          }
        } else {
          console.error('❌ User creation failed and no user ID returned')
          process.exit(1)
        }
      } else if (signUpError.message.includes('already registered')) {
        console.log('⚠️  User already exists, signing in...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          console.error('❌ Could not sign in to existing user:', signInError.message)
          console.error('   You may need to reset the password or delete the user first')
          process.exit(1)
        }

        if (!signInData?.user?.id) {
          console.error('❌ Could not get user ID')
          process.exit(1)
        }

        userId = signInData.user.id
        console.log(`✅ Found existing user (ID: ${userId})`)
      } else {
        console.error('❌ Failed to sign up user:', signUpError.message)
        // Still check if user was created
        if (signUpData?.user?.id) {
          userId = signUpData.user.id
          console.log(`⚠️  But user was created (ID: ${userId}), continuing...`)
        } else {
          process.exit(1)
        }
      }
    } else if (signUpData?.user?.id) {
      userId = signUpData.user.id
      console.log(`✅ User created successfully (ID: ${userId})`)
    } else {
      console.error('❌ User creation succeeded but no user ID returned')
      process.exit(1)
    }

    if (!userId) {
      console.error('❌ Could not determine user ID')
      process.exit(1)
    }
    console.log(`✅ User created successfully (ID: ${userId})`)
    console.log('')

    // Update profile
    await updateUserProfile(userId, name, email, supabase)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

async function updateUserProfile(userId: string, name: string, email: string, supabase: any) {
  console.log('📝 Step 2: Creating/updating user profile in apr.user_profiles...')
  
  // Use direct SQL execution via docker since Supabase client has schema issues
  try {
    const { execSync } = await import('child_process')
    const sql = `INSERT INTO apr.user_profiles (id, name, email, role, status, organization) VALUES ('${userId}', '${name}', '${email}', 'admin', 'active', 'System Administration') ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active', name = '${name}', updated_at = NOW();`
    
    execSync(
      `docker exec supabase-db psql -U postgres -d postgres -c "${sql}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    console.log('✅ User profile created via SQL')
  } catch (sqlError: any) {
    console.error('❌ Failed to create user profile via SQL:', sqlError.message)
    console.error('')
    console.error('   You may need to manually insert the profile via SQL:')
    console.error(`   INSERT INTO apr.user_profiles (id, name, email, role, status, organization)`)
    console.error(`   VALUES ('${userId}', '${name}', '${email}', 'admin', 'active', 'System Administration');`)
    process.exit(1)
  }

  // Verify (skip if SQL failed)
  try {
    const { data: profile, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (verifyError || !profile) {
      console.log('⚠️  Could not verify profile via client (this is OK if SQL succeeded)')
    } else {
      console.log('✅ Profile verification successful')
      console.log(`   Role: ${profile.role}`)
      console.log(`   Status: ${profile.status}`)
    }
  } catch {
    // Verification is optional
  }

  if (false) {
    console.error('❌ Failed to create user profile:', profileError.message)
    console.error('')
    console.error('   You may need to manually insert the profile via SQL:')
    console.error(`   INSERT INTO apr.user_profiles (id, name, email, role, status, organization)`)
    console.error(`   VALUES ('${userId}', '${name}', '${email}', 'admin', 'active', 'System Administration');`)
    process.exit(1)
  }

  console.log('✅ User profile created/updated successfully')
  console.log('')

  // Verify
  console.log('📝 Step 3: Verifying setup...')
  const { data: profile, error: verifyError } = await supabase
    .from('apr.user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (verifyError || !profile) {
    console.error('⚠️  Warning: Could not verify profile:', verifyError?.message)
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
  console.log(`   Password: admin123`)
  console.log(`   Role: admin`)
  console.log(`   Status: active`)
  console.log('')
  console.log('⚠️  IMPORTANT: Change the password after first login!')
  console.log('')
  console.log('🔗 You can now login at: http://localhost:3000/login')
  console.log('')
}

// Run the script
createAdminUserSQL()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

