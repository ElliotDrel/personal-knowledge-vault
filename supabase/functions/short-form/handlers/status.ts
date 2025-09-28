/**
 * Handler for /status endpoint - retrieves processing job status
 */

import {
  GetJobStatusRequest,
  JobStatusApiResponse,
  ProcessingJobRecord,
  ShortFormMetadata,
  ProcessingStatus,
  EdgeFunctionConfig,
  POLLING_CONFIG
} from '../types.ts'
import { User, checkResourcePermission } from '../auth.ts'
import { logInfo, logError, logUserAction, Timer } from '../utils/logging.ts'

/**
 * Main handler for getting job status
 */
export async function getJobStatusHandler(
  request: GetJobStatusRequest,
  user: User,
  supabase: SupabaseServerClient,
  config: EdgeFunctionConfig
): Promise<JobStatusApiResponse> {
  const timer = new Timer()
  const { jobId } = request

  logUserAction(user.id, 'get_job_status', jobId)

  try {
    // Validate jobId format (should be UUID)
    if (!isValidUUID(jobId)) {
      logError('Invalid job ID format', { jobId, userId: user.id })
      return {
        success: false,
        error: {
          code: 'invalid_job_id',
          message: 'Invalid job ID format'
        }
      }
    }

    // Fetch job from database
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        logError('Job not found', { jobId, userId: user.id })
        return {
          success: false,
          error: {
            code: 'job_not_found',
            message: 'Processing job not found'
          }
        }
      }

      logError('Database error fetching job', {
        jobId,
        userId: user.id,
        error: error.message
      })
      return {
        success: false,
        error: {
          code: 'internal_error',
          message: 'Database error occurred'
        }
      }
    }

    const job = data as ProcessingJobRecord

    // Check user permission to access this job
    if (!checkResourcePermission(user, job.user_id)) {
      logError('Unauthorized access to job', { jobId, userId: user.id, jobUserId: job.user_id })
      return {
        success: false,
        error: {
          code: 'unauthorized',
          message: 'You do not have permission to access this job'
        }
      }
    }

    // Increment poll count
    await incrementPollCount(supabase, jobId, job.poll_count)

    // Calculate polling guidance
    const pollIntervalMs = calculatePollInterval(job.poll_count, job.status as ProcessingStatus)
    const maxPollCount = job.max_poll_count || POLLING_CONFIG.MAX_POLL_COUNT

    // Build response based on job status
    const currentStep = job.current_step ? (job.current_step as ProcessingStep) : undefined

    const baseResponse = {
      success: true as const,
      jobId: job.id,
      status: job.status as ProcessingStatus,
      currentStep,
      progress: job.progress,
      pollIntervalMs,
      maxPollCount,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at || undefined
    }

    // Add status-specific data
    if (job.status === 'completed') {
      const response: JobStatusApiResponse = {
        ...baseResponse,
        metadata: job.metadata_json as ShortFormMetadata,
        transcript: job.transcript || undefined
      }

      timer.logElapsed('get_job_status_completed', { jobId, userId: user.id })
      return response

    } else if (job.status === 'failed' || job.status === 'unsupported') {
      const response: JobStatusApiResponse = {
        ...baseResponse,
        error: job.error_code ? {
          code: job.error_code as ProcessingErrorCode,
          message: job.error_message || 'Processing failed',
          details: job.error_details || undefined,
          retryAfterMs: job.retry_after_ms || undefined,
          fallbackSuggestion: generateFallbackSuggestion(job.error_code, job.original_url)
        } : undefined
      }

      timer.logElapsed('get_job_status_failed', { jobId, userId: user.id })
      return response

    } else {
      // Job is still in progress
      const response: JobStatusApiResponse = baseResponse

      timer.logElapsed('get_job_status_in_progress', { jobId, userId: user.id })
      return response
    }

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)

    timer.logElapsed('get_job_status_error', {
      jobId,
      userId: user.id,
      error: message
    })

    logError('Unexpected error in status handler', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id,
      jobId
    })

    return {
      success: false,
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred'
      }
    }
  }
}

