/**
 * Frontend URL detection utilities for short-form video processing
 * Handles URL validation, normalization, and platform detection
 */

import { ShortFormPlatform, PLATFORM_CONFIGS } from '@/types/shortFormApi'

export interface UrlDetectionResult {
  isShortFormVideo: boolean
  platform: ShortFormPlatform | null
  normalizedUrl: string
  originalUrl: string
  isValid: boolean
  platformInfo: PlatformInfo | null
  errorMessage?: string
}

export interface PlatformInfo {
  name: string
  displayName: string
  icon: string
  supportedFeatures: {
    metadata: boolean
    transcript: boolean
    thumbnails: boolean
  }
}

// Frontend-specific platform configuration (matches backend but with UI elements)
const FRONTEND_PLATFORM_CONFIGS: Record<ShortFormPlatform, PlatformInfo> = {
  'youtube-short': {
    name: 'youtube-short',
    displayName: 'YouTube Shorts',
    icon: '??', // YouTube icon
    supportedFeatures: {
      metadata: true,
      transcript: true,
      thumbnails: true,
    },
  },
  'tiktok': {
    name: 'tiktok',
    displayName: 'TikTok',
    icon: '🎵', // TikTok icon
    supportedFeatures: {
      metadata: true,
      transcript: false,
      thumbnails: true,
    },
  },
  'instagram-reel': {
    name: 'instagram-reel',
    displayName: 'Instagram Reels',
    icon: '📸', // Instagram icon
    supportedFeatures: {
      metadata: true,
      transcript: false,
      thumbnails: true,
    },
  },
}

/**
 * Main function to detect and analyze URLs
 */
export function detectShortFormVideo(url: string): UrlDetectionResult {
  const trimmedUrl = url.trim()

  // Basic URL validation
  if (!trimmedUrl) {
    return {
      isShortFormVideo: false,
      platform: null,
      normalizedUrl: '',
      originalUrl: url,
      isValid: false,
      platformInfo: null,
      errorMessage: 'URL cannot be empty'
    }
  }

  if (!isValidUrl(trimmedUrl)) {
    return {
      isShortFormVideo: false,
      platform: null,
      normalizedUrl: trimmedUrl,
      originalUrl: url,
      isValid: false,
      platformInfo: null,
      errorMessage: 'Invalid URL format'
    }
  }

  // Normalize URL
  const normalizedUrl = normalizeUrl(trimmedUrl)

  // Detect platform
  const platform = detectPlatform(normalizedUrl)

  if (!platform) {
    return {
      isShortFormVideo: false,
      platform: null,
      normalizedUrl,
      originalUrl: url,
      isValid: true,
      platformInfo: null,
      errorMessage: 'This platform is not supported for automatic processing'
    }
  }

  return {
    isShortFormVideo: true,
    platform,
    normalizedUrl,
    originalUrl: url,
    isValid: true,
    platformInfo: FRONTEND_PLATFORM_CONFIGS[platform]
  }
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Normalizes a URL to a canonical form
 * This should match the backend normalization logic
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    // Convert to HTTPS
    parsed.protocol = 'https:'

    // Normalize domain
    let hostname = parsed.hostname.toLowerCase()

    // Remove 'www.' prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }

    // Handle platform-specific normalizations
    if (hostname === 'youtube.com' || hostname === 'youtu.be') {
      return normalizeYouTubeUrl(parsed)
    } else if (hostname === 'tiktok.com' || hostname.includes('tiktok.com')) {
      return normalizeTikTokUrl(parsed)
    } else if (hostname === 'instagram.com') {
      return normalizeInstagramUrl(parsed)
    }

    // Default normalization
    parsed.hostname = hostname

    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ref', 'source', 'campaign'
    ]

    trackingParams.forEach(param => {
      parsed.searchParams.delete(param)
    })

    // Remove fragment (hash)
    parsed.hash = ''

    return parsed.toString()

  } catch (error) {
    console.warn('Failed to normalize URL, returning original:', error)
    return url
  }
}

/**
 * Normalizes YouTube URLs to a standard format
 */
function normalizeYouTubeUrl(parsed: URL): string {
  // Handle youtu.be short URLs
  if (parsed.hostname === 'youtu.be') {
    const videoId = parsed.pathname.substring(1) // Remove leading slash
    return `https://youtube.com/watch?v=${videoId}`
  }

  parsed.hostname = 'youtube.com'

  // Handle /shorts/ URLs
  if (parsed.pathname.startsWith('/shorts/')) {
    const videoId = parsed.pathname.split('/shorts/')[1].split('?')[0]
    return `https://youtube.com/watch?v=${videoId}`
  }

  // Keep only essential parameters
  const videoId = parsed.searchParams.get('v')
  if (videoId) {
    return `https://youtube.com/watch?v=${videoId}`
  }

  return parsed.toString()
}

/**
 * Normalizes TikTok URLs to a standard format
 */
