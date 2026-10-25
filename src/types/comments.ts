/**
 * Comment Types & Interfaces
 *
 * Defines the data structures for the notes commenting system.
 * Supports two comment types:
 * - selected-text: Anchored to specific text ranges
 * - general: Standalone annotations
 */

export type CommentType = 'selected-text' | 'general';
export type CommentStatus = 'active' | 'resolved';

/**
 * Base comment structure (matches database schema)
 */
export interface Comment {
  id: string;
  resourceId: string;
  userId: string;
  commentType: CommentType;
  status: CommentStatus;
  body: string;

  // Selected-text fields (required when commentType === 'selected-text')
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  isStale?: boolean;
  originalQuotedText?: string;

  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string;
  resolvedAt?: string;

  // Threading metadata (null when comment is a root)
  threadRootId?: string | null;
  threadPrevCommentId?: string | null;

  // AI-specific fields (present when created_by_ai is true)
  createdByAi?: boolean;
  aiCommentCategory?: 'general' | 'selected_text' | null;
  aiSuggestionType?: 'missing_concept' | 'rewording' | 'factual_correction' | 'structural_suggestion' | null;
  aiProcessingLogId?: string | null;
  retryCount?: number;
}

/**
 * Comment with replies pre-loaded (for UI rendering)
 */
export interface CommentWithReplies extends Comment {
  replies: Comment[];
}

/**
 * Input for creating new comments
 */
export interface CreateCommentInput {
  resourceId: string;
  commentType: CommentType;
  body: string;
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  threadRootId?: string;
  threadPrevCommentId?: string;
}

/**
 * Input for updating existing comments
 */
export interface UpdateCommentInput {
  body?: string;
  quotedText?: string;
  isStale?: boolean;
  originalQuotedText?: string;
  status?: CommentStatus;
  resolvedAt?: string | null; // null to clear resolved timestamp
}

/**
 * UI state for active comment highlighting
 */
export interface ActiveCommentState {
  commentId: string | null;
  highlightDarker: boolean;
}

/**
 * Type guard: Check if comment is selected-text type
 */
export function isSelectedTextComment(comment: Comment): boolean {
  return (
    comment.commentType === 'selected-text' &&
    comment.startOffset !== undefined &&
    comment.endOffset !== undefined &&
    comment.quotedText !== undefined
  );
}

/**
 * Type guard: Check if comment is active (not resolved)
 */
export function isActiveComment(comment: Comment): boolean {
  return comment.status === 'active';
}

/**
 * Determine if a comment is a reply within a thread
 */
export function isReply(comment: Comment): boolean {
  return Boolean(comment.threadRootId);
}

/**
 * Type guard: Check if comment was created by AI
 */
export function isAIComment(comment: Comment): boolean {
  return Boolean(comment.createdByAi);
}

/**
 * AI Processing Log
 */
export interface AIProcessingLog {
  id: string;
  parentLogId?: string | null;
  userId: string;
  resourceId: string | null;
  actionType: string;
  attemptNumber: number;
  status: 'processing' | 'completed' | 'failed' | 'partial_success';
  modelUsed: string;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  errorDetails?: Record<string, unknown> | null;
  processingTimeMs?: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from AI Notes Check Edge Function
 */
export interface AINotesCheckResponse {
  success: boolean;
  commentsCreated?: number;
  commentsFailed?: number;
  noCommentsMessage?: string | null;
  processingLogId?: string;
  error?: {
    code: string;
    message: string;
  };
}
