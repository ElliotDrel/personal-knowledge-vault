/**
 * ProcessVideo page - Handles short-form video processing workflow
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUrlDetection } from '@/hooks/useUrlDetection'
import { useStorageAdapter } from '@/data/storageAdapter'
import { Resource } from '@/data/mockData'
import { useAuth } from '@/hooks/useAuth'
import {
  ProcessVideoApiResponse,
  ProcessVideoRequest,
  ProcessVideoResponse,
  JobStatusApiResponse,
  JobStatusResponse,
  POLLING_CONFIG,
  ProcessingStatus
} from '@/types/shortFormApi'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Copy,
  ArrowLeft,
  Sparkles
} from 'lucide-react'

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
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
  } catch (error) {
    console.debug('randomUUID unavailable, falling back', error)
  }
  return `resource-${Date.now()}`
}

export default function ProcessVideo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const storageAdapter = useStorageAdapter()
  const { session } = useAuth()

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

  // URL detection and validation
  const {
    url,
    setUrl,
    result: urlResult,
    isDetecting,
    shouldShowProcessButton,
    getStatusMessage,
    getStatusColor,
    checkClipboard,
    canAccessClipboard
  } = useUrlDetection(initialUrl, {
    checkClipboardOnMount: true,
    onVideoDetected: (result) => {
      toast({
        title: 'Video URL Detected',
        description: `Found ${result.platformInfo?.displayName} video`,
      })
    }
  })

  // Processing state
  const [jobId, setJobId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

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

      if (!response.ok || !payload.success) {
        const message = payload.success ? 'Failed to start processing' : payload.error.message
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

      if (!response.ok || !payload.success) {
        const message = payload.success ? 'Failed to get job status' : payload.error.message
        throw new Error(message)
      }

      return payload
    },
    refetchInterval: (data) => {
      if (!data) {
        return false
      }

      if (['completed', 'failed', 'unsupported'].includes(data.status)) {
        return false
      }

      return data.pollIntervalMs ?? POLLING_CONFIG.DEFAULT_INTERVAL_MS
    }
  })

  const handleJobCompletion = useCallback(async (job: JobStatusResponse) => {
    try {
      setIsPolling(false)

      const metadata = job.metadata
      if (!metadata) {
        throw new Error('Processing completed without metadata')
      }

      const now = new Date().toISOString()
      const resource: Resource = {
        id: safeUuid(),
        type: 'video',
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
        shortFormPlatform: metadata.platform,
        shortFormMetadata: {
          handle: metadata.creator?.handle,
          channelName: metadata.creator?.channelName,
          hashtags: metadata.content?.hashtags,
          viewCount: metadata.content?.viewCount,
          extractedAt: metadata.extraction?.extractedAt,
          extractionMethod: metadata.extraction?.method
        }
      }

      const savedResource = await storageAdapter.addResource(resource)

      toast({
        title: 'Video Added Successfully',
        description: 'Your short-form video has been added to your knowledge vault',
      })

      navigate(`/resource/${savedResource.id}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The video was processed but could not be saved. Please try creating it manually.'
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

  const handleManualCreation = useCallback(() => {
    const params = new URLSearchParams()
    if (url) {
      params.set('url', url)
      params.set('type', 'video')
    }
    navigate(`/resources/new?${params.toString()}`)
  }, [navigate, url])

  const handleCopyUrl = useCallback(async () => {
    if (url && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url)
        toast({
          title: 'URL Copied',
          description: 'URL has been copied to clipboard',
        })
      } catch (error) {
        console.debug('Clipboard write failed', error)
      }
    }
  }, [toast, url])

  const handlePasteFromClipboard = useCallback(async () => {
    const found = await checkClipboard()
    if (!found) {
      toast({
        title: 'No Video URL Found',
        description: 'No supported video URL found in clipboard',
      })
    }
  }, [checkClipboard, toast])

  const isProcessing = processMutation.isPending || isPolling
  const jobProgress = jobStatus?.progress ?? 0
  const jobStatusDescription = jobStatus ? getProgressLabel(jobStatus.status, jobStatus.currentStep ?? undefined) : ''

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/resources')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Button>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Process Short-Form Video
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Automatically extract metadata, thumbnails, and transcripts from TikTok, YouTube Shorts, and Instagram Reels
            </p>
          </div>

          {/* URL Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Video URL</CardTitle>
              <CardDescription>
                Enter or paste a link to a short-form video for automatic processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="video-url">Video URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="video-url"
                    type="url"
                    placeholder="https://www.tiktok.com/@user/video/... or https://youtube.com/shorts/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  {canAccessClipboard && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePasteFromClipboard}
                      disabled={isProcessing}
                      title="Paste from clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className={`rounded-md border p-4 ${isDetecting ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-3">
                  {urlResult?.isShortFormVideo ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : urlResult?.isValid === false ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="space-y-1 text-sm">
                    <p className={`font-medium ${getStatusColor() === 'success' ? 'text-success' : getStatusColor() === 'error' ? 'text-destructive' : getStatusColor() === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {getStatusMessage() || 'Awaiting URL input'}
                    </p>
                    {urlResult?.platformInfo && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {urlResult.platformInfo.icon} {urlResult.platformInfo.displayName}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => processMutation.mutate(url)}
                  disabled={!shouldShowProcessButton || isProcessing}
                  className="flex items-center gap-2"
                >
                  {processMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {processMutation.isPending ? 'Starting...' : 'Process Video'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleManualCreation}
                  disabled={!url || isProcessing}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Create Manually
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleCopyUrl}
                  disabled={!url}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {isProcessing && jobStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing Video
                </CardTitle>
                <CardDescription>
                  Extracting metadata and content from your video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{jobStatusDescription}</span>
                    <span>{jobProgress}%</span>
                  </div>
                  <Progress value={jobProgress} className="w-full" />
                </div>

                {/* Platform Info */}
                {urlResult?.platformInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Processing {urlResult.platformInfo.displayName} video</span>
                    <Badge variant="outline" className="text-xs">
                      {urlResult.platformInfo.icon} {urlResult.platform}
                    </Badge>
                  </div>
                )}

                {/* Job Details */}
                {jobId && (
                  <div className="text-xs text-muted-foreground">
                    Job ID: {jobId}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {jobError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {jobStatusError?.message || 'Processing failed. You can try again or create the resource manually.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Supported Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">??</span>
                    <span className="font-medium">YouTube Shorts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Metadata, thumbnails, and transcripts
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">??</span>
                    <span className="font-medium">TikTok</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Metadata and thumbnails
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">??</span>
                    <span className="font-medium">Instagram Reels</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Metadata and thumbnails (public only)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}


