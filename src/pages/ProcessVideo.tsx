/**
 * ProcessVideo page - Handles short-form video processing workflow
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useUrlDetection } from '@/hooks/useUrlDetection'
import { useStorageAdapter } from '@/data/storageAdapter'
import { Resource } from '@/data/mockData'
import { useAuth } from '@/hooks/useAuth'
import { useResources } from '@/hooks/use-resources'
import { findDuplicateResourceByNormalizedUrl } from '@/utils/resourceDuplicateLookup'
import {
  ProcessVideoApiResponse,
  ProcessVideoRequest,
  ProcessVideoResponse,
  JobStatusApiResponse,
  JobStatusResponse,
  POLLING_CONFIG,
  ProcessingStatus,
  isProcessVideoSuccess,
  isJobStatusSuccess
} from '@/types/shortFormApi'
import { Loader2 } from 'lucide-react'

// Status constants for job processing (module-level to avoid re-renders)
const IN_PROGRESS_STATUSES: ProcessingStatus[] = ['created', 'detecting', 'metadata', 'transcript']
const TERMINAL_STATUSES: ProcessingStatus[] = ['completed', 'failed', 'unsupported']

const deriveFunctionsBaseUrl = (
  explicitUrl?: string | null,
  supabaseUrl?: string | null
): string | null => {
  if (explicitUrl) return explicitUrl
  if (!supabaseUrl) return null

  try {
    const parsed = new URL(supabaseUrl)
    const suffix = '.supabase.co'
    if (!parsed.hostname.endsWith(suffix)) {
      return null
    }
    const projectRef = parsed.hostname.replace(suffix, '')
    return `${parsed.protocol}//${projectRef}.functions.supabase.co`
  } catch {
    return null
  }
}

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getProgressLabel = (status: ProcessingStatus, step?: string): string => {
  const labels: Record<ProcessingStatus, string> = {
    created: 'Initializing...',
    detecting: 'Analyzing URL...',
    metadata: 'Extracting metadata...',
    transcript: 'Processing transcript...',
    completed: 'Complete!',
    failed: 'Failed',
    unsupported: 'Not supported'
  }
  return labels[status] ?? step ?? 'Processing...'
}

const safeUuid = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      // Set version (4) and variant (RFC 4122)
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
    }
  } catch (error) {
    console.debug('randomUUID/getRandomValues unavailable, falling back', error)
  }
  // Last resort fallback (non-UUID, but unique enough for dev)
  return `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function ProcessVideo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const storageAdapter = useStorageAdapter()
  const { session } = useAuth()
  const { resources, loading: resourcesLoading } = useResources()

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const explicitFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined

  const functionsBaseUrl = useMemo(
    () => deriveFunctionsBaseUrl(explicitFunctionsUrl, supabaseUrl ?? null),
    [explicitFunctionsUrl, supabaseUrl]
  )

  const getAuthorizedHeaders = useCallback((): Record<string, string> => {
    const token = session?.access_token
    if (!token) {
      throw new Error('You must be signed in to process short-form videos')
    }
    return {
      Authorization: `Bearer ${token}`
    }
  }, [session?.access_token])

  const ensureFunctionsUrl = useCallback(() => {
    if (!functionsBaseUrl) {
      throw new Error('Supabase Functions URL is not configured')
    }
    return functionsBaseUrl
  }, [functionsBaseUrl])

  // Get initial URL from query params
  const initialUrl = searchParams.get('url') || ''

  // URL detection and validation (without callback to prevent re-render loops)
  const {
    result: urlResult,
    shouldShowProcessButton
  } = useUrlDetection(initialUrl)

  // Processing state
  const [jobId, setJobId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [existingJobChecked, setExistingJobChecked] = useState(false)
  const [autoProcessAttempted, setAutoProcessAttempted] = useState(false)

  // Duplicate resource check (runs regardless of navigation origin)
  const duplicateResource = useMemo(() => {
    return findDuplicateResourceByNormalizedUrl(resources, urlResult?.normalizedUrl)
  }, [resources, urlResult?.normalizedUrl])

  // If duplicate exists, redirect immediately and inform the user
  useEffect(() => {
    if (resourcesLoading) return
    if (!urlResult?.normalizedUrl) return
    if (!duplicateResource) return

    toast({
      title: 'Resource already exists',
      description: 'Redirecting to the existing resource for this URL.',
    })
    setAutoProcessAttempted(true)
    navigate(`/resource/${duplicateResource.id}`)
  }, [duplicateResource, navigate, resourcesLoading, toast, urlResult?.normalizedUrl])

  // Check for existing job when URL is detected
  const checkExistingJobQuery = useQuery<JobStatusResponse | null, Error>({
    queryKey: ['existing-job', urlResult?.normalizedUrl ?? ''],
    enabled: !existingJobChecked && !!urlResult?.normalizedUrl && urlResult.isShortFormVideo && !jobId,
    queryFn: async () => {
      if (!urlResult?.normalizedUrl) return null

      console.log('🔍 [Job Recovery] Checking for existing job:', {
        normalizedUrl: urlResult.normalizedUrl,
        platform: urlResult.platform
      })

      const baseUrl = ensureFunctionsUrl()
      const headers = getAuthorizedHeaders()
      const statusUrl = new URL('/short-form/status', baseUrl)
      statusUrl.searchParams.set('normalizedUrl', urlResult.normalizedUrl)

      const response = await fetch(statusUrl.toString(), { headers })

      // If 404 or no job found, return null (no existing job)
      if (response.status === 404) {
        console.log('✅ [Job Recovery] No existing job found - can proceed with new processing')
        return null
      }

      const payload: JobStatusApiResponse = await response.json()

      // Type guard: narrow to success response
      if (!isJobStatusSuccess(payload)) {
        console.log('⚠️ [Job Recovery] API returned error:', payload.error)
        return null
      }

      console.log('📋 [Job Recovery] Found existing job:', {
        jobId: payload.jobId,
        status: payload.status,
        currentStep: payload.currentStep,
        progress: payload.progress,
        createdAt: payload.createdAt
      })

      // Now TypeScript knows this is JobStatusResponse
      return payload
    },
    retry: false, // Don't retry job existence checks
    staleTime: Infinity // Job check result doesn't change during session
  })

  // Mark the existing job check as complete when the query has finished
  useEffect(() => {
    if (checkExistingJobQuery.isFetched) {
      setExistingJobChecked(true)
      console.log('✓ [Job Recovery] Check complete')
    }
  }, [checkExistingJobQuery.isFetched])

  // Handle existing job detection
  useEffect(() => {
    // If query hasn't run yet or is still loading, don't process
    if (checkExistingJobQuery.isLoading || !checkExistingJobQuery.isFetched) {
      return
    }

    // Mark as checked even if no data (404 case)
    if (!checkExistingJobQuery.data) {
      console.log('✅ [Job Recovery] No existing job found - ready to process')
      if (!existingJobChecked) {
        setExistingJobChecked(true)
      }
      return
    }

    const existingJob = checkExistingJobQuery.data as JobStatusResponse

    // Completed job: Allow reprocessing but inform user
    if (existingJob.status === 'completed' && existingJob.metadata) {
      console.log('✓ [Job Recovery] Job already completed:', {
        jobId: existingJob.jobId,
        completedAt: existingJob.completedAt,
        metadata: existingJob.metadata
      })
      toast({
        title: 'Video Previously Processed',
        description: 'This video has been processed before. You can process it again or search for the existing resource.',
      })
      if (!existingJobChecked) {
        setExistingJobChecked(true)
      }
      return
    }

    // In-progress job: Resume polling
    if (IN_PROGRESS_STATUSES.includes(existingJob.status)) {
      console.log('🔄 [Job Recovery] Resuming in-progress job:', {
        jobId: existingJob.jobId,
        status: existingJob.status,
        currentStep: existingJob.currentStep,
        progress: existingJob.progress
      })
      setJobId(existingJob.jobId)
      setIsPolling(true)
      toast({
        title: 'Resuming Processing',
        description: `Found existing job in progress (${existingJob.currentStep || existingJob.status}). Resuming...`,
      })
      if (!existingJobChecked) {
        setExistingJobChecked(true)
      }
      return
    }

    // Failed job: Inform user they can retry
    if (existingJob.status === 'failed' || existingJob.status === 'unsupported') {
      console.log('❌ [Job Recovery] Previous job failed:', {
        jobId: existingJob.jobId,
        status: existingJob.status,
        error: existingJob.error
      })
      toast({
        title: 'Previous Processing Failed',
        description: existingJob.error?.message || 'The previous attempt failed. You can try processing again.',
        variant: 'destructive'
      })
      if (!existingJobChecked) {
        setExistingJobChecked(true)
      }
    }
  }, [checkExistingJobQuery.data, checkExistingJobQuery.isLoading, checkExistingJobQuery.isFetched, toast, existingJobChecked])

  const processMutation = useMutation<ProcessVideoResponse, Error, string>({
    mutationFn: async (videoUrl: string) => {
      console.log('🚀 [Processing] Starting new processing job:', { videoUrl })

      const baseUrl = ensureFunctionsUrl()
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthorizedHeaders()
      }

      const response = await fetch(`${baseUrl}/short-form/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: videoUrl,
          options: {
            includeTranscript: false
          }
        } satisfies ProcessVideoRequest)
      })

      const payload: ProcessVideoApiResponse = await response.json()

      if (!response.ok || !isProcessVideoSuccess(payload)) {
        const message = isProcessVideoSuccess(payload) ? 'Failed to start processing' : payload.error.message
        console.error('❌ [Processing] Failed to start:', { error: message, payload })
        throw new Error(message)
      }

      console.log('✓ [Processing] Job created successfully:', {
        jobId: payload.jobId,
        status: payload.status,
        estimatedTimeMs: payload.estimatedTimeMs,
        pollIntervalMs: payload.pollIntervalMs
      })

      return payload
    },
    onSuccess: (data) => {
      setJobId(data.jobId)
      setIsPolling(true)
      console.log('📊 [Processing] Starting to poll job:', data.jobId)
      toast({
        title: 'Processing Started',
        description: 'Your video is being processed. This may take a few moments.',
      })
    },
    onError: (error) => {
      setIsPolling(false)
      console.error('❌ [Processing] Mutation error:', error)
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const {
    data: jobStatus,
    error: jobStatusError,
    isError: jobError
  } = useQuery<JobStatusResponse | null, Error>({
    queryKey: ['job-status', jobId],
    enabled: isPolling && !!jobId,
    queryFn: async () => {
      if (!jobId) return null

      console.log('🔄 [Polling] Checking job status:', jobId)

      const baseUrl = ensureFunctionsUrl()
      const headers = getAuthorizedHeaders()
      const statusUrl = new URL('/short-form/status', baseUrl)
      statusUrl.searchParams.set('jobId', jobId)

      const response = await fetch(statusUrl.toString(), { headers })
      const payload: JobStatusApiResponse = await response.json()

      if (!response.ok || !isJobStatusSuccess(payload)) {
        const message = isJobStatusSuccess(payload) ? 'Failed to get job status' : payload.error.message
        console.error('❌ [Polling] Status check failed:', { error: message, payload })
        throw new Error(message)
      }

      console.log('📈 [Polling] Job status update:', {
        jobId: payload.jobId,
        status: payload.status,
        currentStep: payload.currentStep,
        progress: payload.progress,
        nextPollIn: payload.pollIntervalMs
      })

      return payload
    },
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) {
        return false
      }

      if (['completed', 'failed', 'unsupported'].includes(data.status)) {
        console.log('⏹️ [Polling] Stopping poll - terminal status reached:', data.status)
        return false
      }

      const interval = data.pollIntervalMs ?? POLLING_CONFIG.DEFAULT_INTERVAL_MS
      console.log(`⏱️ [Polling] Next poll in ${interval}ms`)
      return interval
    }
  })

  const handleJobCompletion = useCallback(async (job: JobStatusResponse) => {
    console.log('✅ [Completion] Job completed successfully:', {
      jobId: job.jobId,
      status: job.status,
      metadata: job.metadata,
      transcript: job.transcript ? `${job.transcript.length} chars` : 'none'
    })

    try {
      setIsPolling(false)

      const metadata = job.metadata
      if (!metadata) {
        console.error('❌ [Completion] No metadata in completed job')
        throw new Error('Processing completed without metadata')
      }

      const now = new Date().toISOString()
      const resource: Resource = {
        id: safeUuid(),
        type: 'short-video',
        title: metadata.title ?? 'Short-form Video',
        description: metadata.description ?? '',
        notes: '',
        tags: metadata.content?.hashtags ?? [],
        createdAt: now,
        updatedAt: now,
        url: metadata.sourceUrl,
        platform: metadata.platform ?? undefined,
        creator: metadata.creator?.name ?? metadata.creator?.handle,
        duration: metadata.duration ? formatDuration(metadata.duration) : undefined,
        transcript: job.transcript || undefined,
        // Flattened short-video metadata
        channelName: metadata.creator?.channelName,
        handle: metadata.creator?.handle,
        viewCount: metadata.content?.viewCount,
        hashtags: metadata.content?.hashtags,
        extractedAt: metadata.extraction?.extractedAt,
        extractionMethod: metadata.extraction?.method
      }

      console.log('💾 [Completion] Creating resource:', {
        id: resource.id,
        type: resource.type,
        title: resource.title,
        platform: resource.platform,
        channelName: resource.channelName,
        viewCount: resource.viewCount
      })

      const savedResource = await storageAdapter.addResource(resource)

      console.log('✓ [Completion] Resource saved successfully:', savedResource.id)

      toast({
        title: 'Video Added Successfully',
        description: 'Your short-form video has been added to your knowledge vault',
      })

      console.log('🔀 [Completion] Navigating to resource:', savedResource.id)
      navigate(`/resource/${savedResource.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The video was processed but could not be saved. Please try creating it manually.'
      console.error('❌ [Completion] Failed to save resource:', error)
      toast({
        title: 'Failed to Save Video',
        description: message,
        variant: 'destructive'
      })
    }
  }, [navigate, storageAdapter, toast])

  useEffect(() => {
    if (!jobStatus) {
      return
    }

    if (jobStatus.status === 'completed' && jobStatus.metadata) {
      void handleJobCompletion(jobStatus)
      return
    }

    if (jobStatus.status === 'failed' || jobStatus.status === 'unsupported') {
      setIsPolling(false)
      const description = jobStatus.error?.message || 'Processing could not be completed'
      toast({
        title: 'Processing Failed',
        description,
        variant: 'destructive'
      })
    }
  }, [handleJobCompletion, jobStatus, toast])

  // Derived state (must come before useEffect hooks that use it)
  const isProcessing = processMutation.isPending || isPolling
  const jobProgress = jobStatus?.progress ?? 0
  const jobStatusDescription = jobStatus ? getProgressLabel(jobStatus.status, jobStatus.currentStep ?? undefined) : ''
  const currentStatusText = jobStatusDescription || (isProcessing ? 'Processing...' : 'Preparing...')

  // Auto-start processing when page loads with valid URL (gated by existing job check)
  useEffect(() => {
    // Only attempt auto-processing once per session
    if (autoProcessAttempted) {
      console.log('⏭️ [Auto-Process] Already attempted, skipping')
      return
    }

    // Abort auto-process if duplicate was found (redirect handled elsewhere)
    if (duplicateResource) {
      console.log('⛔ [Auto-Process] Duplicate resource exists, skipping processing')
      setAutoProcessAttempted(true)
      return
    }

    if (!existingJobChecked) {
      console.log('⏳ [Auto-Process] Waiting for existing job check to complete')
      return
    }

    if (!urlResult?.normalizedUrl) {
      console.log('⏳ [Auto-Process] Waiting for URL detection')
      return
    }

    if (!shouldShowProcessButton) {
      console.log('⚠️ [Auto-Process] URL not processable, skipping auto-process')
      setAutoProcessAttempted(true)
      return
    }

    if (jobId) {
      console.log('ℹ️ [Auto-Process] Job already exists, skipping auto-process')
      setAutoProcessAttempted(true)
      return
    }

    if (processMutation.isPending || isPolling) {
      console.log('ℹ️ [Auto-Process] Processing already in progress')
      return
    }

    console.log('🚀 [Auto-Process] Starting automatic processing for:', urlResult.normalizedUrl)
    setAutoProcessAttempted(true)
    processMutation.mutate(urlResult.normalizedUrl)
  }, [
    autoProcessAttempted,
    duplicateResource,
    existingJobChecked,
    shouldShowProcessButton,
    jobId,
    processMutation,
    isPolling,
    urlResult?.normalizedUrl
  ])

  // Warn on navigation during processing
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isProcessing])

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{currentStatusText}</span>
          </div>
          <Progress value={jobProgress} className="w-full" />
          <div className="text-center text-xs text-muted-foreground">{jobProgress}%</div>
        </div>
      </div>
    </Layout>
  )
}


