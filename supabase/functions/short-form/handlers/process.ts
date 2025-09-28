/**
 * Handler for /process endpoint - initiates short-form video processing
 */

import {
  ProcessVideoRequest,
  ProcessVideoApiResponse,
  ProcessingJobRecord,
  ShortFormPlatform,
  ProcessingStatus,
  EdgeFunctionConfig,
  POLLING_CONFIG,
  PLATFORM_CONFIGS
} from '../types.ts'
import { User } from '../auth.ts'
import { logInfo, logError, logUserAction, Timer } from '../utils/logging.ts'
import { normalizeUrl, detectPlatform, validateUrl } from '../utils/urlUtils.ts'

/**
 * Main handler for processing video URLs
 */
export async function processVideoHandler(
  request: ProcessVideoRequest,
  user: User,
  supabase: SupabaseServerClient,
  config: EdgeFunctionConfig
): Promise<ProcessVideoApiResponse> {
  const timer = new Timer()
  const { url, options = {} } = request

  logUserAction(user.id, 'process_video_request', url, {
    includeTranscript: options.includeTranscript,
    forceRefresh: options.forceRefresh
  })

  try {
    // Step 1: Validate URL format
    if (!validateUrl(url)) {
      logError('Invalid URL format', { url, userId: user.id })
      return {
        success: false,
        error: {
          code: 'invalid_url',
          message: 'The provided URL is not valid',
          fallbackSuggestion: 'Please check the URL format and try again, or create the resource manually'
        }
      }
    }

    // Step 2: Normalize URL and detect platform
    const normalizedUrl = normalizeUrl(url)
    const platform = detectPlatform(normalizedUrl)

    if (!platform) {
      logError('Unsupported platform detected', { url, normalizedUrl, userId: user.id })
      return {
        success: false,
        error: {
          code: 'unsupported_platform',
          message: 'This platform is not supported for automatic processing',
          fallbackSuggestion: 'You can still create a video resource manually with this URL'
        }
      }
    }

    logInfo('Platform detected', { platform, normalizedUrl, userId: user.id })

    // Step 3: Check for existing job (idempotency)
    let existingJob: ProcessingJobRecord | null = null

    if (!options.forceRefresh) {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('normalized_url', normalizedUrl)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logError('Database error checking existing job', {
          error: error.message,
          userId: user.id,
          normalizedUrl
        })
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: 'Database error occurred',
            details: error.message
          }
        }
      }

      if (data) {
        existingJob = data as ProcessingJobRecord
        logInfo('Found existing job', { jobId: existingJob.id, status: existingJob.status, userId: user.id })

        // If job is still in progress, return the existing job
        if (!['completed', 'failed', 'unsupported'].includes(existingJob.status)) {
          return {
            success: true,
            jobId: existingJob.id,
            status: existingJob.status as ProcessingStatus,
            pollIntervalMs: existingJob.poll_interval_ms,
            message: 'Processing already in progress'
          }
        }

        // If job completed successfully and not forcing refresh, return completed job
        if (existingJob.status === 'completed' && !options.forceRefresh) {
          return {
            success: true,
            jobId: existingJob.id,
            status: 'completed' as ProcessingStatus,
            pollIntervalMs: existingJob.poll_interval_ms,
            message: 'Video already processed'
          }
        }
      }
    }

    // Step 4: Create or update processing job
    const jobData = {
      user_id: user.id,
      original_url: url,
      normalized_url: normalizedUrl,
      platform,
      status: 'created' as ProcessingStatus,
      current_step: 'url_validation',
      progress: 10,
      include_transcript: options.includeTranscript || false,
      force_refresh: options.forceRefresh || false,
      poll_interval_ms: POLLING_CONFIG.DEFAULT_INTERVAL_MS,
      max_poll_count: POLLING_CONFIG.MAX_POLL_COUNT,
      warnings: []
    }

    let job: ProcessingJobRecord

    if (existingJob && options.forceRefresh) {
      // Update existing job for refresh
      const { data, error } = await supabase
        .from('processing_jobs')
        .update({
          ...jobData,
          poll_count: 0, // Reset poll count
          error_code: null,
          error_message: null,
          error_details: null,
          metadata_json: null,
          transcript: null,
          completed_at: null
        })
        .eq('id', existingJob.id)
        .select()
        .single()

      if (error) {
        logError('Failed to update existing job', { error: error.message, jobId: existingJob.id })
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: 'Failed to update processing job'
          }
        }
      }

      job = data as ProcessingJobRecord
      logInfo('Updated existing job for refresh', { jobId: job.id, userId: user.id })

    } else {
      // Create new job
      const { data, error } = await supabase
        .from('processing_jobs')
        .insert(jobData)
        .select()
        .single()

      if (error) {
        logError('Failed to create processing job', {
          error: error.message,
          userId: user.id,
          normalizedUrl
        })
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: 'Failed to create processing job'
          }
        }
      }

      job = data as ProcessingJobRecord
      logInfo('Created new processing job', { jobId: job.id, userId: user.id })
    }

    // Step 5: Start async processing (fire and forget)
    // Note: In a real implementation, this would trigger background processing
    // For now, we'll use a simple setTimeout to simulate async processing
    startAsyncProcessing(job, supabase, config).catch(error => {
      logError('Async processing error', {
        jobId: job.id,
        error: error.message
      })
    })

    timer.logElapsed('process_video_handler', {
      jobId: job.id,
      platform,
      userId: user.id
    })

    // Step 6: Return job information for polling
    return {
      success: true,
      jobId: job.id,
      status: job.status as ProcessingStatus,
      estimatedTimeMs: getEstimatedProcessingTime(platform),
      pollIntervalMs: job.poll_interval_ms,
      message: `Processing ${PLATFORM_CONFIGS[platform].displayName} video`
    }

  } catch (error) {
    timer.logElapsed('process_video_handler_error', {
      userId: user.id,
      error: error.message
    })

    logError('Unexpected error in process handler', {
      error: error.message,
      stack: error.stack,
      userId: user.id,
      url
    })

    return {
      success: false,
      error: {
        code: 'internal_error',
        message: 'An unexpected error occurred',
        details: error.message
      }
    }
  }
}

