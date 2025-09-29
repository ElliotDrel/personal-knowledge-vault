/**
 * React hook for URL detection and clipboard monitoring
 * Provides real-time URL analysis and user guidance
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  detectShortFormVideo,
  getSuggestedActions,
  formatPlatformDisplay,
  type UrlDetectionResult
} from '@/utils/urlDetection'

export interface UseUrlDetectionOptions {
  /**
   * Debounce delay for URL input changes (in ms)
   */
  debounceMs?: number

  /**
   * Callback when a short-form video URL is detected
   */
  onVideoDetected?: (result: UrlDetectionResult) => void

  /**
   * Callback when URL becomes invalid
   */
  onInvalidUrl?: (url: string, error: string) => void
}

export interface UseUrlDetectionReturn {
  // Current detection state
  result: UrlDetectionResult | null
  isDetecting: boolean
  hasError: boolean

  // URL management
  url: string
  setUrl: (url: string) => void
  clearUrl: () => void

  // Computed values
  isShortFormVideo: boolean
  platform: string | null
  platformDisplay: string | null
  suggestions: Array<{
    action: 'process' | 'manual' | 'invalid'
    label: string
    description: string
  }>

  // UI helpers
  getStatusMessage: () => string
  getStatusColor: () => 'success' | 'warning' | 'error' | 'neutral'
  shouldShowProcessButton: boolean
  shouldShowManualButton: boolean
}

/**
 * Hook for URL detection with real-time analysis
 */
export function useUrlDetection(
  initialUrl: string = '',
  options: UseUrlDetectionOptions = {}
): UseUrlDetectionReturn {
  const {
    debounceMs = 300,
    onVideoDetected,
    onInvalidUrl
  } = options

  // State
  const [url, setUrlState] = useState(initialUrl)
  const [result, setResult] = useState<UrlDetectionResult | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check clipboard access on mount
  // Debounced URL detection
  const analyzeUrl = useCallback(async (urlToAnalyze: string) => {
    if (!urlToAnalyze.trim()) {
      setResult(null)
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)

    try {
      // Small delay to simulate processing for UX
      await new Promise(resolve => setTimeout(resolve, 100))

      const detectionResult = detectShortFormVideo(urlToAnalyze)
      setResult(detectionResult)

      // Trigger callbacks
      if (detectionResult.isShortFormVideo && onVideoDetected) {
        onVideoDetected(detectionResult)
      } else if (!detectionResult.isValid && onInvalidUrl) {
        onInvalidUrl(urlToAnalyze, detectionResult.errorMessage || 'Invalid URL')
      }

    } catch (error) {
      console.error('Error analyzing URL:', error)
      setResult({
        isShortFormVideo: false,
        platform: null,
        normalizedUrl: urlToAnalyze,
        originalUrl: urlToAnalyze,
        isValid: false,
        platformInfo: null,
        errorMessage: 'Analysis failed'
      })
    } finally {
      setIsDetecting(false)
    }
  }, [onVideoDetected, onInvalidUrl])

  // Handle URL changes with debouncing
  const setUrl = useCallback((newUrl: string) => {
    setUrlState(newUrl)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      void analyzeUrl(newUrl)
    }, debounceMs)
  }, [analyzeUrl, debounceMs])

  useEffect(() => {
    if (initialUrl.trim()) {
      setUrl(initialUrl)
    }
  }, [initialUrl, setUrl])

  // Clear URL and reset state
  const clearUrl = useCallback(() => {
    setUrlState('')
    setResult(null)
    setIsDetecting(false)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [])

  // Computed values
  const suggestions = useMemo(() => {
    return result ? getSuggestedActions(result) : []
  }, [result])

  const platformDisplay = useMemo(() => {
    return result?.platform ? formatPlatformDisplay(result.platform) : null
  }, [result])

  const hasError = result?.isValid === false

  // UI helper functions
  const getStatusMessage = useCallback((): string => {
    if (isDetecting) {
      return 'Analyzing URL...'
    }

    if (!result && !url.trim()) {
      return 'Enter a video URL to get started'
    }

    if (!result || !url.trim()) {
      return ''
    }

    if (!result.isValid) {
      return result.errorMessage || 'Invalid URL'
    }

    if (result.isShortFormVideo) {
      const features = result.platformInfo?.supportedFeatures
      const featureList = []
      if (features?.metadata) featureList.push('metadata')
      if (features?.transcript) featureList.push('transcript')
      if (features?.thumbnails) featureList.push('thumbnails')

      return `${platformDisplay} video detected. We can extract ${featureList.join(', ')}.`
    }

    return 'This platform is not supported for automatic processing'
  }, [isDetecting, result, url, platformDisplay])

  const getStatusColor = useCallback((): 'success' | 'warning' | 'error' | 'neutral' => {
    if (isDetecting) return 'neutral'
    if (!result || !url.trim()) return 'neutral'
    if (!result.isValid) return 'error'
    if (result.isShortFormVideo) return 'success'
    return 'warning'
  }, [isDetecting, result, url])

  const shouldShowProcessButton = useMemo(() => {
    return result?.isShortFormVideo === true && result.platform !== null
  }, [result])

  const shouldShowManualButton = useMemo(() => {
    return result?.isValid === true
  }, [result])

  return {
    // Detection state
    result,
    isDetecting,
    hasError,

    // URL management
    url,
    setUrl,
    clearUrl,

    // Computed values
    isShortFormVideo: result?.isShortFormVideo || false,
    platform: result?.platform || null,
    platformDisplay,
    suggestions,

    // UI helpers
    getStatusMessage,
    getStatusColor,
    shouldShowProcessButton,
    shouldShowManualButton
  }
}

/**
 * Simplified hook for basic URL validation
 */
export function useUrlValidation(url: string) {
  const result = useMemo(() => detectShortFormVideo(url), [url])

  return {
    isValid: result.isValid,
    isShortFormVideo: result.isShortFormVideo,
    platform: result.platform,
    errorMessage: result.errorMessage,
    normalizedUrl: result.normalizedUrl
  }
}








