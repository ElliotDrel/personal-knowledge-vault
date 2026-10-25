/**
 * ProcessVideo page - Handles short-form video processing workflow
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Loader2, AlertCircle, RefreshCw, Home } from 'lucide-react'

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
    // Fallback to non-UUID if crypto is unavailable
    console.debug('Crypto unavailable, using fallback ID generation');
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
  const [failureInfo, setFailureInfo] = useState<{
    message: string
    details?: string
  } | null>(null)

  // Duplicate resource check (runs regardless of navigation origin)
  const duplicateResource = useMemo(() => {
    return findDuplicateResourceByNormalizedUrl(resources, urlResult?.normalizedUrl)
  }, [resources, urlResult?.normalizedUrl])

  // Redirect to dashboard if no URL was provided
  useEffect(() => {
    // Wait for resources to load to avoid premature redirects
    if (resourcesLoading) return

    // If there's no initial URL, redirect to dashboard
    if (!initialUrl || initialUrl.trim() === '') {
      toast({
        title: 'No URL Provided',
        description: 'Please provide a video URL to process.',
        variant: 'destructive'
      })
      navigate('/')
      return
    }
  }, [initialUrl, navigate, resourcesLoading, toast])

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

  // If URL validation failed, show error UI
  useEffect(() => {
    // Only check after URL detection has run
    if (!urlResult) return

    // Only handle invalid URLs
    if (urlResult.isValid) return

    // Don't re-trigger if error is already shown
    if (failureInfo) return


    // Show toast notification
    toast({
      title: 'Invalid URL',
      description: urlResult.errorMessage || 'Please check the URL format and try again.',
      variant: 'destructive'
    })

    // Set failure state to show error UI (same pattern as processMutation.onError)
    setFailureInfo({
      message: urlResult.errorMessage || 'Invalid URL format',
      details: 'Please check that you have entered a complete and valid video URL. YouTube video IDs must be exactly 11 characters.'
    })

    // Prevent infinite loops - mark checks as complete
    setAutoProcessAttempted(true)
    setExistingJobChecked(true)
  }, [urlResult, toast, failureInfo])

  // If URL is not recognized as a short-form video, show error UI
  useEffect(() => {
    // Only check after URL detection has run
    if (!urlResult) return

    // Only handle valid URLs that are not short-form videos
    if (!urlResult.isValid) return
    if (urlResult.isShortFormVideo) return

    // Don't re-trigger if error is already shown
    if (failureInfo) return


    // Show toast notification
    toast({
      title: 'Unsupported URL',
      description: 'This URL is not recognized as a supported short-form video platform.',
      variant: 'destructive'
    })

    // Set failure state to show error UI
    setFailureInfo({
      message: 'Unsupported short-form video URL',
      details: `The URL "${urlResult.normalizedUrl}" is not recognized as a YouTube Short, TikTok, or Instagram Reel. Please check the URL and try again.`
    })

    // Prevent infinite loops - mark checks as complete
    setAutoProcessAttempted(true)
    setExistingJobChecked(true)
  }, [urlResult, toast, failureInfo])

  // Check for existing job when URL is detected
  const checkExistingJobQuery = useQuery<JobStatusResponse | null, Error>({
    queryKey: ['existing-job', urlResult?.normalizedUrl ?? ''],
    enabled: !existingJobChecked && !!urlResult?.normalizedUrl && urlResult.isShortFormVideo && !jobId,
    queryFn: async () => {
      if (!urlResult?.normalizedUrl) return null


      const baseUrl = ensureFunctionsUrl()
      const headers = getAuthorizedHeaders()
      const statusUrl = new URL('/short-form/status', baseUrl)
      statusUrl.searchParams.set('normalizedUrl', urlResult.normalizedUrl)

      const response = await fetch(statusUrl.toString(), { headers })

      // If 404 or no job found, return null (no existing job)
      if (response.status === 404) {
        return null
      }

      const payload: JobStatusApiResponse = await response.json()

      // Type guard: narrow to success response
      if (!isJobStatusSuccess(payload)) {
        return null
      }


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
      if (!existingJobChecked) {
        setExistingJobChecked(true)
      }
      return
    }

    const existingJob = checkExistingJobQuery.data as JobStatusResponse

    // Completed job: Allow reprocessing but inform user
    if (existingJob.status === 'completed' && existingJob.metadata) {
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
            includeTranscript: true
          }
        } satisfies ProcessVideoRequest)
      })

      const payload: ProcessVideoApiResponse = await response.json()

      if (!response.ok || !isProcessVideoSuccess(payload)) {
        const message = isProcessVideoSuccess(payload) ? 'Failed to start processing' : payload.error.message
        console.error('❌ [Processing] Failed to start:', { error: message, payload })
        throw new Error(message)
      }


      return payload
    },
    onSuccess: (data) => {
      setJobId(data.jobId)
      setIsPolling(true)
      toast({
        title: 'Processing Started',
        description: 'Your video is being processed. This may take a few moments.',
      })
    },
    onError: (error) => {
      setIsPolling(false)
      setFailureInfo({
        message: error.message,
        details: error instanceof Error ? error.stack : undefined
      })
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


      return payload
    },
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) {
        return false
      }

      if (['completed', 'failed', 'unsupported'].includes(data.status)) {
        return false
      }

      const interval = data.pollIntervalMs ?? POLLING_CONFIG.DEFAULT_INTERVAL_MS
      return interval
    }
  })

  const handleJobCompletion = useCallback(async (job: JobStatusResponse) => {

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


      const savedResource = await storageAdapter.addResource(resource)


      toast({
        title: 'Video Added Successfully',
        description: 'Your short-form video has been added to your knowledge vault',
      })

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
      const message = jobStatus.error?.message || 'Processing could not be completed'
      setFailureInfo({
        message,
        details: jobStatus.error?.details
      })
      toast({
        title: 'Processing Failed',
        description: message,
        variant: 'destructive'
      })
    }
  }, [handleJobCompletion, jobStatus, toast])

  // Derived state (must come before useEffect hooks that use it)
  const isProcessing = processMutation.isPending || isPolling
  const jobProgress = jobStatus?.progress ?? 0
  const jobStatusDescription = jobStatus ? getProgressLabel(jobStatus.status, jobStatus.currentStep ?? undefined) : ''
  const currentStatusText = jobStatusDescription || (isProcessing ? 'Processing...' : 'Preparing...')

  // Handlers for error state actions
  const handleTryAgain = useCallback(() => {
    
    // Reset state and retry (for both validation and processing errors)
    setFailureInfo(null)
    setJobId(null)
    setIsPolling(false)
    setAutoProcessAttempted(false)
    setExistingJobChecked(false)
    // The validation or auto-process effect will trigger again when state is reset
  }, [])

  const handleGoBackToDashboard = useCallback(() => {
    navigate('/')
  }, [navigate])

  // Auto-start processing when page loads with valid URL (gated by existing job check)
  useEffect(() => {
    // Only attempt auto-processing once per session
    if (autoProcessAttempted) {
      return
    }

    // Abort auto-process if duplicate was found (redirect handled elsewhere)
    if (duplicateResource) {
      setAutoProcessAttempted(true)
      return
    }

    if (!existingJobChecked) {
      return
    }

    if (!urlResult?.normalizedUrl) {
      return
    }

    if (!shouldShowProcessButton) {
      setAutoProcessAttempted(true)
      return
    }

    if (jobId) {
      setAutoProcessAttempted(true)
      return
    }

    if (processMutation.isPending || isPolling) {
      return
    }

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

  // Show error state if processing failed
  if (failureInfo) {
    return (
      <Layout>
        <div className="container max-w-2xl mx-auto py-12 px-4">
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Processing Failed</CardTitle>
              </div>
              <CardDescription>
                We encountered an error while processing your video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{failureInfo.message}</AlertDescription>
              </Alert>

              {failureInfo.details && (
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {failureInfo.details}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleTryAgain}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={handleGoBackToDashboard}
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  // Show processing state
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


