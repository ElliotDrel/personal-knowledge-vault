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
  resolvedAt?: string;
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
