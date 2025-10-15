/**
 * NotesEditorDialog Component
 *
 * A modal dialog for editing notes with markdown support.
 * Features:
 * - Large editing area with MarkdownField (raw on focus, formatted on blur)
 * - Unsaved changes protection with confirmation dialog
 * - Future-ready layout structure for additional features
 * - Explicit save action (no auto-save)
 *
 * @component
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MarkdownField } from '@/components/ui/markdown-field';
import { Save, Loader2 } from 'lucide-react';

// Comment system imports
import type { CommentWithReplies } from '@/types/comments';
import { useStorageAdapter } from '@/data/storageAdapter';
import { useCommentTextTracking } from '@/hooks/use-comment-text-tracking';
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Comment system state
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [isMarkdownEditing, setIsMarkdownEditing] = useState(true);

  // Hooks
  const storageAdapter = useStorageAdapter();

  // Text tracking for comment offsets
  const { handleTextChange } = useCommentTextTracking({
    resourceId,
    enabled: true,
    debounceMs: 2000, // Update DB every 2 seconds
  });

  // Sync internal state when dialog opens or initialValue changes
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
    }
  }, [open, initialValue]);

  // Check if content has been modified
  const isDirty = currentValue !== initialValue;

  // Surface dirty state to parent so it can coordinate sync behaviour
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Ensure confirmation dialog is reset when the editor closes externally
  useEffect(() => {
    if (!open) {
      setShowConfirmation(false);
    }
  }, [open]);

  useEffect(() => {
    setIsMarkdownEditing(open);
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
      if (onCommentCountChange) {
        onCommentCountChange(loadedComments.length);
      }
    } catch (error) {
      console.error('[NotesEditorDialog] Error loading comments:', error);
      // Graceful degradation: continue without comments
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [resourceId, storageAdapter, onCommentCountChange]);

  // Load comments when dialog opens
  useEffect(() => {
    if (open && resourceId) {
      loadComments();
    }
  }, [open, resourceId, loadComments]);

  /**
   * Handle starting comment creation flow
   */
  const handleStartCommentCreation = () => {
    if (!selectionRange) {
      console.warn('[NotesEditorDialog] No text selected for comment');
      return;
    }

    setIsCreatingComment(true);
  };

  /**
   * Handle submitting new comment
   */
  const handleCreateCommentSubmit = async (text: string) => {
    if (!selectionRange) {
      console.error('[NotesEditorDialog] No selection range for comment');
      return;
    }

    try {
      const quotedText = currentValue.slice(
        selectionRange.start,
        selectionRange.end
      );

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
      if (onCommentCountChange) {
        onCommentCountChange(comments.length + 1);
      }

      // Clear creation state
      setIsCreatingComment(false);
      setSelectionRange(null);

      // Activate new comment
      setActiveCommentId(newComment.id);
    } catch (error) {
      console.error('[NotesEditorDialog] Error creating comment:', error);
      // Keep creation UI open for retry
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
      if (onCommentCountChange) {
        onCommentCountChange(comments.length - 1);
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

  /**
   * Handle text selection changes
   */
  const handleSelectionChange = (range: { start: number; end: number } | null) => {
    setSelectionRange(range);
  };

  // Handle save action
  const handleSave = async () => {
    try {
      await onSave(currentValue);
      // Close dialog on successful save
      onOpenChange(false);
    } catch (error) {
      // Error handling done by parent (ResourceDetail)
      // Keep dialog open so user can retry
      console.error('NotesEditorDialog: Save failed', error);
    }
  };

  // Handle close attempts (X button, ESC, backdrop click)
  const handleClose = () => {
    if (isDirty) {
      // Show confirmation if there are unsaved changes
      setShowConfirmation(true);
    } else {
      // Close immediately if no changes
      onOpenChange(false);
    }
  };

  // Handle discard action
  const handleDiscard = () => {
    setCurrentValue(initialValue);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  // Handle save from confirmation dialog
  const handleConfirmSave = async () => {
    setShowConfirmation(false);
    await handleSave();
  };

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

          {/* Comment Toolbar */}
          <CommentToolbar
            hasSelection={selectionRange !== null}
            onCreateComment={handleStartCommentCreation}
            onViewResolved={() => setShowResolvedComments(true)}
            unresolvedCount={comments.filter((c) => c.status === 'active').length}
          />

          {/* Main content area with sidebar */}
          <div className="flex-1 min-h-0 flex gap-4">
            {/* Editor area */}
            <div className="flex-1 min-h-0 max-h-[600px] overflow-y-auto px-1">
              <MarkdownField
                value={currentValue}
                onChange={handleValueChange}
                onSelectionChange={handleSelectionChange}
                placeholder="Start writing your notes... Use markdown formatting."
                minHeight={400}
                textareaClassName="font-reading text-base leading-relaxed"
                isEditing={isMarkdownEditing}
                onEditingChange={setIsMarkdownEditing}
                comments={comments}
                activeCommentId={activeCommentId}
                hoveredCommentId={hoveredCommentId}
              />
            </div>

            {/* Comment sidebar (appears when comments exist) */}
            {(comments.length > 0 || isCreatingComment) && (
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
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="ml-auto"
            >
              {isLoading ? (
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

      {/* Confirmation dialog for unsaved changes */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscard}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
