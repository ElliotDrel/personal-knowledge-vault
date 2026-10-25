/**
 * Type definitions for AI Notes Check Edge Function
 */

// ============================================================================
// Request/Response Types
// ============================================================================

export interface AINotesCheckRequest {
  resourceId: string;
}

export interface AINotesCheckResponse {
  success: boolean;
  commentsCreated?: number;
  commentsFailed?: number;
  processingLogId?: string;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// User Authentication
// ============================================================================

export interface User {
  id: string;
  email?: string;
  aud: string;
  role?: string;
}

// ============================================================================
// Database Types
// ============================================================================

export interface Resource {
  id: string;
  user_id: string;
  type: 'book' | 'video' | 'podcast' | 'article' | 'short-video';
  title: string;
  description: string;
  notes: string;
  transcript: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  resource_id: string;
  user_id: string;
  comment_type: 'selected-text' | 'general';
  status: 'active' | 'resolved';
  body: string;
  start_offset?: number | null;
  end_offset?: number | null;
  quoted_text?: string | null;
  is_stale?: boolean | null;
  original_quoted_text?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  thread_root_id?: string | null;
  thread_prev_comment_id?: string | null;
  created_by_ai: boolean;
  ai_comment_category?: string | null;
  ai_suggestion_type?: string | null;
  ai_processing_log_id?: string | null;
  retry_count: number;
}

export interface AIProcessingLog {
  id?: string;
  parent_log_id?: string | null;
  user_id: string;
  resource_id: string | null;
  action_type: string;
  attempt_number: number;
  status: 'processing' | 'completed' | 'failed' | 'partial_success';
  model_used: string;
  input_data?: Record<string, unknown> | null;
  output_data?: Record<string, unknown> | null;
  error_details?: Record<string, unknown> | null;
  processing_time_ms?: number | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// AI Response Types
// ============================================================================

export interface AICommentSuggestion {
  category: 'general' | 'selected_text';
  suggestionType: 'missing_concept' | 'rewording' | 'factual_correction' | 'structural_suggestion';
  body: string;
  selectedText: string | null;
}

export interface AICommentsResponse {
  comments: AICommentSuggestion[];
}

// ============================================================================
// Anthropic API Types
// ============================================================================

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
  temperature: number;
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
