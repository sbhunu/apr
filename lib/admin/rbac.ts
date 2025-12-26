/**
 * RBAC Enforcement Middleware
 * Provides role-based access control for API routes and operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/server'
import { AuthorizationError } from '@/lib/errors/base'
import { logger } from '@/lib/logger'

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * RBAC middleware options
 */
export interface RBACMiddlewareOptions {
  requiredPermissions?: string[]
  requiredRole?: string
  requiredRoles?: string[] // If provided, user must have ANY of these roles (admin always allowed)
  requireAllPermissions?: boolean // If true, user must have ALL permissions; if false, ANY permission
}

/**
 * Check if user has required permissions
 */
export async function checkPermissions(
  userId: string,
  requiredPermissions: string[],
  requireAll: boolean = false
): Promise<PermissionCheckResult> {
  try {
    const supabase = await createClient()

    // Get user profile with role
    // Try to get user profile - RLS should allow users to see their own profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', userId)
      .single()

    if (profileError) {
      logger.warn('Profile lookup failed', {
        userId,
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      })
      
      // If RLS is blocking, try using service role for admin checks
      // This is a fallback for development - in production, RLS should work correctly
      if (profileError.code === '42501' || profileError.message?.includes('permission denied')) {
        logger.warn('RLS blocking profile access, attempting service role lookup', { userId })
        
        // Try direct database query as fallback (only in development)
        if (process.env.NODE_ENV === 'development') {
          try {
            // Use service role key if available
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            if (serviceKey) {
              const { createClient: createServiceClient } = await import('@supabase/supabase-js')
              const serviceSupabase = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey,
                {
                  auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                  },
                }
              )
              
              const { data: serviceProfile, error: serviceError } = await serviceSupabase
                .from('user_profiles')
                .select('role, status')
                .eq('id', userId)
                .single()
              
              if (!serviceError && serviceProfile) {
                logger.info('Service role lookup succeeded', { userId, role: serviceProfile.role })
                if (serviceProfile.status !== 'active') {
                  return {
                    allowed: false,
                    reason: `User account is ${serviceProfile.status}`,
                  }
                }
                if (serviceProfile.role === 'admin') {
                  return { allowed: true }
                }
                const hasRole = serviceProfile.role === requiredRole
                return {
                  allowed: hasRole,
                  reason: hasRole ? undefined : `Required role: ${requiredRole}, user role: ${serviceProfile.role}`,
                }
              }
            }
          } catch (fallbackError) {
            logger.error('Service role fallback failed', fallbackError as Error)
          }
        }
      }
      
      return {
        allowed: false,
        reason: `User profile not found: ${profileError.message}`,
      }
    }

    if (!profile) {
      return {
        allowed: false,
        reason: 'User profile not found',
      }
    }

    // Check if user is active
    if (profile.status !== 'active') {
      return {
        allowed: false,
        reason: `User account is ${profile.status}`,
      }
    }

    // Admin role has all permissions
    if (profile.role === 'admin') {
      return {
        allowed: true,
      }
    }

    // Get role permissions
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('permissions')
      .eq('name', profile.role)
      .single()

    if (roleError || !role) {
      return {
        allowed: false,
        reason: 'Role not found',
      }
    }

    const rolePermissions = (role.permissions as string[]) || []

    // Check for wildcard permission
    if (rolePermissions.includes('*')) {
      return {
        allowed: true,
      }
    }

    // Check permissions
    if (requireAll) {
      // User must have ALL required permissions
      const hasAll = requiredPermissions.every((perm) =>
        rolePermissions.includes(perm)
      )
      return {
        allowed: hasAll,
        reason: hasAll ? undefined : 'Missing required permissions',
      }
    } else {
      // User must have ANY of the required permissions
      const hasAny = requiredPermissions.some((perm) =>
        rolePermissions.includes(perm)
      )
      return {
        allowed: hasAny,
        reason: hasAny ? undefined : 'Missing required permissions',
      }
    }
  } catch (error) {
    logger.error('Permission check failed', error as Error, { userId })
    return {
      allowed: false,
      reason: 'Permission check error',
    }
  }
}

