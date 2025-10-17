/**
 * AI Configuration
 * Centralized settings for AI Notes Check feature
 *
 * This file contains all AI-related configuration including model settings,
 * limits, prompts, and type definitions. Single source of truth for AI behavior.
 */

// ============================================================================
// Model & Processing Configuration
// ============================================================================

export const AI_CONFIG = {
  /**
   * AI Model to use for notes analysis
   * Claude 3.5 Haiku: Fast, cost-effective, suitable for frequent use
   */
  MODEL: 'anthropic/claude-3-5-haiku-20241022' as const,

  /**
   * Comment constraints
   */
  MAX_COMMENT_LENGTH: 200, // Keep suggestions concise and actionable
  MIN_SELECTED_TEXT_LENGTH: 5, // Minimum characters for text anchoring (prevents ambiguous matches)
  MAX_RETRY_ATTEMPTS: 3, // Maximum retry attempts for text matching failures

  /**
   * Processing limits
   */
  MAX_COMMENTS_PER_RUN: 20, // Prevent excessive API costs and overwhelming suggestions

  /**
   * System Prompt
   * Defines AI role, task, constraints, and rules
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
- general: Broad observations not tied to specific text (e.g., overall structure, missing summary)
- selected_text: Anchored to specific passage (must provide exact quoted text)

OUTPUT FORMAT: Return valid JSON only (no markdown, no explanations).`,

  /**
   * JSON Schema Instructions
   * Specifies exact structure AI must return
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
// TypeScript Types for AI Responses
// ============================================================================

/**
 * Single AI comment suggestion
 */
export interface AICommentSuggestion {
  category: 'general' | 'selected_text';
  suggestionType: 'missing_concept' | 'rewording' | 'factual_correction' | 'structural_suggestion';
  body: string; // Max 200 characters
  selectedText: string | null; // Required if category='selected_text', null otherwise
}

/**
 * Complete AI response containing all suggestions
 */
export interface AICommentsResponse {
  comments: AICommentSuggestion[];
}

/**
 * Validation helper: Check if suggestion is valid
 */
export function isValidAISuggestion(suggestion: unknown): suggestion is AICommentSuggestion {
  if (typeof suggestion !== 'object' || suggestion === null) return false;

  const s = suggestion as Record<string, unknown>;

  // Check required fields
  if (typeof s.category !== 'string' || typeof s.suggestionType !== 'string' || typeof s.body !== 'string') {
    return false;
  }

  // Check enum values
  if (!['general', 'selected_text'].includes(s.category)) return false;
  if (!['missing_concept', 'rewording', 'factual_correction', 'structural_suggestion'].includes(s.suggestionType)) {
    return false;
  }

  // Check selectedText requirements
  if (s.category === 'selected_text') {
    if (typeof s.selectedText !== 'string' || s.selectedText.length < AI_CONFIG.MIN_SELECTED_TEXT_LENGTH) {
      return false;
    }
  } else {
    if (s.selectedText !== null) return false;
  }

  // Check body length
  if (s.body.length > AI_CONFIG.MAX_COMMENT_LENGTH) return false;

  return true;
}

/**
 * Validation helper: Check if response is valid
 */
export function isValidAIResponse(response: unknown): response is AICommentsResponse {
  if (typeof response !== 'object' || response === null) return false;

  const r = response as Record<string, unknown>;

  if (!Array.isArray(r.comments)) return false;

  return r.comments.every(isValidAISuggestion);
}
