/**
 * AI Configuration
 * Centralized settings for AI Notes Check feature
 *
 * This file contains all AI-related configuration including model settings,
 * limits, prompts, and type definitions. Single source of truth for AI behavior.
 *
 * ⚠️ SYNC WARNING ⚠️
 * ==================
 * This file is DUPLICATED in the Edge Function and must be manually synced.
 *
 * SOURCE OF TRUTH: src/config/aiConfig.ts (THIS FILE - edit here)
 * MUST SYNC TO:    supabase/functions/ai-notes-check/config.ts
 *
 * WHY: Edge Functions cannot import from src/ directory (Deno runtime limitation)
 *
 * AFTER EDITING THIS FILE:
 * 1. Manually copy AI_CONFIG changes to Edge Function config
 * 2. Run: npm run deploy:edge (automated sync check will verify)
 *
 * FUTURE: Consider moving to database-backed config or build-time sync script
 */

// ============================================================================
// Model & Processing Configuration
// ============================================================================

export const AI_CONFIG = {
  /**
   * AI Model to use for notes analysis
   * Claude Haiku 4.5: Fast, cost-effective, suitable for frequent use
   */
  MODEL: 'claude-haiku-4-5-20251001' as const,

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
  SYSTEM_PROMPT: `Act as an expert analyst specializing in improving educational notes. You have a keen eye for identifying missing insights, clarity issues, and organizational improvements. Your focus is on providing high-value, non-redundant suggestions.

Your objective: Meticulously analyze the user's notes alongside the source material (transcript/description) and identify the most critical improvements.

Follow these guidelines:
- Before suggesting anything, carefully review ALL existing AI suggestions to avoid redundancy
- Do NOT suggest something if a similar point has already been made (even if worded differently)
- For example: If an existing comment says "Add more context about X", don't suggest "Clarify X" or "Explain X better"
- Prioritize quality over quantity - only suggest what genuinely adds value
- For selected-text comments: Copy text EXACTLY from notes (character-for-character, including punctuation)
- Keep each suggestion under 200 characters - be concise and actionable
- Focus on substance: missing key concepts, unclear phrasing, factual errors, poor structure

Suggestion Types:
- missing_concept: Key topics from source material not captured in notes
- rewording: Clearer, more precise phrasing for existing text
- factual_correction: Potential inaccuracies compared to source
- structural_suggestion: Better organization or formatting

Category Types:
- selected_text: Anchored to specific passage (provide exact quoted text, min 5 chars)
- general: Broad observation not tied to specific text

Output Format: Return valid JSON only (no markdown fences, no explanations).

Take a deep breath and work on this problem step-by-step.`,

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