/**
 * Check role using service key (bypasses RLS)
 */
async function checkRoleWithServiceKey(
  userId: string,
  requiredRole: string
): Promise<PermissionCheckResult> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return { allowed: false, reason: 'Service key not available' }
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Use public.user_profiles view instead of apr.user_profiles
    // PostgREST doesn't support schema-qualified table names in Supabase JS client
    const { data: profile, error: profileError } = await serviceSupabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', userId)
      .single()

    if (profileError) {
      logger.warn('Service key profile lookup failed', {
        userId,
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      })
      return {
        allowed: false,
        reason: `User profile not found: ${profileError.message}`,
      }
    }

    if (!profile) {
      logger.warn('Service key profile lookup returned no data', { userId })
      return {
        allowed: false,
        reason: 'User profile not found',
      }
    }

    logger.info('Service key profile lookup successful', {
      userId,
      role: profile.role,
      status: profile.status,
    })

    if (profile.status !== 'active') {
      return {
        allowed: false,
        reason: `User account is ${profile.status}`,
      }
    }

    if (profile.role === 'admin') {
      return { allowed: true }
    }

    const hasRole = profile.role === requiredRole
    return {
      allowed: hasRole,
      reason: hasRole ? undefined : `Required role: ${requiredRole}, user role: ${profile.role}`,
    }
  } catch (error) {
    logger.error('Service key role check failed', error as Error, { userId })
    return {
      allowed: false,
      reason: 'Role check error',
    }
  }
}

/**
 * Check if user has required role
 */
export async function checkRole(
  userId: string,
  requiredRole: string
): Promise<PermissionCheckResult> {
  try {
    const supabase = await createClient()

    // Use the public.user_profiles view (points to apr.user_profiles)
    // This should work now that we've created the view and PostgREST has the apr schema
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', userId)
      .single()

    if (profileError) {
      logger.warn('Profile lookup failed in checkRole', {
        userId,
        error: profileError.message,
        code: profileError.code,
      })
      
      // Try service role as fallback in development
      if (process.env.NODE_ENV === 'development' && profileError.code === '42501') {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          return await checkRoleWithServiceKey(userId, requiredRole)
        }
      }
      
      return {
        allowed: false,
        reason: `User profile not found: ${profileError.message}`,
      }
    }

    if (!profile) {
      return {
        allowed: false,
        reason: 'User profile not found',
      }
    }

    if (profile.status !== 'active') {
      return {
        allowed: false,
        reason: `User account is ${profile.status}`,
      }
    }

    // Admin role bypasses role checks
    if (profile.role === 'admin') {
      return {
        allowed: true,
      }
    }

    const hasRole = profile.role === requiredRole

    return {
      allowed: hasRole,
      reason: hasRole ? undefined : `Required role: ${requiredRole}, user role: ${profile.role}`,
    }
  } catch (error) {
    logger.error('Role check failed', error as Error, { userId })
    return {
      allowed: false,
      reason: 'Role check error',
    }
  }
}

/**
 * Check if user has ANY of the required roles
 */