/**
 * Start asynchronous processing of the video
 * This runs in the background after the initial response is sent
 */
async function startAsyncProcessing(
  job: ProcessingJobRecord,
  supabase: SupabaseServerClient,
  config: EdgeFunctionConfig
): Promise<void> {
  const timer = new Timer()

  try {
    logInfo('Starting async processing', { jobId: job.id, platform: job.platform })

    // Update status to detecting
    await updateJobStatus(supabase, job.id, {
      status: 'detecting',
      current_step: 'platform_detection',
      progress: 20
    })

    // Simulate processing delay (in real implementation, this would be actual API calls)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update status to metadata extraction
    await updateJobStatus(supabase, job.id, {
      status: 'metadata',
      current_step: 'metadata_extraction',
      progress: 50
    })

    // Simulate metadata extraction
    await new Promise(resolve => setTimeout(resolve, 3000))

    // For now, mark as completed with placeholder metadata
    // In real implementation, this would contain actual extracted data
    const placeholderMetadata = {
      platform: job.platform as ShortFormPlatform,
      title: 'Sample Video Title',
      sourceUrl: job.original_url,
      normalizedUrl: job.normalized_url,
      extraction: {
        method: 'auto' as const,
        extractedAt: new Date().toISOString(),
        warnings: ['This is placeholder data - actual extraction not yet implemented']
      }
    }

    await updateJobStatus(supabase, job.id, {
      status: 'completed',
      current_step: 'completion',
      progress: 100,
      metadata_json: placeholderMetadata,
      warnings: ['Processing completed with placeholder data']
    })

    timer.logElapsed('async_processing_completed', { jobId: job.id })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Error in async processing', {
      jobId: job.id,
      error: message,
      stack: error instanceof Error ? error.stack : undefined
    })

    await updateJobStatus(supabase, job.id, {
      status: 'failed',
      error_code: 'internal_error',
      error_message: 'Processing failed',
      error_details: message
    })
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  supabase: SupabaseServerClient,
  jobId: string,
  updates: Partial<ProcessingJobRecord>
): Promise<void> {
  const { error } = await supabase
    .from('processing_jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    logError('Failed to update job status', {
      jobId,
      error: error.message,
      updates
    })
    throw new Error(`Failed to update job status: ${error.message}`)
  }

  logInfo('Job status updated', { jobId, updates })
}

/**
 * Get estimated processing time based on platform
 */
function getEstimatedProcessingTime(platform: ShortFormPlatform): number {
  const estimates = {
    'youtube-short': 10000, // 10 seconds
    'tiktok': 5000,         // 5 seconds
    'instagram-reel': 7000   // 7 seconds
  }

  return estimates[platform] || 8000
}




