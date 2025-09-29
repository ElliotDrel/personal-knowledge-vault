import { EdgeFunctionConfig, PlatformExtractionResult } from '../types.ts'
import { logInfo } from '../utils/logging.ts'

/**
 * TikTok metadata extraction placeholder with user guidance.
 * Real implementation will require OAuth 2.0 app approval.
 */
export async function extractTikTokMetadata(
  url: string,
  _config: EdgeFunctionConfig
): Promise<PlatformExtractionResult> {
  logInfo('TikTok extraction attempted', { url })

  return {
    success: false,
    error: {
      code: 'api_error',
      message: 'TikTok content extraction not available',
      details: 'TikTok requires app approval for API access. Please create this resource manually or contact support for API setup assistance.'
    }
  }
}
