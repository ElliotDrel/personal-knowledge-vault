/**
 * Shared types for short-form video processing Edge Function
 *
 * ⚠️ SYNC WARNING ⚠️
 * ==================
 * This file contains COPIES of configs from the frontend.
 * DO NOT EDIT THESE DIRECTLY - they are synced from frontend source of truth.
 *
 * Duplicated configs:
 * - PLATFORM_CONFIGS (synced from src/types/shortFormApi.ts)
 * - POLLING_CONFIG (synced from src/types/shortFormApi.ts)
 *
 * SOURCE OF TRUTH: src/types/shortFormApi.ts
 * THIS FILE IS:    Copy (supabase/functions/short-form/types.ts)
 *
 * WHY: Edge Functions cannot import from src/ directory (Deno runtime limitation)
 *
 * AUTOMATED PROTECTION:
 * - Deployment blocked if configs are out of sync
 * - Always use `npm run deploy:edge:short-form` to deploy (auto-validates sync)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type alias for clarity - using simple SupabaseClient to avoid deployment issues
// The complex generic Record<string, never> was causing boot errors
export type SupabaseServerClient = SupabaseClient

// Add timeout constants for better maintainability
export const TIMEOUTS = {
  YOUTUBE_API: 10000,       // 10 seconds for YouTube API calls
  DEFAULT_EXTERNAL: 15000,  // 15 seconds for other external APIs
  PROCESSING_MAX: 300000    // 5 minutes max for complete processing
} as const

// Re-export the types that are also used on the frontend
export type ShortFormPlatform = 'tiktok' | 'youtube-short' | 'instagram-reel';

export type ProcessingStatus =
  | 'created'
  | 'detecting'
  | 'metadata'
  | 'transcript'
  | 'completed'
  | 'failed'
  | 'unsupported';

export type ProcessingErrorCode =
  | 'invalid_url'
  | 'unsupported_platform'
  | 'unsupported_content'
  | 'privacy_blocked'
  | 'not_found'
  | 'quota_exceeded'
  | 'api_error'
  | 'rate_limited'
  | 'extraction_failed'
  | 'transcript_failed'
  | 'internal_error';

export type ProcessingStep =
  | 'url_validation'
  | 'platform_detection'
  | 'metadata_extraction'
  | 'transcript_extraction'
  | 'data_normalization'
  | 'completion';

export interface ProcessVideoRequest {
  url: string;
  options?: {
    includeTranscript?: boolean;
  };
}

// Discriminated union ensures exactly one parameter is provided (compile-time safety)
export type GetJobStatusRequest =
  | { jobId: string; normalizedUrl?: never }
  | { normalizedUrl: string; jobId?: never }

export interface ShortFormMetadata {
  platform: ShortFormPlatform;
  title?: string;
  description?: string;
  duration?: number;
  thumbnailUrl?: string;
  sourceUrl: string;
  normalizedUrl: string;

  creator?: {
    name?: string;
    handle?: string;
    channelId?: string;
    channelName?: string;
    avatarUrl?: string;
  };

  content?: {
    hashtags?: string[];
    mentions?: string[];
    uploadDate?: string;
    viewCount?: number;
    language?: string;
  };

  extraction: {
    method: 'auto' | 'manual';
    extractedAt: string;
    apiVersion?: string;
    warnings: string[];
  };
}

export interface PlatformExtractionResult {
  success: boolean;
  metadata?: ShortFormMetadata;
  transcript?: string;
  error?: {
    code: ProcessingErrorCode;
    message: string;
    details?: string;
  };
}

export interface ProcessVideoResponse {
  success: true;
  jobId: string;
  status: ProcessingStatus;
  estimatedTimeMs?: number;
  pollIntervalMs: number;
  message?: string;
}

export interface ProcessVideoErrorResponse {
  success: false;
  error: {
    code: ProcessingErrorCode;
    message: string;
    details?: string;
    retryAfterMs?: number;
    fallbackSuggestion?: string;
  };
}

export interface JobStatusResponse {
  success: true;
  jobId: string;
  status: ProcessingStatus;
  currentStep?: ProcessingStep;
  progress?: number;
  metadata?: ShortFormMetadata;
  transcript?: string;
  error?: {
    code: ProcessingErrorCode;
    message: string;
    details?: string;
    retryAfterMs?: number;
    fallbackSuggestion?: string;
  };
  pollIntervalMs: number;
  maxPollCount?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface JobStatusErrorResponse {
  success: false;
  error: {
    code: 'job_not_found' | 'invalid_job_id' | 'unauthorized' | 'internal_error';
    message: string;
  };
}

export type ProcessVideoApiResponse = ProcessVideoResponse | ProcessVideoErrorResponse;
export type JobStatusApiResponse = JobStatusResponse | JobStatusErrorResponse;

// Database record type (maps to processing_jobs table)
export interface ProcessingJobRecord {
  id: string;
  user_id: string;
  original_url: string;
  normalized_url: string;
  platform: ShortFormPlatform;
  status: ProcessingStatus;
  current_step?: ProcessingStep;
  progress: number;
  error_code?: ProcessingErrorCode;
  error_message?: string;
  error_details?: string;
  retry_after_ms?: number;
  metadata_json?: ShortFormMetadata;
  transcript?: string;
  warnings: string[];
  api_version?: string;
  extraction_method: 'auto' | 'manual';
  poll_count: number;
  max_poll_count: number;
  poll_interval_ms: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  include_transcript: boolean;
}

// Platform configuration
// ⚠️ DO NOT EDIT: This is synced from src/types/shortFormApi.ts
export interface PlatformConfig {
  name: string;
  displayName: string;
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

// Environment configuration
export interface EdgeFunctionConfig {
  youtube: {
    apiKey?: string;
    quotaPerDay: number;
  };
  tiktok: {
    apiKey?: string;
    rateLimitPerHour: number;
  };
  instagram: {
    apiKey?: string;
    rateLimitPerHour: number;
  };
  database: {
    connectionString: string;
  };
  features: {
    enableYouTubeTranscripts: boolean;
    enableRateLimiting: boolean;
    maxJobsPerUser: number;
  };
}

// Constants
// ⚠️ DO NOT EDIT: This is synced from src/types/shortFormApi.ts
export const POLLING_CONFIG = {
  DEFAULT_INTERVAL_MS: 2000,
  MAX_INTERVAL_MS: 30000,
  BACKOFF_MULTIPLIER: 1.5,
  MAX_POLL_COUNT: 150,
  RETRY_AFTER_DEFAULT_MS: 5000,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

