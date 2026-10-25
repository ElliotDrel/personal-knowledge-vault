/**
 * AI Configuration for Edge Function
 *
 * ⚠️ UPDATE: This is now the SOURCE OF TRUTH ⚠️
 * ==========================================
 * The frontend config files (src/config/aiConfig.ts and aiMetadataConfig.ts) 
 * have been removed. This edge function config is now the primary configuration.
 *
 * EDIT THIS FILE DIRECTLY when making configuration changes.
 *
 * FUTURE: Consider moving to database-backed config for easier updates
 */

import type { Resource } from './types.ts';

// ============================================================================
// AI Configuration Constants
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
   * Defines AI role, task, constraints, rules, and JSON schema
   */
  SYSTEM_PROMPT: `# Goal:
Generate high-value, impactful, actionable suggestions to improve educational notes.

# Comment Rules:

## Category Types:
- selected_text: Anchored to passage (exact quoted text, min 5 chars)
- general: Broad observation not tied to specific text

## Suggestion Types:
- missing_concept: Key topics from source material not in notes (use selected_text if anchoring to where it should be added, or general if broadly applicable)
- rewording: Clearer phrasing for existing text (must use selected_text category and quote the exact text from {USER_NOTES} to be reworded)
- factual_correction: Inaccuracies vs source material (must use selected_text category and quote the exact inaccurate text from {USER_NOTES})
- structural_suggestion: Better organization or removing duplicate/redundant information from notes (use selected_text if pointing to specific section from {USER_NOTES}, or general for overall structure)

# Provided Content:
- {USER_NOTES}: The user's current notes text that you are improving.
- {RESOURCE_METADATA}: The metadata of the resource that the user is improving notes for, this is your source of truth for the content of the resource, and what you are basing your suggestions on.
- {EXISTING_AI_SUGGESTIONS}: The existing AI suggestions that have already been created for the user's notes. These are provided to help you avoid creating duplicate and repetitive suggestions.

## When No New Suggestions Exist:
- Compare each potential comment against {EXISTING_AI_SUGGESTIONS} by selected text and intent.
- If every idea overlaps, respond exactly with \`{"comments": [], "no_comments_message": "No new suggestions to add."}\`.
- Never restate or rephrase an existing suggestion just to fill the output.

## Output Requirements:
- Return EXACTLY one valid JSON object matching the schema.
- Do NOT include markdown fences, explanations, reasoning, or any text before or after the JSON.
- If no new suggestions exist, the entire response must be \`{"comments": [], "no_comments_message": "No new suggestions to add."}\` with nothing else.


# Critical Guidelines:
- If no genuinely new improvement exists, respond EXACTLY with \`{"comments": [], "no_comments_message": "No new suggestions to add."}\` and nothing else.
- Avoid duplicates: If existing AI suggestions already cover a topic or text segment, avoid creating another suggestion about it or something similar (same text with different wording, same missing concept, or same correction). When in doubt, skip it. Quality over quantity.
- Duplicate checks before adding a comment:
  - Same selected text already covered? Skip it.
  - Same missing concept, correction, or rewording intent? Skip it.
  - Unsure whether it's new? Skip it and return \`{"comments": [], "no_comments_message": "No new suggestions to add."}\`.
- For selected-text: Copy text EXACTLY from {USER_NOTES} only (character-for-character). NEVER quote from {RESOURCE_METADATA}.
- Keep suggestions under 200 characters
- Focus on: missing key concepts, unclear phrasing, factual errors, structure

# JSON Schema and Output Format:

Analyze the user notes and provide improvement suggestions as JSON comments.
Return a JSON object with this exact structure:

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

## Schema Rules:
- "selectedText" is required (non-null) if category is "selected_text"
- "selectedText" must be null if category is "general"
- "selectedText" MUST be copied exactly from {USER_NOTES}, never from {RESOURCE_METADATA}
- "body" must be under 200 characters
- "selectedText" must be minimum 5 characters if provided
- "no_comments_message" is optional; include it ONLY when the comments array is empty, and set it to the exact string "No new suggestions to add."
- If a suggestion would duplicate an existing comment, omit it and prefer returning \`{"comments": [], "no_comments_message": "No new suggestions to add."}\`.
- The response must contain only the JSON object (no surrounding text, markdown, or explanations).
- Return \`{"comments": [], "no_comments_message": "No new suggestions to add."}\` if no suggestions needed`,
} as const;

// ============================================================================
// Metadata Configuration
// ============================================================================

export const AI_METADATA_CONFIG: Record<string, string[]> = {
  'short-video': [
    'description',
    'transcript',
    'author',
    'creator',
    'channelName',
  ],
  video: [
    'description',
    'transcript',
    'author',
    'creator',
    'channelName',
  ],
  book: [
    'description',
    'author',
    'url',
  ],
  article: [
    'description',
    'author',
    'url',
  ],
  podcast: [
    'description',
    'author',
    'url',
  ],
} as const;

/**
 * Extract AI-relevant metadata from a resource
 */
export function getAIMetadataForResource(resource: Resource | Record<string, unknown>): Record<string, unknown> {
  const type = (resource as Resource).type as string;
  const fields = AI_METADATA_CONFIG[type] || [];

  const metadata: Record<string, unknown> = {};
  const source = resource as Record<string, unknown>;

  for (const field of fields) {
    const value = source[field];
    if (value !== null && value !== undefined && value !== '') {
      metadata[field] = value;
    }
  }

  return metadata;
}
