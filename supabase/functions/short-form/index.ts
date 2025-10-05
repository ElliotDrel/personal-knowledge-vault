/**
 * Supabase Edge Function: Short-Form Video Processing
 *
 * Endpoints:
 * POST /short-form/process - Initiate processing of a short-form video URL
 * GET  /short-form/status?jobId={id} - Get status of a processing job by ID
 * GET  /short-form/status?normalizedUrl={url} - Get most recent job for a URL
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  ProcessVideoRequest,
  GetJobStatusRequest,
  ProcessVideoApiResponse,
  JobStatusApiResponse,
  ProcessingJobRecord,
  HTTP_STATUS,
  POLLING_CONFIG,
  EdgeFunctionConfig,
  SupabaseServerClient
} from './types.ts'
import { getUserFromJWT, type User } from './auth.ts'
import { processVideoHandler } from './handlers/process.ts'
import { getJobStatusHandler } from './handlers/status.ts'
import { logError, logInfo } from './utils/logging.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) as SupabaseServerClient

// Load configuration from environment
const getConfig = (): EdgeFunctionConfig => {
  return {
    youtube: {
      apiKey: Deno.env.get('YOUTUBE_API_KEY'),
      quotaPerDay: parseInt(Deno.env.get('YOUTUBE_QUOTA_PER_DAY') || '10000'),
    },
    tiktok: {
      apiKey: Deno.env.get('TIKTOK_API_KEY'),
      rateLimitPerHour: parseInt(Deno.env.get('TIKTOK_RATE_LIMIT_PER_HOUR') || '1000'),
    },
    instagram: {
      apiKey: Deno.env.get('INSTAGRAM_API_KEY'),
      rateLimitPerHour: parseInt(Deno.env.get('INSTAGRAM_RATE_LIMIT_PER_HOUR') || '500'),
    },
    database: {
      connectionString: Deno.env.get('SUPABASE_DB_URL') || '',
    },
    features: {
      enableYouTubeTranscripts: Deno.env.get('ENABLE_YOUTUBE_TRANSCRIPTS') !== 'false', // Default true
      enableRateLimiting: Deno.env.get('ENABLE_RATE_LIMITING') !== 'false', // Default true
      maxJobsPerUser: parseInt(Deno.env.get('MAX_JOBS_PER_USER') || '50'),
    },
  }
}

const resolveAction = (path: string, method: string): 'process' | 'status' | null => {
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments.pop() ?? ''

  if (lastSegment === 'process' || lastSegment === 'status') {
    return lastSegment as 'process' | 'status'
  }

  if (lastSegment === 'short-form' || lastSegment === '') {
    if (method === 'POST') return 'process'
    if (method === 'GET') return 'status'
  }

  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const config = getConfig()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      logError('Missing Authorization header', { url: req.url })
      return Response.json(
        {
          success: false,
          error: {
            code: 'unauthorized' as const,
            message: 'Authorization required'
          }
        },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: corsHeaders }
      )
    }

    const user = await getUserFromJWT(authHeader, supabase)
    if (!user) {
      logError('Invalid JWT token', { authHeader: authHeader.substring(0, 20) + '...' })
      return Response.json(
        {
          success: false,
          error: {
            code: 'unauthorized' as const,
            message: 'Invalid or expired token'
          }
        },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: corsHeaders }
      )
    }

    const url = new URL(req.url)
    const action = resolveAction(url.pathname, req.method)

    logInfo('Request received', {
      method: req.method,
      path: url.pathname,
      userId: user.id,
      userAgent: req.headers.get('User-Agent')
    })

    if (req.method === 'POST' && action === 'process') {
      return await handleProcessRequest(req, user, supabase, config)
    }

    if (req.method === 'GET' && action === 'status') {
      return await handleStatusRequest(req, user, supabase, config)
    }

    logError('Unknown endpoint', { method: req.method, path: url.pathname })
    return Response.json(
      {
        success: false,
        error: {
          code: 'internal_error' as const,
          message: 'Unknown endpoint'
        }
      },
      { status: HTTP_STATUS.NOT_FOUND, headers: corsHeaders }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Unhandled error in main handler', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined
    })

    return Response.json(
      {
        success: false,
        error: {
          code: 'internal_error' as const,
          message: 'Internal server error'
        }
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, headers: corsHeaders }
    )
  }
})

async function handleProcessRequest(
  req: Request,
  user: User,
  supabaseClient: SupabaseServerClient,
  config: EdgeFunctionConfig
): Promise<Response> {
  try {
    const body: ProcessVideoRequest = await req.json()

    logInfo('Process request received', {
      userId: user.id,
      url: body.url,
      options: body.options
    })

    const response: ProcessVideoApiResponse = await processVideoHandler(
      body,
      user,
      supabaseClient,
      config
    )

    const status = response.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST
    return Response.json(response, { status, headers: corsHeaders })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Error in process handler', {
      userId: user.id,
      error: message
    })

    return Response.json(
      {
        success: false,
        error: {
          code: 'internal_error' as const,
          message: 'Failed to process request'
        }
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, headers: corsHeaders }
    )
  }
}

async function handleStatusRequest(
  req: Request,
  user: User,
  supabaseClient: SupabaseServerClient,
  config: EdgeFunctionConfig
): Promise<Response> {
  try {
    const url = new URL(req.url)
    const jobId = url.searchParams.get('jobId')
    const normalizedUrl = url.searchParams.get('normalizedUrl')

    if (!jobId && !normalizedUrl) {
      logError('Missing jobId or normalizedUrl parameter', { userId: user.id })
      return Response.json(
        {
          success: false,
          error: {
            code: 'invalid_job_id' as const,
            message: 'Either jobId or normalizedUrl parameter is required'
          }
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: corsHeaders }
      )
    }

    logInfo('Status request received', {
      userId: user.id,
      jobId,
      normalizedUrl
    })

    const request: GetJobStatusRequest = jobId
      ? { jobId }
      : { normalizedUrl: normalizedUrl! }

    const response: JobStatusApiResponse = await getJobStatusHandler(
      request,
      user,
      supabaseClient,
      config
    )

    const status = response.success ? HTTP_STATUS.OK : HTTP_STATUS.BAD_REQUEST
    return Response.json(response, { status, headers: corsHeaders })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Error in status handler', {
      userId: user.id,
      error: message
    })

    return Response.json(
      {
        success: false,
        error: {
          code: 'internal_error' as const,
          message: 'Failed to get job status'
        }
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR, headers: corsHeaders }
    )
  }
}