export async function checkAnyRole(
  userId: string,
  requiredRoles: string[]
): Promise<PermissionCheckResult> {
  try {
    // In development, ALWAYS try service role key first to bypass PostgREST schema issues
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'development'
    if (isDevelopment) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          logger.info('Attempting service role key check for checkAnyRole', { userId, requiredRoles })
          const { createClient: createServiceClient } = await import('@supabase/supabase-js')
          const serviceSupabase = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )

          // Use RPC or direct SQL query to bypass PostgREST schema cache issues
          // Try direct table access first
          const { data: profile, error: profileError } = await serviceSupabase
            .from('user_profiles')
            .select('role, status')
            .eq('id', userId)
            .single()

          if (!profileError && profile) {
            if (profile.status !== 'active') {
              return {
                allowed: false,
                reason: `User account is ${profile.status}`,
              }
            }

            if (profile.role === 'admin') {
              return { allowed: true }
            }

            const hasRole = requiredRoles.includes(profile.role)
            return {
              allowed: hasRole,
              reason: hasRole
                ? undefined
                : `Required roles: ${requiredRoles.join(', ')}, user role: ${profile.role}`,
            }
          }
          
          // If that fails, try RPC function
          if (profileError) {
            const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('get_user_profile', {
              user_id: userId
            })
            
            if (!rpcError && rpcData) {
              const profile = Array.isArray(rpcData) ? rpcData[0] : rpcData
              if (profile) {
                if (profile.status !== 'active') {
                  return {
                    allowed: false,
                    reason: `User account is ${profile.status}`,
                  }
                }
                if (profile.role === 'admin') {
                  return { allowed: true }
                }
                const hasRole = requiredRoles.includes(profile.role)
                return {
                  allowed: hasRole,
                  reason: hasRole
                    ? undefined
                    : `Required roles: ${requiredRoles.join(', ')}, user role: ${profile.role}`,
                }
              }
            }
          }
        } catch (error) {
          logger.warn('Service key checkAnyRole failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          // Fall through to regular check
        }
      }
    }

    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', userId)
      .single()

    if (profileError) {
      logger.warn('Profile lookup failed in checkAnyRole', {
        userId,
        error: profileError.message,
        code: profileError.code,
      })
      
      // Try service role as fallback in development
      if (process.env.NODE_ENV === 'development' && profileError.code === '42501') {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceKey) {
          try {
            const { createClient: createServiceClient } = await import('@supabase/supabase-js')
            const serviceSupabase = createServiceClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceKey,
              { auth: { autoRefreshToken: false, persistSession: false } }
            )

            const { data: profile } = await serviceSupabase
              .from('user_profiles')
              .select('role, status')
              .eq('id', userId)
              .single()

            if (profile) {
              if (profile.status !== 'active') {
                return {
                  allowed: false,
                  reason: `User account is ${profile.status}`,
                }
              }

              if (profile.role === 'admin') {
                return { allowed: true }
              }

              const hasRole = requiredRoles.includes(profile.role)
              return {
                allowed: hasRole,
                reason: hasRole
                  ? undefined
                  : `Required roles: ${requiredRoles.join(', ')}, user role: ${profile.role}`,
              }
            }
          } catch {
            // Fall through
          }
        }
      }
      
      return {
        allowed: false,
        reason: `User profile not found: ${profileError.message}`,
      }
    }

    if (!profile) {
      return {
        allowed: false,
        reason: 'User profile not found',
      }
    }

    if (profile.status !== 'active') {
      return {
        allowed: false,
        reason: `User account is ${profile.status}`,
      }
    }

    if (profile.role === 'admin') {
      return { allowed: true }
    }

    const hasRole = requiredRoles.includes(profile.role)
    return {
      allowed: hasRole,
      reason: hasRole
        ? undefined
        : `Required roles: ${requiredRoles.join(', ')}, user role: ${profile.role}`,
    }
  } catch (error) {
    logger.error('Any-role check failed', error as Error, { userId, requiredRoles })
    return {
      allowed: false,
      reason: 'Role check error',
    }
  }
}

/**
 * Create RBAC middleware for API routes
 */