/**
 * Validates UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Increments poll count for a job
 */
async function incrementPollCount(supabase: SupabaseServerClient, jobId: string, currentCount: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('processing_jobs')
      .update({ poll_count: currentCount + 1 })
      .eq('id', jobId)

    if (error) {
      logError('Failed to increment poll count', {
        jobId,
        error: error.message
      })
      // Don't throw - this is not critical
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Error incrementing poll count', {
      jobId,
      error: message
    })
    // Don't throw - this is not critical
  }
}

/**
 * Calculates appropriate polling interval based on job status and poll count
 */
function calculatePollInterval(pollCount: number, status: ProcessingStatus): number {
  // If job is completed, no need to poll
  if (['completed', 'failed', 'unsupported'].includes(status)) {
    return POLLING_CONFIG.MAX_INTERVAL_MS
  }

  // Use exponential backoff for active jobs
  const baseInterval = POLLING_CONFIG.DEFAULT_INTERVAL_MS
  const backoffFactor = Math.min(
    Math.pow(POLLING_CONFIG.BACKOFF_MULTIPLIER, Math.floor(pollCount / 10)),
    POLLING_CONFIG.MAX_INTERVAL_MS / baseInterval
  )

  const interval = Math.min(
    baseInterval * backoffFactor,
    POLLING_CONFIG.MAX_INTERVAL_MS
  )

  return Math.round(interval)
}

/**
 * Generates fallback suggestions based on error code
 */
function generateFallbackSuggestion(errorCode: string | null, _originalUrl: string): string | undefined {
  if (!errorCode) return undefined

  switch (errorCode) {
    case 'privacy_blocked':
      return 'This content appears to be private. You can create a video resource manually with the basic information.'

    case 'not_found':
      return 'This content may have been deleted. You can still create a video resource manually if you have the information.'

    case 'unsupported_platform':
      return 'This platform is not supported for automatic processing. You can create a video resource manually.'

    case 'unsupported_content':
      return 'This type of content is not supported. You can create a video resource manually.'

    case 'quota_exceeded':
      return 'Processing limit reached. Please try again later or create the resource manually.'

    case 'rate_limited':
      return 'Too many requests. Please wait a moment and try again, or create the resource manually.'

    case 'extraction_failed':
      return 'Could not extract video information. You can create a video resource manually with the URL.'

    case 'transcript_failed':
      return 'Video metadata was extracted but transcript failed. You can create the resource and add transcripts manually.'

    default:
      return 'Automatic processing failed. You can create a video resource manually with this URL.'
  }
}

/**
 * Determines if a job should stop being polled
 */
export function shouldStopPolling(job: ProcessingJobRecord): boolean {
  // Stop if job is in final state
  if (['completed', 'failed', 'unsupported'].includes(job.status)) {
    return true
  }

  // Stop if maximum poll count reached
  if (job.poll_count >= (job.max_poll_count || POLLING_CONFIG.MAX_POLL_COUNT)) {
    return true
  }

  // Stop if job is too old (safety check)
  const maxAge = 30 * 60 * 1000 // 30 minutes
  const jobAge = Date.now() - new Date(job.created_at).getTime()
  if (jobAge > maxAge) {
    return true
  }

  return false
}

/**
 * Estimates remaining time for processing
 */
export function estimateRemainingTime(job: ProcessingJobRecord): number | undefined {
  if (['completed', 'failed', 'unsupported'].includes(job.status)) {
    return 0
  }

  // Simple estimation based on progress
  if (job.progress > 0) {
    const elapsed = Date.now() - new Date(job.created_at).getTime()
    const estimated = (elapsed / job.progress) * (100 - job.progress)
    return Math.max(0, Math.round(estimated))
  }

  // Default estimates by platform if no progress yet
  const estimates = {
    'youtube-short': 15000, // 15 seconds
    'tiktok': 8000,         // 8 seconds
    'instagram-reel': 10000  // 10 seconds
  }

  return estimates[job.platform as keyof typeof estimates] || 12000
}






