/**
 * React hook for managing comment text tracking state
 * Handles debounced database updates and real-time offset calculations
 */

import { useCallback, useEffect } from 'react';
import { useDebouncedCallback, type DebouncedState } from 'use-debounce';
import type { Comment, CommentWithReplies } from '@/types/comments';
import { updateCommentsForTextChange } from '@/utils/commentTextTracking';
import { useStorageAdapter } from '@/data/storageAdapter';

interface UseCommentTextTrackingOptions {
  enabled: boolean;
  debounceMs?: number; // Default: 2000ms (2 seconds)
}

/**
 * Hook to manage comment text tracking for a notes editor
 *
 * Usage:
 * const { handleTextChange } = useCommentTextTracking({
 *   enabled: true,
 * });
 *
 * // In editor onChange:
 * handleTextChange(oldValue, newValue, localComments, setLocalComments);
 */
export function useCommentTextTracking(options: UseCommentTextTrackingOptions) {
  const { enabled, debounceMs = 2000 } = options;
  const storageAdapter = useStorageAdapter();

  /**
   * Debounced function to persist comment updates to database
   */
  const persistCommentUpdates: DebouncedState<(changedComments: Comment[]) => Promise<void>> =
    useDebouncedCallback(
      async (changedComments: Comment[]) => {
        if (!enabled || changedComments.length === 0) return;

        await Promise.all(
          changedComments.map(async (comment) => {
            if (comment.commentType !== 'selected-text') return;
            try {
              await storageAdapter.updateComment(comment.id, {
                quotedText: comment.quotedText,
                isStale: comment.isStale,
                originalQuotedText: comment.originalQuotedText,
              });
            } catch (error) {
              console.error('[useCommentTextTracking] Error updating comment:', error);
              // Continue with other updates
            }
          })
        );
      },
      debounceMs
    );

  useEffect(() => {
    return () => {
      const maybePromise = persistCommentUpdates.flush();
      if (maybePromise) {
        // Fire and forget in cleanup but surface unexpected errors
        maybePromise.catch((error) => {
          console.error('[useCommentTextTracking] Flush error during cleanup:', error);
        });
      }
    };
  }, [persistCommentUpdates]);

  const flushPendingUpdates = useCallback(async () => {
    const maybePromise = persistCommentUpdates.flush();
    if (maybePromise) {
      await maybePromise;
    }
  }, [persistCommentUpdates]);

  /**
   * Handle text changes and update comment offsets + stale status
   *
   * @param oldText - Previous text content
   * @param newText - New text content
   * @param comments - Current comments array
   * @param setComments - State setter for comments
   */
  const handleTextChange = useCallback(
    (
      oldText: string,
      newText: string,
      comments: CommentWithReplies[],
      setComments: (comments: CommentWithReplies[]) => void
    ) => {
      if (!enabled) return;
      if (oldText === newText) return; // No change

      // Update offsets and check stale status (pure function, fast)
      const updatedComments = updateCommentsForTextChange(
        comments,
        oldText,
        newText
      );

      const originalById = new Map(comments.map((original) => [original.id, original]));
      const changed = updatedComments.filter((updated) => {
        if (updated.commentType !== 'selected-text') return false;
        const original = originalById.get(updated.id);
        if (!original) return true;

        const quotedChanged = updated.quotedText !== original.quotedText;
        const staleChanged = Boolean(updated.isStale) !== Boolean(original.isStale);
        const originalQuotedChanged =
          updated.originalQuotedText !== original.originalQuotedText;

        return quotedChanged || staleChanged || originalQuotedChanged;
      });

      // Update local state immediately (optimistic UI)
      setComments(updatedComments as CommentWithReplies[]);

      // Persist to database (debounced)
      persistCommentUpdates(changed);
    },
    [enabled, persistCommentUpdates]
  );

  return {
    handleTextChange,
    flushPendingUpdates,
  };
}
