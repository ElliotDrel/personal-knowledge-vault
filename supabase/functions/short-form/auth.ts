/**
 * Authentication utilities for short-form video processing Edge Function
 */

import type { SupabaseServerClient } from './types.ts'
import { logError } from './utils/logging.ts'

export interface User {
  id: string
  email?: string
  aud: string
  role?: string
}

/**
 * Validates JWT token and extracts user information
 */
export async function validateJWT(authHeader: string, supabase: SupabaseServerClient): Promise<User | null> {
  try {
    const token = authHeader.replace('Bearer ', '')

    const { data, error } = await supabase.auth.getUser(token)

    if (error) {
      logError('JWT validation error', { error: error.message })
      return null
    }

    if (!data.user) {
      logError('No user found in JWT')
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email,
      aud: data.user.aud,
      role: data.user.role,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Exception during JWT validation', { error: message })
    return null
  }
}

/**
 * Extracts user from JWT token using Supabase client
 */
export async function getUserFromJWT(authHeader: string, supabase: SupabaseServerClient): Promise<User | null> {
  if (!authHeader.startsWith('Bearer ')) {
    logError('Invalid authorization header format')
    return null
  }

  return await validateJWT(authHeader, supabase)
}

/**
 * Checks if user has permission to access a specific resource
 */
export function checkResourcePermission(user: User, resourceUserId: string): boolean {
  return user.id === resourceUserId
}

/**
 * Rate limiting check for user (placeholder for future implementation)
 */
export async function checkRateLimit(userId: string, action: string): Promise<boolean> {
  // TODO: Implement actual rate limiting logic
  // For now, always allow
  return true
}

/**
 * Get user quota information (placeholder for future implementation)
 */
export async function getUserQuota(userId: string): Promise<{
  dailyProcessingJobs: number
  remainingJobs: number
  resetTime: string
}> {
  // TODO: Implement actual quota checking
  return {
    dailyProcessingJobs: 100,
    remainingJobs: 95,
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
}
