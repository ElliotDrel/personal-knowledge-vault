/**
 * CommentSidebar Component
 *
 * Displays list of active comments with create-new card at top.
 * Scrolls active comment into view when clicked from editor.
 */

import { useEffect, useRef, useMemo, memo } from 'react';
import { CommentCard } from './CommentCard';
import type { CommentWithReplies } from '@/types/comments';
import { cn } from '@/lib/utils';

interface CommentSidebarProps {
  comments: CommentWithReplies[];
  activeCommentId: string | null;
  onCommentClick: (id: string) => void;
  onCommentHover?: (id: string | null) => void;
  onResolve: (id: string) => void;
  onAddReply: (commentId: string, text: string) => Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  isCreatingComment: boolean;
  onCreateCommentSubmit: (text: string) => Promise<void>;
  onCreateCommentCancel: () => void;
}

export const CommentSidebar = memo(function CommentSidebar({
  comments,
  activeCommentId,
  onCommentClick,
  onCommentHover,
  onResolve,
  onAddReply,
  onDeleteReply,
  isCreatingComment,
  onCreateCommentSubmit,
  onCreateCommentCancel,
}: CommentSidebarProps) {
  const activeCommentRef = useRef<HTMLDivElement>(null);

  // Scroll active comment into view when it changes
  useEffect(() => {
    if (activeCommentId && activeCommentRef.current) {
      activeCommentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeCommentId]);

  // Filter to only active comments (resolved shown in modal) - memoized for performance
  const activeComments = useMemo(
    () => comments.filter((c) => c.status === 'active'),
    [comments]
  );

  return (
    <div
      className={cn(
        'w-[320px] h-full border-l pl-4 space-y-4 overflow-y-auto',
        'flex-shrink-0' // Prevent sidebar from shrinking
      )}
    >
      {/* New comment creation card (top position) */}
      {isCreatingComment && (
        <CommentCard
          comment={null}
          isNew
          onSubmit={onCreateCommentSubmit}
          onCancel={onCreateCommentCancel}
        />
      )}

      {/* Empty state */}
      {activeComments.length === 0 && !isCreatingComment && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>No comments yet</p>
          <p className="text-xs mt-1">Select text to add a comment</p>
        </div>
      )}

      {/* Existing active comments */}
      {activeComments.map((comment) => (
        <div
          key={comment.id}
          ref={comment.id === activeCommentId ? activeCommentRef : null}
          onMouseEnter={() => onCommentHover?.(comment.id)}
          onMouseLeave={() => onCommentHover?.(null)}
        >
          <CommentCard
            comment={comment}
            isActive={comment.id === activeCommentId}
            onClick={() => onCommentClick(comment.id)}
            onResolve={() => onResolve(comment.id)}
            onAddReply={(text) => onAddReply(comment.id, text)}
            onDeleteReply={onDeleteReply}
          />
        </div>
      ))}
    </div>
  );
});
