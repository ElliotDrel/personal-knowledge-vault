/**
 * Shared API contracts for short-form video processing
 * Used by both frontend client and Supabase Edge Functions
 */

// Supported platforms for short-form video processing
export type ShortFormPlatform = 'tiktok' | 'youtube-short' | 'instagram-reel';

// Processing job status states
export type ProcessingStatus =
  | 'created'       // Job created, not yet started
  | 'detecting'     // Analyzing URL and platform
  | 'metadata'      // Extracting metadata from platform API
  | 'transcript'    // Attempting transcript extraction (YouTube only)
  | 'completed'     // Successfully completed
  | 'failed'        // Failed with recoverable error
  | 'unsupported';  // URL not supported for processing

// Specific error codes for different failure scenarios
export type ProcessingErrorCode =
  | 'invalid_url'           // URL format is invalid
  | 'unsupported_platform'  // Platform not supported
  | 'unsupported_content'   // Content type not supported (e.g., live stream)
  | 'privacy_blocked'       // Content is private/login-required
  | 'not_found'            // Content was deleted or doesn't exist
  | 'quota_exceeded'       // External API quota exceeded
  | 'api_error'            // External API returned error
  | 'rate_limited'         // Rate limited by external service
  | 'extraction_failed'    // Metadata extraction failed
  | 'transcript_failed'    // Transcript extraction failed (non-fatal)
  | 'internal_error';      // Unexpected server error

// Processing step indicators for progress tracking
export type ProcessingStep =
  | 'url_validation'
  | 'platform_detection'
  | 'metadata_extraction'
  | 'transcript_extraction'
  | 'data_normalization'
  | 'completion';

// Request interfaces
export interface ProcessVideoRequest {
  url: string;
  options?: {
    includeTranscript?: boolean;  // Whether to attempt transcript extraction
    forceRefresh?: boolean;       // Force reprocessing even if job exists
  };
}

export interface GetJobStatusRequest {
  jobId: string;
}

// Extracted metadata structure for different platforms
export interface ShortFormMetadata {
  platform: ShortFormPlatform;
  title?: string;
  description?: string;
  duration?: number;           // Duration in seconds
  thumbnailUrl?: string;
  sourceUrl: string;          // Original URL provided
  normalizedUrl: string;      // Canonical URL for deduplication

  // Creator information
  creator?: {
    name?: string;
    handle?: string;
    channelId?: string;
    channelName?: string;
    avatarUrl?: string;
  };

  // Content metadata
  content?: {
    hashtags?: string[];
    mentions?: string[];
    uploadDate?: string;      // ISO date string
    viewCount?: number;
    language?: string;
  };

  // Extraction metadata
  extraction: {
    method: 'auto' | 'manual';
    extractedAt: string;     // ISO timestamp
    apiVersion?: string;     // Version of external API used
    warnings: string[];      // Non-fatal issues during extraction
  };
}

// Response interfaces
export interface ProcessVideoResponse {
  success: true;
  jobId: string;
  status: ProcessingStatus;
  estimatedTimeMs?: number;    // Estimated processing time
  pollIntervalMs: number;      // Recommended polling interval
  message?: string;            // Human-readable status message
}

export interface ProcessVideoErrorResponse {
  success: false;
  error: {
    code: ProcessingErrorCode;
    message: string;           // User-friendly error message
    details?: string;          // Technical details for debugging
    retryAfterMs?: number;     // When client can retry (for rate limits)
    fallbackSuggestion?: string; // Suggestion for manual entry
  };
}

export interface JobStatusResponse {
  success: true;
  jobId: string;
  status: ProcessingStatus;
  currentStep?: ProcessingStep;
  progress?: number;           // 0-100 percentage

  // Available when status is 'completed'
  metadata?: ShortFormMetadata;
  transcript?: string;

  // Error information when status is 'failed'
  error?: {
    code: ProcessingErrorCode;
    message: string;
    details?: string;
    retryAfterMs?: number;
    fallbackSuggestion?: string;
  };

  // Polling guidance
  pollIntervalMs: number;
  maxPollCount?: number;       // Stop polling after this many attempts

  // Timestamps
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
  completedAt?: string;       // ISO timestamp when completed/failed
}

export interface JobStatusErrorResponse {
  success: false;
  error: {
    code: 'job_not_found' | 'invalid_job_id' | 'unauthorized' | 'internal_error';
    message: string;
  };
}

// Union types for API responses
export type ProcessVideoApiResponse = ProcessVideoResponse | ProcessVideoErrorResponse;
export type JobStatusApiResponse = JobStatusResponse | JobStatusErrorResponse;

// Utility type guards
export function isProcessVideoSuccess(response: ProcessVideoApiResponse): response is ProcessVideoResponse {
  return response.success === true;
}

export function isJobStatusSuccess(response: JobStatusApiResponse): response is JobStatusResponse {
  return response.success === true;
}

// Platform-specific configuration
export interface PlatformConfig {
  name: string;
  displayName: string;
  iconUrl?: string;
  supportedFeatures: {
    metadata: boolean;
    transcript: boolean;
    thumbnails: boolean;
  };
  urlPatterns: RegExp[];
  rateLimit?: {
    requestsPerHour: number;
    burstLimit: number;
  };
}

export const PLATFORM_CONFIGS: Record<ShortFormPlatform, PlatformConfig> = {
  'youtube-short': {
    name: 'youtube-short',
    displayName: 'YouTube Shorts',
    supportedFeatures: {
      metadata: true,
      transcript: true,
      thumbnails: true,
    },
    urlPatterns: [
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
    ],
    rateLimit: {
      requestsPerHour: 10000,
      burstLimit: 100,
    },
  },
  'tiktok': {
    name: 'tiktok',
    displayName: 'TikTok',
    supportedFeatures: {
      metadata: true,
      transcript: false,
      thumbnails: true,
    },
    urlPatterns: [
      /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
      /^https?:\/\/vm\.tiktok\.com\/[\w-]+/,
    ],
    rateLimit: {
      requestsPerHour: 1000,
      burstLimit: 10,
    },
  },
  'instagram-reel': {
    name: 'instagram-reel',
    displayName: 'Instagram Reels',
    supportedFeatures: {
      metadata: true,
      transcript: false,
      thumbnails: true,
    },
    urlPatterns: [
      /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/,
      /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+/,
    ],
    rateLimit: {
      requestsPerHour: 500,
      burstLimit: 5,
    },
  },
};

// Constants for polling behavior
export const POLLING_CONFIG = {
  DEFAULT_INTERVAL_MS: 2000,      // 2 seconds
  MAX_INTERVAL_MS: 30000,         // 30 seconds
  BACKOFF_MULTIPLIER: 1.5,        // Exponential backoff factor
  MAX_POLL_COUNT: 150,            // Stop after 5 minutes of polling
  RETRY_AFTER_DEFAULT_MS: 5000,   // Default retry-after for rate limits
} as const;