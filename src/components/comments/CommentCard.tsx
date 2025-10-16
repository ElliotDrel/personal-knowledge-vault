/**
 * CommentCard Component
 *
 * Displays individual comment with threaded replies, resolution badge,
 * and inline reply composer.
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { CommentWithReplies } from '@/types/comments';

interface CommentCardProps {
  comment: CommentWithReplies | null; // null when creating the very first comment
  isNew?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  onResolve?: () => void;
  onAddReply?: (body: string) => Promise<void>;
  onDeleteReply?: (replyId: string) => Promise<void>;
  onSubmit?: (body: string) => Promise<void>;
  onCancel?: () => void;
}

const formatRelativeTime = (isoDate: string) =>
  formatDistanceToNow(new Date(isoDate), { addSuffix: true });

export const CommentCard = memo(function CommentCard({
  comment,
  isNew = false,
  isActive = false,
  onClick,
  onResolve,
  onAddReply,
  onDeleteReply,
  onSubmit,
  onCancel,
}: CommentCardProps) {
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isNew && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isNew]);

  const handleSubmit = async () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      if (isNew && onSubmit) {
        await onSubmit(trimmed);
      } else if (onAddReply) {
        await onAddReply(trimmed);
        setShowReplyInput(false);
      }
      setReplyText('');
    } catch (error) {
      console.error('[CommentCard] Error submitting comment text:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isNew && onCancel) {
      if (replyText.trim()) {
        const confirmDiscard = window.confirm('Discard this comment? Your text will be lost.');
        if (!confirmDiscard) return;
      }
      onCancel();
      return;
    }

    setShowReplyInput(false);
    setReplyText('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        isActive && 'ring-2 ring-primary shadow-lg',
        comment?.isStale && 'border-orange-400',
        !isNew && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
      role="article"
      aria-label={isNew ? 'New comment' : `Comment${isActive ? ' (active)' : ''}${comment?.isStale ? ' (stale)' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            {comment?.commentType === 'selected-text' && comment.quotedText && (
              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                "{comment.quotedText}"
              </p>
            )}

            {comment?.isStale && (
              <Badge variant="warning" className="text-xs w-fit">
                Stale - text changed
              </Badge>
            )}

            {comment?.commentType === 'general' && (
              <Badge variant="secondary" className="text-xs w-fit">
                General
              </Badge>
            )}

            {comment?.status === 'resolved' && (
              <Badge variant="outline" className="text-xs w-fit">
                Resolved
              </Badge>
            )}
          </div>

          {!isNew && onResolve && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(event) => {
                event.stopPropagation();
                onResolve();
              }}
              aria-label="Resolve comment"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {!isNew && comment && (
          <div className="space-y-1">
            <p className="whitespace-pre-wrap leading-relaxed">{comment.body}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </p>
          </div>
        )}

        {comment?.replies.map((reply) => (
          <div key={reply.id} className="space-y-1 border-t pt-2">
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap leading-relaxed flex-1">{reply.body}</p>
              {onDeleteReply && reply.status === 'resolved' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteReply(reply.id);
                  }}
                  aria-label="Delete reply"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(reply.createdAt)}
              </p>
              {reply.status === 'resolved' && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  Resolved
                </Badge>
              )}
            </div>
          </div>
        ))}

        {isNew && (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your comment... (Ctrl+Enter to submit, Esc to cancel)"
              rows={3}
              className="resize-none"
              aria-label="New comment text"
              aria-describedby="comment-help-text"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!replyText.trim() || isSubmitting}
                aria-label="Submit comment"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Comment'
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSubmitting}
                aria-label="Cancel comment"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!isNew && showReplyInput && (
          <div className="space-y-2 border-t pt-2">
            <Textarea
              ref={textareaRef}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a reply... (Ctrl+Enter to submit, Esc to cancel)"
              rows={2}
              className="resize-none"
              aria-label="Reply text"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!replyText.trim() || isSubmitting}
                aria-label="Submit reply"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Replying...
                  </>
                ) : (
                  'Reply'
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSubmitting}
                aria-label="Cancel reply"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!isNew && !showReplyInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              setShowReplyInput(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            className="gap-1"
            aria-label="Add a reply to this comment"
          >
            <MessageCircle className="w-3 h-3" />
            Reply
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
