/**
 * URL utilities for short-form video processing
 * Handles URL validation, normalization, and platform detection
 */

import { ShortFormPlatform, PLATFORM_CONFIGS } from '../types.ts'
import { logInfo, logWarn } from './logging.ts'

/**
 * Validates if a URL is in a valid format
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Normalizes a URL to a canonical form for deduplication
 * Handles redirects, mobile URLs, and tracking parameters
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
    logWarn('Failed to normalize URL, returning original', { url, error: error.message })
    return url
  }
}

/**
 * Normalizes YouTube URLs to a standard format
 */
function normalizeYouTubeUrl(parsed: URL): string {
  const originalHost = parsed.hostname.toLowerCase()

  // Handle youtu.be short URLs
  if (originalHost === 'youtu.be') {
    const videoId = parsed.pathname.substring(1) // Remove leading slash
    return `https://youtube.com/watch?v=${videoId}`
  }

  parsed.hostname = 'youtube.com'

  // Handle /shorts/ URLs
  if (parsed.pathname.startsWith('/shorts/')) {
    const videoId = parsed.pathname.split('/shorts/')[1].split('?')[0]
    parsed.pathname = '/watch'
    parsed.searchParams.set('v', videoId)
  }

  // Keep only essential parameters
  const videoId = parsed.searchParams.get('v')
  if (videoId) {
    parsed.search = `?v=${videoId}`
  }

  return parsed.toString()
}

/**
 * Normalizes TikTok URLs to a standard format
 */
function normalizeTikTokUrl(parsed: URL): string {
  const originalHost = parsed.hostname.toLowerCase()

  // Handle vm.tiktok.com short URLs by preserving the original host
  if (originalHost === 'vm.tiktok.com') {
    parsed.hostname = 'vm.tiktok.com'
    parsed.search = ''
    parsed.hash = ''
    logInfo('TikTok short URL detected', { url: parsed.toString() })
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
    const url = new URL(normalizedUrl)

    for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
      for (const pattern of config.urlPatterns) {
        if (pattern.test(normalizedUrl)) {
          logInfo('Platform detected', { platform, url: normalizedUrl })
          return platform as ShortFormPlatform
        }
      }
    }

    logWarn('No platform detected for URL', { url: normalizedUrl })
    return null

  } catch (error) {
    logWarn('Error detecting platform', { url: normalizedUrl, error: error.message })
    return null
  }
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
    logWarn('Error extracting video ID', { url, platform, error: error.message })
    return null
  }
}

/**
 * Checks if a URL looks like a short-form video based on patterns
 */
export function isShortFormVideo(url: string): boolean {
  const normalizedUrl = normalizeUrl(url)
  return detectPlatform(normalizedUrl) !== null
}

/**
 * Gets display information for a detected platform
 */
export function getPlatformInfo(platform: ShortFormPlatform) {
  return PLATFORM_CONFIGS[platform] || null
}

/**
 * Validates that a URL belongs to the expected platform
 */
export function validatePlatformUrl(url: string, expectedPlatform: ShortFormPlatform): boolean {
  const detectedPlatform = detectPlatform(normalizeUrl(url))
  return detectedPlatform === expectedPlatform
}

/**
 * Resolves short URLs by following redirects (placeholder for future implementation)
 */
export async function resolveShortUrl(url: string): Promise<string> {
  // TODO: Implement actual redirect following for short URLs like vm.tiktok.com
  // For now, return the original URL
  return url
}

/**
 * Checks if URL is accessible (not private, deleted, etc.)
 */
export async function checkUrlAccessibility(url: string): Promise<{
  accessible: boolean
  status: 'public' | 'private' | 'not_found' | 'error'
  message?: string
}> {
  try {
    // Simple HEAD request to check if URL is accessible
    const response = await fetch(url, { method: 'HEAD' })

    if (response.ok) {
      return { accessible: true, status: 'public' }
    } else if (response.status === 404) {
      return { accessible: false, status: 'not_found', message: 'Content not found' }
    } else if (response.status === 403 || response.status === 401) {
      return { accessible: false, status: 'private', message: 'Content is private or requires authentication' }
    } else {
      return { accessible: false, status: 'error', message: `HTTP ${response.status}` }
    }
  } catch (error) {
    return {
      accessible: false,
      status: 'error',
      message: `Network error: ${error.message}`
    }
  }
}

