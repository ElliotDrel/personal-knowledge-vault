/**
 * NotesEditorDialog Component
 *
 * A modal dialog for editing notes with WYSIWYG editing and markdown storage.
 * Features:
 * - WYSIWYG editing area with rich text formatting toolbar
 * - Comment system integration (create, reply, resolve)
 * - AI Notes Check tool for automated suggestions
 * - Silent auto-save with 1-second debounce and exponential retry
 * - Critical trigger flushes (AI check, dialog close, manual save)
 * - Unsaved changes protection with confirmation dialog
 * - Markdown storage format for AI compatibility
 *
 * Note: Inline comment highlights during editing will be added in Phase 3
 * with ProseMirror decorations. Currently, comments are managed via sidebar.
 *
 * @component
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WYSIWYGEditor } from '@/components/ui/wysiwyg-editor';
import { Save, Loader2, X, AlertCircle } from 'lucide-react';
import { stripMarkdown } from '@/utils/stripMarkdown';

// Comment system imports
import type { CommentWithReplies } from '@/types/comments';
import { useStorageAdapter } from '@/data/storageAdapter';
import { useCommentTextTracking } from '@/hooks/use-comment-text-tracking';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useNavigationBlocker } from '@/hooks/useNavigationBlocker';
import { useUnloadProtection } from '@/hooks/useUnloadProtection';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { CommentSidebar } from '@/components/comments/CommentSidebar';
import { ResolvedCommentsModal } from '@/components/comments/ResolvedCommentsModal';

interface NotesEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;

  /** Resource ID for loading and managing comments */
  resourceId: string;

  /** Optional callback when comment count changes (for UI badges) */
  onCommentCountChange?: (count: number) => void;
}

const NOTE_AUTO_SAVE_INTERVAL_MS = 60_000;

