import { EdgeFunctionConfig, PlatformExtractionResult } from '../types.ts'
import { logInfo } from '../utils/logging.ts'

/**
 * Instagram metadata extraction placeholder with user guidance.
 * Real implementation will require Facebook app approval.
 */
export async function extractInstagramMetadata(
  url: string,
  _config: EdgeFunctionConfig
): Promise<PlatformExtractionResult> {
  logInfo('Instagram extraction attempted', { url })

  return {
    success: false,
    error: {
      code: 'api_error',
      message: 'Instagram content extraction not available',
      details: 'Instagram requires Facebook app approval and access tokens for content access. Please create this resource manually or contact support for API setup assistance.'
    }
  }
}