export function createRBACMiddleware(options: RBACMiddlewareOptions) {
  return function withRBAC<TContext = { params?: any }>(
    handler: (
      request: NextRequest,
      userId: string,
      context: TContext
    ) => Promise<Response | (() => Promise<Response>)>
  ) {
    return async (request: NextRequest, context: TContext): Promise<Response> => {
      let response = NextResponse.next({ request })
      
      try {
        // Create Supabase client with request cookies for API routes
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll()
              },
              setAll(cookiesToSet) {
                // Update response with new cookies
                response = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) => {
                  response.cookies.set(name, value, options)
                })
              },
            },
          }
        )

        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          logger.warn('Unauthenticated access attempt', {
            path: request.nextUrl.pathname,
            error: authError?.message,
            cookieNames: request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`),
            allCookies: request.cookies.getAll().length,
          })
          
          // In development, provide more helpful error message
          if (process.env.NODE_ENV === 'development') {
            return NextResponse.json(
              {
                success: false,
                error: 'Authentication required',
                details: authError?.message || 'No user session found',
                hint: 'Make sure you are logged in. Try logging out and logging back in.',
                cookiesFound: request.cookies.getAll().length,
              },
              { status: 401 }
            )
          }
          
          return NextResponse.json(
            {
              success: false,
              error: 'Authentication required',
            },
            { status: 401 }
          )
        }

        // Debug: Log user ID for troubleshooting
        if (process.env.NODE_ENV === 'development') {
          logger.info('RBAC check', {
            userId: user.id,
            email: user.email,
            path: request.nextUrl.pathname,
          })
        }

        // Check role if specified
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        const anyRoleCheck = await checkAnyRole(user.id, options.requiredRoles)
        if (!anyRoleCheck.allowed) {
          logger.warn('Any-role check failed', {
            userId: user.id,
            requiredRoles: options.requiredRoles,
            path: request.nextUrl.pathname,
          })
          return NextResponse.json(
            {
              success: false,
              error: 'Insufficient permissions',
              details: anyRoleCheck.reason,
            },
            { status: 403 }
          )
        }
      }

        if (options.requiredRole) {
          const roleCheck = await checkRole(user.id, options.requiredRole)
          if (!roleCheck.allowed) {
            logger.warn('Role check failed', {
              userId: user.id,
              requiredRole: options.requiredRole,
              path: request.nextUrl.pathname,
            })
            return NextResponse.json(
              {
                success: false,
                error: 'Insufficient permissions',
                details: roleCheck.reason,
              },
              { status: 403 }
            )
          }
        }

        // Check permissions if specified
        if (options.requiredPermissions && options.requiredPermissions.length > 0) {
          const permCheck = await checkPermissions(
            user.id,
            options.requiredPermissions,
            options.requireAllPermissions || false
          )
          if (!permCheck.allowed) {
            logger.warn('Permission check failed', {
              userId: user.id,
              requiredPermissions: options.requiredPermissions,
              path: request.nextUrl.pathname,
            })
            return NextResponse.json(
              {
                success: false,
                error: 'Insufficient permissions',
                details: permCheck.reason,
              },
              { status: 403 }
            )
          }
        }

        // Call handler with authenticated user
        // Some existing routes return a no-arg handler from `withErrorHandler(...)` instead of invoking it.
        // To keep routes working without rewriting them all, we support both:
        // - handler returns a Response
        // - handler returns a no-arg async function that returns a Response
        const result = await handler(request, user.id, context)
        if (typeof result === 'function') {
          return await result()
        }
        return result
      } catch (error) {
        logger.error('RBAC middleware error', error as Error, {
          path: request.nextUrl.pathname,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'Authorization error',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        )
      }
    }
  }
}

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  actionType: string,
  resourceType: string,
  options?: {
    resourceId?: string
    success?: boolean
    errorMessage?: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const supabase = await createClient()

    await supabase.rpc('apr.log_user_activity', {
      p_action_type: actionType,
      p_resource_type: resourceType,
      p_resource_id: options?.resourceId || null,
      p_success: options?.success !== false,
      p_error_message: options?.errorMessage || null,
      p_metadata: options?.metadata || {},
    })
  } catch (error) {
    // Don't fail the operation if logging fails
    logger.error('Failed to log activity', error as Error, {
      userId,
      actionType,
      resourceType,
    })
  }
}