export function NotesEditorDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  isLoading = false,
  onDirtyChange,
  resourceId,
  onCommentCountChange,
}: NotesEditorDialogProps) {
  // Internal editing state
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isClosePending, setIsClosePending] = useState(false);
  const [blockingError, setBlockingError] = useState<{ title: string; message: string } | null>(null);
  const [isPreparingComment, setIsPreparingComment] = useState(false);

  // Comment system state
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [selectionRange, setSelectionRange] = useState<
    { start: number; end: number; text: string } | null
  >(null);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // AI Notes Check state
  const [aiCheckState, setAiCheckState] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');

  // Hooks
  const storageAdapter = useStorageAdapter();
  const queryClient = useQueryClient();

  // Text tracking for comment offsets
  const { handleTextChange, flushPendingUpdates } = useCommentTextTracking({
    enabled: true,
    debounceMs: 2000, // Update DB every 2 seconds
  });

  // Auto-save for notes content
  const {
    isDirty: isNotesDirty,
    isSaving: isNotesSaving,
    saveError: notesSaveError,
    retryCount: notesRetryCount,
    flushPendingUpdates: flushNotesAutoSave,
    clearError: clearNotesSaveError,
  } = useAutoSave({
    value: currentValue,
    onSave: async (value) => {
      // Flush comment tracking first, then save notes
      await flushPendingUpdates();
      await onSave(value);
    },
    debounceMs: NOTE_AUTO_SAVE_INTERVAL_MS,
    maxRetries: 5,
    enabled: open, // Only auto-save while dialog is open
  });

  // Navigation protection: block navigation while dirty to flush auto-save
  useNavigationBlocker({
    when: isNotesDirty && open,
    onBlock: flushNotesAutoSave,
  });

  // Browser unload protection: prevent tab close during active save
  useUnloadProtection({
    when: isNotesSaving,
  });

  const requireFreshNotes = useCallback(
    async (context: string, title?: string): Promise<boolean> => {
      console.log(`[NotesEditorDialog] Syncing latest notes before ${context}...`);
      try {
        await flushNotesAutoSave();
        await flushPendingUpdates();
        console.log(`[NotesEditorDialog] Sync completed for ${context}.`);
        return true;
      } catch (error) {
        console.error(`[NotesEditorDialog] Failed to sync before ${context}:`, error);
        setBlockingError({
          title: title ?? 'Unable to sync your notes',
          message: `We couldn't save your latest edits, so we can't finish ${context} yet. Please check your network connection and try again.`,
        });
        return false;
      }
    },
    [flushNotesAutoSave, flushPendingUpdates]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void requireFreshNotes('switching tabs');
      }
    };

    const handlePageHide = () => {
      void requireFreshNotes('leaving the page');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [open, requireFreshNotes]);

  const commentCountChangeRef = useRef(onCommentCountChange);

  useEffect(() => {
    commentCountChangeRef.current = onCommentCountChange;
  }, [onCommentCountChange]);

  // Sync internal state when dialog opens or initialValue changes
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
    }
  }, [open, initialValue]);

  // Surface dirty state to parent so it can coordinate sync behaviour
  useEffect(() => {
    onDirtyChange?.(isNotesDirty);
  }, [isNotesDirty, onDirtyChange]);

  // Reset any close error state when dialog visibility changes
  useEffect(() => {
    if (open) {
      setBlockingError(null);
      setIsClosePending(false);
      setIsPreparingComment(false);
    }
  }, [open]);

  /**
   * Load active comments from database
   */
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);

    try {
      const loadedComments = await storageAdapter.getComments(resourceId, 'active');
      setComments(loadedComments);

      // Notify parent of unresolved count
      const notifyCountChange = commentCountChangeRef.current;
      if (notifyCountChange) {
        notifyCountChange(loadedComments.length);
      }
    } catch (error) {
      console.error('[NotesEditorDialog] Error loading comments:', error);
      // Graceful degradation: continue without comments
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [resourceId, storageAdapter]);

  // Load comments when dialog opens
  useEffect(() => {
    if (open && resourceId) {
      loadComments();
    }
  }, [open, resourceId, loadComments]);

  /**
   * AI Notes Check mutation
   */
  const aiCheckMutation = useMutation({
    mutationFn: async () => {
      try {
        setAiCheckState('processing');
        // Brief delay for UX (shows processing state)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // CRITICAL: Flush auto-save first to ensure AI reads latest content
        await flushNotesAutoSave();

        // Then flush comment tracking
        await flushPendingUpdates();

        const result = await storageAdapter.runAINotesCheck(resourceId);

        if (!result.success) {
          throw new Error(result.error?.message || 'AI processing failed');
        }

        return result;
      } catch (error) {
        // If auto-save flush fails, block AI with descriptive error
        setAiCheckState('error');
        throw error instanceof Error
          ? error
          : new Error('Cannot start AI analysis - please check your network connection and try again');
      }
    },
    onSuccess: (result) => {
      setAiCheckState('complete');
      
      // Invalidate and reload comments to show new AI suggestions
      queryClient.invalidateQueries({ queryKey: ['comments', resourceId] });
      loadComments();
      
      // Auto-reset after showing success
      setTimeout(() => {
        setAiCheckState('idle');
      }, 2500);
    },
    onError: (error: Error) => {
      console.error('[NotesEditorDialog] AI check error:', error);
      setAiCheckState('error');
      
      // Auto-reset after showing error
      setTimeout(() => {
        setAiCheckState('idle');
      }, 4000);
    },
  });

  /**
   * Handle AI Notes Check button click
   */
  const handleAICheck = useCallback(() => {
    if (aiCheckState !== 'idle') return;
    console.log('[NotesEditorDialog] AI Notes Check requested.');
    aiCheckMutation.mutate();
  }, [aiCheckState, aiCheckMutation]);

  /**
   * Handle starting comment creation flow
   */
  const handleStartCommentCreation = () => {
    if (!selectionRange) {
      console.warn('[NotesEditorDialog] No text selected for comment');
      return;
    }

    if (isPreparingComment) {
      return;
    }

    const selectionSnapshot = { ...selectionRange };

    const beginCreation = async () => {
      console.log('[NotesEditorDialog] Preparing to add comment for current selection...');
      setIsPreparingComment(true);
      const synced = await requireFreshNotes('starting a comment', 'Unable to start comment');
      setIsPreparingComment(false);
      if (!synced) {
        return;
      }

      if (selectionSnapshot.start < 0 || selectionSnapshot.end <= selectionSnapshot.start) {
        console.warn('[NotesEditorDialog] Invalid selection range:', selectionSnapshot);
        return;
      }

      const plainText = stripMarkdown(currentValue);

      if (selectionSnapshot.start < 0 || selectionSnapshot.end > plainText.length) {
        console.warn('[NotesEditorDialog] Selection range out of bounds for plain text:', {
          range: selectionSnapshot,
          plainTextLength: plainText.length,
        });
        return;
      }

      const selectedText = plainText.slice(selectionSnapshot.start, selectionSnapshot.end);

      if (!selectedText.trim()) {
        console.warn(
          '[NotesEditorDialog] Plain text slice for selection is empty. Aborting comment creation.',
          {
            selectionRange: selectionSnapshot,
            plainTextLength: plainText.length,
            originalSelectionText: selectionSnapshot.text,
          }
        );
        return;
      }

      setIsCreatingComment(true);
    };

    void beginCreation();
  };

  /**
   * Handle submitting new comment
   */
  const handleCreateCommentSubmit = async (text: string) => {
    if (!selectionRange) {
      console.error('[NotesEditorDialog] No selection range for comment');
      return;
    }

    // Validate offsets are within bounds
    const plainText = stripMarkdown(currentValue);

    if (selectionRange.start < 0 || selectionRange.end > plainText.length) {
      console.error('[NotesEditorDialog] Selection range out of bounds:', {
        range: selectionRange,
        plainTextLength: plainText.length,
      });
      return;
    }

    try {
      const quotedText = plainText.slice(selectionRange.start, selectionRange.end);

      // Final validation before creating comment
      if (!quotedText.trim()) {
        console.error(
          '[NotesEditorDialog] Plain text slice for comment creation is empty after validation. Aborting.',
          {
            selectionRange,
            plainTextLength: plainText.length,
            originalSelectionText: selectionRange.text,
          }
        );
        return;
      }

      const newComment = await storageAdapter.createComment({
        resourceId,
        commentType: 'selected-text',
        body: text,
        startOffset: selectionRange.start,
        endOffset: selectionRange.end,
        quotedText,
      });

      // Add to local state
      setComments((prev) => [...prev, newComment]);

      // Notify parent of count change
      const notifyCountChange = commentCountChangeRef.current;
      if (notifyCountChange) {
        notifyCountChange(comments.length + 1);
      }

      // Clear creation state
      setIsCreatingComment(false);
      setSelectionRange(null);

      // Activate new comment
      setActiveCommentId(newComment.id);
    } catch (error) {
      console.error('[NotesEditorDialog] Error creating comment:', error);
      // Keep creation UI open for retry - user will see error in console
      // In production, this should show a toast notification
      throw error;
    }
  };

  /**
   * Handle canceling comment creation
   */
  const handleCreateCommentCancel = () => {
    setIsCreatingComment(false);
    setSelectionRange(null);
  };

  /**
   * Handle adding reply to existing comment
   */
  const handleAddReply = async (commentId: string, text: string) => {
    try {
      const newReply = await storageAdapter.addReply(commentId, text);

      // Update local state
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, replies: [...comment.replies, newReply] }
            : comment
        )
      );
    } catch (error) {
      console.error('[NotesEditorDialog] Error adding reply:', error);
      throw error;
    }
  };

  /**
   * Handle resolving comment
   */
  const handleResolveComment = async (commentId: string) => {
    try {
      await storageAdapter.resolveComment(commentId);

      // Remove from local state (moved to resolved)
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      // Notify parent of count change
      const notifyCountChange = commentCountChangeRef.current;
      if (notifyCountChange) {
        notifyCountChange(comments.length - 1);
      }

      // Clear active state if this was active
      if (activeCommentId === commentId) {
        setActiveCommentId(null);
      }
    } catch (error) {
      console.error('[NotesEditorDialog] Error resolving comment:', error);
      // Show error to user (optional: toast notification)
    }
  };

  /**
   * Handle deleting reply
   */
  const handleDeleteReply = async (replyId: string) => {
    // Note: Only allowed if comment has >1 reply (don't orphan comment)
    try {
      await storageAdapter.deleteReply(replyId);

      // Update local state
      setComments((prev) =>
        prev.map((comment) => ({
          ...comment,
          replies: comment.replies.filter((r) => r.id !== replyId),
        }))
      );
    } catch (error) {
      console.error('[NotesEditorDialog] Error deleting reply:', error);
    }
  };

  /**
   * Handle clicking comment in sidebar (activate it)
   */
  const handleCommentClick = (commentId: string) => {
    setActiveCommentId(commentId);
  };

  /**
   * Handle hovering over comment card (preview highlight)
   */
  const handleCommentHover = (commentId: string | null) => {
    setHoveredCommentId(commentId);
  };

  /**
   * Handle unresolving a comment from resolved modal
   */
  const handleUnresolveComment = () => {
    // Reload active comments to include the newly unresolved one
    loadComments();
  };

  /**
   * Handle text changes with comment offset tracking
   */
  const handleValueChange = (newValue: string) => {
    const oldValue = currentValue;

    // Update local state
    setCurrentValue(newValue);

    // Update comment offsets and stale status
    handleTextChange(oldValue, newValue, comments, setComments);
  };

  // Handle save action (triggers auto-save flush)
  const handleSave = async () => {
    if (isClosePending) {
      return;
    }

    const synced = await requireFreshNotes('saving your changes');
    if (synced) {
      onOpenChange(false);
    }
  };

  // Handle close attempts (X button, ESC, backdrop click)
  const handleClose = useCallback(() => {
    if (isClosePending) {
      return;
    }

    const flushAndClose = async () => {
      console.log('[NotesEditorDialog] Close requested – syncing latest notes before exit...');
      setBlockingError(null);
      setIsClosePending(true);

      try {
        const synced = await requireFreshNotes('closing the notes editor', 'Unable to close yet');
        if (synced) {
          onOpenChange(false);
        }
      } finally {
        setIsClosePending(false);
      }
    };

    void flushAndClose();
  }, [isClosePending, onOpenChange, requireFreshNotes]);

  const canStartComment = selectionRange !== null && !isPreparingComment;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleClose();
          }
        }}
      >
        <DialogContent className="max-w-[1800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Write your notes with markdown formatting. Raw text shows while editing, formatted output appears when you click outside the textbox.
            </DialogDescription>
          </DialogHeader>

          {/* Error notification after retry exhaustion */}
          {notesSaveError && notesRetryCount >= 5 && (
            <Alert variant="destructive" className="relative">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to save your notes</AlertTitle>
              <AlertDescription>
                Please check your network connection and try again. Your changes are still in the editor.
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={clearNotesSaveError}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {blockingError && (
            <Alert variant="destructive" className="relative">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{blockingError.title}</AlertTitle>
              <AlertDescription>
                {blockingError.message}
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => setBlockingError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Comment Toolbar */}
          <CommentToolbar
            hasSelection={canStartComment}
            onCreateComment={handleStartCommentCreation}
            onViewResolved={() => setShowResolvedComments(true)}
            unresolvedCount={comments.filter((c) => c.status === 'active').length}
            onAICheck={handleAICheck}
            aiCheckState={aiCheckState}
            aiCheckDisabled={false}
          />

          {/* Main content area with sidebar */}
          <div className="flex-1 min-h-0 flex gap-4">
            {/* Editor area */}
            <div className="flex-1 min-h-0 max-h-[600px] overflow-y-auto px-1">
              <WYSIWYGEditor
                value={currentValue}
                onChange={handleValueChange}
                onSelectionChange={(selection) => {
                  if (selection) {
                setSelectionRange({
                  start: selection.start,
                  end: selection.end,
                  text: selection.text,
                });
              } else {
                setSelectionRange(null);
              }
                }}
                placeholder="Start writing your notes... Use markdown formatting and WYSIWYG editing."
                minHeight={400}
                showToolbar={true}
                autoFocus={false}
              />
              {/* Note: Inline comment highlights during editing will be added in Phase 3 with ProseMirror decorations */}
            </div>

            {/* Sidebar: Comments */}
            <div className="w-[380px] flex flex-col gap-4 min-h-0 max-h-[600px]">
              {/* Comment sidebar (appears when comments exist) */}
              {(comments.length > 0 || isCreatingComment) && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CommentSidebar
                    comments={comments}
                    activeCommentId={activeCommentId}
                    onCommentClick={handleCommentClick}
                    onCommentHover={handleCommentHover}
                    onResolve={handleResolveComment}
                    onAddReply={handleAddReply}
                    onDeleteReply={handleDeleteReply}
                    isCreatingComment={isCreatingComment}
                    onCreateCommentSubmit={handleCreateCommentSubmit}
                    onCreateCommentCancel={handleCreateCommentCancel}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button
              onClick={handleSave}
              disabled={isNotesSaving || isClosePending}
              className="ml-auto"
            >
              {isNotesSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolved comments modal */}
      <ResolvedCommentsModal
        open={showResolvedComments}
        onOpenChange={setShowResolvedComments}
        resourceId={resourceId}
        onUnresolve={handleUnresolveComment}
      />
    </>
  );
}
