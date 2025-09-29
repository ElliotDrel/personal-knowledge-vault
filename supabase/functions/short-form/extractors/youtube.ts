import {
  EdgeFunctionConfig,
  PlatformExtractionResult,
  ProcessingErrorCode,
  ShortFormMetadata,
  TIMEOUTS
} from '../types.ts'
import { logInfo, logError, logWarn } from '../utils/logging.ts'

/**
 * Extract metadata from YouTube using Data API v3
 */
export async function extractYouTubeMetadata(
  url: string,
  config: EdgeFunctionConfig,
  includeTranscript = false
): Promise<PlatformExtractionResult> {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) {
    logError('Failed to extract video ID from YouTube URL', { url })
    return {
      success: false,
      error: {
        code: 'invalid_url',
        message: 'Could not extract video ID from YouTube URL',
        details: 'The URL format may be unsupported or malformed'
      }
    }
  }

  if (!config.youtube.apiKey) {
    logError('YouTube API key not configured', { videoId })
    return {
      success: false,
      error: {
        code: 'api_error',
        message: 'YouTube API key not configured',
        details: 'Please set YOUTUBE_API_KEY in Supabase secrets'
      }
    }
  }

  try {
    logInfo('Starting YouTube metadata extraction', { videoId, includeTranscript })

    const parts = ['snippet', 'contentDetails', 'statistics']
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=${parts.join(',')}&` +
      `id=${videoId}&` +
      `key=${config.youtube.apiKey}`

    const response = await fetchWithTimeout(apiUrl, {
      headers: {
        'User-Agent': 'ShortFormVideoProcessor/1.0'
      }
    }, TIMEOUTS.YOUTUBE_API)

    if (!response.ok) {
      const rawBody = await response.text()
      let errorJson: YouTubeApiErrorResponse | undefined
      try {
        errorJson = rawBody ? (JSON.parse(rawBody) as YouTubeApiErrorResponse) : undefined
      } catch (_parseError) {
        // Ignore JSON parse failures; fall back to raw response
      }

      const errorPayload = errorJson?.error
      const primaryReason = errorPayload?.errors?.[0]?.reason
      const apiMessage = errorPayload?.message

      logError('YouTube API request failed', {
        status: response.status,
        statusText: response.statusText,
        videoId,
        reason: primaryReason,
        error: apiMessage || rawBody
      })

      if (response.status === 403) {
        const { code, message, details } = interpretYouTube403Error(primaryReason, apiMessage)
        const enrichedDetails = details || apiMessage || primaryReason || rawBody || undefined

        return {
          success: false,
          error: {
            code,
            message,
            details: enrichedDetails
          }
        }
      }

      if (response.status === 404) {
        return {
          success: false,
          error: {
            code: 'not_found',
            message: apiMessage || 'Video not found or private',
            details: primaryReason || rawBody || 'The video may be private, deleted, or the ID is incorrect'
          }
        }
      }

      return {
        success: false,
        error: {
          code: 'api_error',
          message: apiMessage || `YouTube API request failed (${response.status})`,
          details: primaryReason || rawBody || response.statusText
        }
      }
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      logError('No video data returned from YouTube API', { videoId })
      return {
        success: false,
        error: {
          code: 'not_found',
          message: 'Video not found',
          details: 'The video may be private or deleted'
        }
      }
    }

    const video = data.items[0]
    const snippet = video.snippet || {}
    const contentDetails = video.contentDetails || {}
    const statistics = video.statistics || {}

    const warnings: string[] = []
    const extractedAt = new Date().toISOString()

    const metadata: ShortFormMetadata = {
      platform: 'youtube-short',
      title: snippet.title || 'Untitled Video',
      description: snippet.description || undefined,
      duration: parseYouTubeDuration(contentDetails.duration),
      thumbnailUrl: snippet.thumbnails?.high?.url ||
                    snippet.thumbnails?.medium?.url ||
                    snippet.thumbnails?.default?.url,
      sourceUrl: url,
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,

      creator: {
        name: snippet.channelTitle || undefined,
        channelId: snippet.channelId || undefined,
        channelName: snippet.channelTitle || undefined
      },

      content: {
        hashtags: extractHashtags(snippet.description || ''),
        uploadDate: snippet.publishedAt || undefined,
        viewCount: statistics.viewCount ? parseInt(statistics.viewCount, 10) : undefined,
        language: snippet.defaultLanguage || snippet.defaultAudioLanguage || undefined
      },

      extraction: {
        method: 'auto',
        extractedAt,
        apiVersion: 'YouTube Data API v3',
        warnings
      }
    }

    logInfo('Successfully extracted YouTube metadata', {
      videoId,
      title: metadata.title,
      duration: metadata.duration,
      viewCount: metadata.content?.viewCount
    })

    let transcript: string | undefined
    if (includeTranscript) {
      if (config.features?.enableYouTubeTranscripts) {
        try {
          transcript = await extractYouTubeTranscript(videoId, config)
          if (!transcript) {
            warnings.push('Transcript extraction not yet implemented')
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logWarning('Transcript extraction failed', { videoId, error: message })
          warnings.push('Transcript extraction encountered an error')
        }
      } else {
        warnings.push('Transcript extraction disabled in configuration')
      }
    }

    return {
      success: true,
      metadata,
      transcript
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Unexpected error in YouTube extraction', {
      videoId,
      error: message
    })

    return {
      success: false,
      error: {
        code: 'extraction_failed',
        message: 'Failed to extract YouTube metadata',
        details: message
      }
    }
  }
}

type YouTubeApiErrorResponse = {
  error?: {
    message?: string
    errors?: Array<{
      message?: string
      domain?: string
      reason?: string
    }>
  }
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/i,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/i
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function parseYouTubeDuration(duration: string): number | undefined {
  if (!duration) return undefined

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return undefined

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

function extractHashtags(text: string): string[] {
  if (!text) return []
  const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi
  const matches = text.match(hashtagRegex)
  return matches ? matches.map(tag => tag.toLowerCase()) : []
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = TIMEOUTS.DEFAULT_EXTERNAL
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

function interpretYouTube403Error(
  reason?: string,
  apiMessage?: string
): {
  code: ProcessingErrorCode
  message: string
  details?: string
} {
  const normalized = reason?.toLowerCase()
  const detailsBase = reason && apiMessage ? `${reason}: ${apiMessage}` : reason || apiMessage

  switch (normalized) {
    case 'quotaexceeded':
    case 'quota_exceeded':
    case 'dailylimitexceeded':
    case 'dailylimitexceededunreg':
    case 'userquotaexceeded':
    case 'userratelimitexceeded':
    case 'ratelimitexceeded':
      return {
        code: 'quota_exceeded',
        message: 'YouTube API quota exceeded',
        details: detailsBase
      }

    case 'accessnotconfigured':
    case 'keyinvalid':
    case 'forbidden':
    case 'insufficientpermissions':
    case 'signuprequired':
    case 'youtube_signup_required':
    case 'youtubesignuprequired':
      return {
        code: 'api_error',
        message: 'YouTube API credentials rejected',
        details: detailsBase
      }

    case 'videonotfound':
    case 'channelnotfound':
    case 'playlisterror':
      return {
        code: 'not_found',
        message: 'Video not found or unavailable',
        details: detailsBase
      }

    case 'private':
    case 'privatenotaccessible':
    case 'videoprivate':
    case 'limitedpublic':
      return {
        code: 'privacy_blocked',
        message: 'Video is private or restricted',
        details: detailsBase
      }

    default:
      return {
        code: 'api_error',
        message: apiMessage || 'YouTube API request forbidden',
        details: detailsBase || undefined
      }
  }
}

async function extractYouTubeTranscript(
  videoId: string,
  config: EdgeFunctionConfig
): Promise<string | undefined> {
  logInfo('Transcript extraction not yet implemented', { videoId })

  // TODO: Implement transcript extraction via YouTube timedtext or Captions API
  // This will require authentication and parsing caption tracks.

  return undefined
}
