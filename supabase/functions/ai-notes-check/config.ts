/**
 * AI Configuration for Edge Function
 *
 * Note: This is duplicated from src/config/aiConfig.ts because Edge Functions
 * cannot import from the src directory. Keep in sync with frontend config.
 */

// ============================================================================
// AI Configuration Constants
// ============================================================================

export const AI_CONFIG = {
  /**
   * AI Model to use for notes analysis
   */
  MODEL: 'claude-4-5-haiku-20241022' as const,

  /**
   * Comment constraints
   */
  MAX_COMMENT_LENGTH: 200,
  MIN_SELECTED_TEXT_LENGTH: 5,
  MAX_RETRY_ATTEMPTS: 3,

  /**
   * Processing limits
   */
  MAX_COMMENTS_PER_RUN: 20,

  /**
   * System Prompt
   */
  SYSTEM_PROMPT: `You are an AI assistant helping users improve their notes on educational content (videos, books, articles).

Your task: Analyze user notes and metadata, then suggest improvements as comments.

CRITICAL RULES:
1. For selected-text comments: Provide EXACT character-for-character text from notes
   - If text appears multiple times, expand selection to make it unique
   - Minimum 5 characters for selected text
   - Copy text EXACTLY, including punctuation and spacing
2. Keep ALL suggestions under 200 characters (concise, actionable)
3. Do NOT duplicate suggestions already provided by AI
4. Maximum 20 suggestions per run
5. Focus on substance: missing concepts, clarity issues, factual accuracy, organization

SUGGESTION TYPES:
- missing_concept: Important topics from source material not captured in notes
- rewording: Suggest clearer, more precise phrasing for existing text
- factual_correction: Flag potential inaccuracies compared to source material
- structural_suggestion: Recommend better organization or formatting

CATEGORY TYPES:
- general: Broad observations not tied to specific text
- selected_text: Anchored to specific passage (must provide exact quoted text)

OUTPUT FORMAT: Return valid JSON only (no markdown, no explanations).`,

  /**
   * JSON Schema Instructions
   */
  JSON_SCHEMA_INSTRUCTIONS: `Return a JSON object with this exact structure:

{
  "comments": [
    {
      "category": "general" | "selected_text",
      "suggestionType": "missing_concept" | "rewording" | "factual_correction" | "structural_suggestion",
      "body": "Your suggestion (max 200 chars)",
      "selectedText": "exact text from notes" | null
    }
  ]
}

RULES:
- "selectedText" is required (non-null) if category is "selected_text"
- "selectedText" must be null if category is "general"
- "body" must be under 200 characters
- "selectedText" must be minimum 5 characters if provided
- Return empty array if no suggestions needed`,
} as const;

// ============================================================================
// Metadata Configuration
// ============================================================================

export const AI_METADATA_CONFIG: Record<string, string[]> = {
  'short-video': ['author', 'creator', 'channelName', 'handle', 'description', 'transcript', 'platform'],
  'video': ['title', 'description', 'transcript', 'author', 'creator', 'platform', 'duration'],
  'book': ['title', 'description', 'author', 'year'],
  'article': ['title', 'url', 'author', 'platform'],
  'podcast': ['title', 'description', 'transcript', 'creator', 'platform', 'duration'],
} as const;

/**
 * Extract AI-relevant metadata from a resource
 */
export function getAIMetadataForResource(resource: Record<string, unknown>): Record<string, unknown> {
  const type = resource.type as string;
  const fields = AI_METADATA_CONFIG[type] || [];

  const metadata: Record<string, unknown> = {};

  for (const field of fields) {
    const value = resource[field];
    if (value !== null && value !== undefined && value !== '') {
      metadata[field] = value;
    }
  }

  return metadata;
}