function normalizeTikTokUrl(parsed: URL): string {
  const originalHost = parsed.hostname.toLowerCase()

  if (originalHost === 'vm.tiktok.com') {
    parsed.hostname = 'vm.tiktok.com'
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  }

  parsed.hostname = 'tiktok.com'
  parsed.search = ''
  parsed.hash = ''

  return parsed.toString()
}

/**
 * Normalizes Instagram URLs to a standard format
 */
function normalizeInstagramUrl(parsed: URL): string {
  parsed.hostname = 'instagram.com'

  // Remove tracking parameters and fragments
  parsed.search = ''
  parsed.hash = ''

  return parsed.toString()
}

/**
 * Detects the platform from a normalized URL
 */
export function detectPlatform(normalizedUrl: string): ShortFormPlatform | null {
  try {
    for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
      for (const pattern of config.urlPatterns) {
        if (pattern.test(normalizedUrl)) {
          return platform as ShortFormPlatform
        }
      }
    }

    return null

  } catch (error) {
    console.warn('Error detecting platform:', error)
    return null
  }
}

/**
 * Gets display information for a platform
 */
export function getPlatformInfo(platform: ShortFormPlatform): PlatformInfo {
  return FRONTEND_PLATFORM_CONFIGS[platform]
}

/**
 * Extracts video ID from platform-specific URLs
 */
export function extractVideoId(url: string, platform: ShortFormPlatform): string | null {
  try {
    const parsed = new URL(url)

    switch (platform) {
      case 'youtube-short': {
        // Extract from /watch?v=ID or /shorts/ID
        const vParam = parsed.searchParams.get('v')
        if (vParam) {
          return vParam
        }

        const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/)
        if (shortsMatch) {
          return shortsMatch[1]
        }

        return null
      }

      case 'tiktok': {
        // Extract from /@username/video/ID
        const tiktokMatch = parsed.pathname.match(/\/video\/(\d+)/)
        if (tiktokMatch) {
          return tiktokMatch[1]
        }

        // For vm.tiktok.com, the path itself is the ID
        if (parsed.hostname === 'vm.tiktok.com') {
          return parsed.pathname.substring(1) // Remove leading slash
        }

        return null
      }

      case 'instagram-reel': {
        // Extract from /reel/ID or /p/ID
        const igMatch = parsed.pathname.match(/\/(?:reel|p)\/([^/?]+)/)
        if (igMatch) {
          return igMatch[1]
        }

        return null
      }

      default:
        return null
    }

  } catch (error) {
    console.warn('Error extracting video ID:', error)
    return null
  }
}

/**
 * Checks if clipboard contains a short-form video URL
 */
export async function checkClipboardForVideo(): Promise<UrlDetectionResult | null> {
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return null
    }

    const text = await navigator.clipboard.readText()
    if (!text || text.length > 500) { // Reasonable URL length limit
      return null
    }

    const result = detectShortFormVideo(text)
    return result.isShortFormVideo ? result : null

  } catch (error) {
    // Clipboard access might be denied
    console.debug('Could not access clipboard:', error)
    return null
  }
}

/**
 * Formats platform info for display
 */
export function formatPlatformDisplay(platform: ShortFormPlatform): string {
  const info = FRONTEND_PLATFORM_CONFIGS[platform]
  return `${info.icon} ${info.displayName}`
}

/**
 * Gets suggested actions based on detection result
 */
export function getSuggestedActions(result: UrlDetectionResult): Array<{
  action: 'process' | 'manual' | 'invalid'
  label: string
  description: string
}> {
  if (!result.isValid) {
    return [{
      action: 'invalid',
      label: 'Check URL',
      description: 'Please verify the URL format and try again'
    }]
  }

  if (result.isShortFormVideo && result.platform) {
    const platformInfo = result.platformInfo!
    return [
      {
        action: 'process',
        label: `Process ${platformInfo.displayName} Video`,
        description: `Automatically extract metadata${platformInfo.supportedFeatures.transcript ? ' and transcript' : ''}`
      },
      {
        action: 'manual',
        label: 'Create Manually',
        description: 'Add video details yourself with this URL'
      }
    ]
  }

  return [{
    action: 'manual',
    label: 'Create Video Resource',
    description: 'This platform is not supported for automatic processing, but you can create a video resource manually'
  }]
}

/**
 * Validates URL for specific platform requirements
 */
export function validatePlatformUrl(url: string, expectedPlatform: ShortFormPlatform): boolean {
  const result = detectShortFormVideo(url)
  return result.platform === expectedPlatform
}

/**
 * Hook for URL change detection (React-friendly)
 */
export function useUrlDetection(url: string) {
  const result = detectShortFormVideo(url)
  const suggestions = getSuggestedActions(result)

  return {
    ...result,
    suggestions,
    displayText: result.platform ? formatPlatformDisplay(result.platform) : null
  }
}



