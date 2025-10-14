/**
 * ResolvedCommentsModal Component
 *
 * Displays archived (resolved) comments with options to:
 * - View all resolved discussions
 * - Unresolve (restore to active)
 * - Permanently delete
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { useStorageAdapter } from '@/data/storageAdapter';
import type { CommentWithReplies } from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';

interface ResolvedCommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  onUnresolve?: () => void; // Callback to notify parent to refresh active comments
}

export function ResolvedCommentsModal({
  open,
  onOpenChange,
  resourceId,
  onUnresolve,
}: ResolvedCommentsModalProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const storageAdapter = useStorageAdapter();

  // Load resolved comments when modal opens
  useEffect(() => {
    if (open && resourceId) {
      loadResolvedComments();
    }
  }, [open, resourceId]);

  /**
   * Load resolved comments from database
   */
  const loadResolvedComments = async () => {
    setLoading(true);

    try {
      const resolved = await storageAdapter.getComments(resourceId, 'resolved');
      setComments(resolved);
    } catch (error) {
      console.error('[ResolvedCommentsModal] Error loading resolved comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unresolve a comment (restore to active)
   */
  const handleUnresolve = async (commentId: string) => {
    try {
      await storageAdapter.updateComment(commentId, {
        status: 'active',
        resolvedAt: null, // Clear resolved timestamp
      });

      // Remove from local state
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      // Notify parent to refresh active comments
      onUnresolve?.();
    } catch (error) {
      console.error('[ResolvedCommentsModal] Error unresolving comment:', error);
    }
  };

  /**
   * Permanently delete a comment
   */
  const handleDelete = async (commentId: string) => {
    try {
      await storageAdapter.deleteComment(commentId);

      // Remove from local state
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      // Close confirmation dialog
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('[ResolvedCommentsModal] Error deleting comment:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[900px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Resolved Comments</DialogTitle>
            <DialogDescription>
              View and manage archived comments. You can restore them to active or permanently delete them.
            </DialogDescription>
          </DialogHeader>

          {/* Content area */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No resolved comments</p>
                <p className="text-xs mt-1">Resolved comments will appear here</p>
              </div>
            ) : (
              comments.map((comment) => (
                <Card key={comment.id} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Quoted text */}
                        {comment.commentType === 'selected-text' && comment.quotedText && (
                          <p className="text-xs text-muted-foreground line-clamp-2 italic">
                            "{comment.quotedText}"
                          </p>
                        )}

                        {/* Stale badge */}
                        {comment.isStale && (
                          <Badge variant="warning" className="text-xs w-fit">
                            ⚠ Stale - text changed
                          </Badge>
                        )}

                        {/* Resolved badge */}
                        <Badge variant="secondary" className="text-xs w-fit">
                          ✓ Resolved {comment.resolvedAt && `· ${formatDistanceToNow(new Date(comment.resolvedAt), { addSuffix: true })}`}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleUnresolve(comment.id)}
                          title="Unresolve comment"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(comment.id)}
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Comment body */}
                    <div className="space-y-1">
                      <p className="whitespace-pre-wrap leading-relaxed">{comment.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="space-y-1 pl-3 border-l-2">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment and all its replies will be permanently deleted from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
