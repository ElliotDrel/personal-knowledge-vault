/**
 * CommentToolbar Component
 *
 * Displays toolbar above notes editor with comment actions.
 * Shows "Add Comment" button (enabled when text selected) and
 * "View Resolved" button with unresolved count badge.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, Archive } from 'lucide-react';

interface CommentToolbarProps {
  hasSelection: boolean;
  onCreateComment: () => void;
  onViewResolved: () => void;
  unresolvedCount: number;
}

export function CommentToolbar({
  hasSelection,
  onCreateComment,
  onViewResolved,
  unresolvedCount,
}: CommentToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b pb-3 mb-3 px-1">
      {/* Left side - Creation tools */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelection}
          onClick={onCreateComment}
          className="gap-2"
          aria-label="Add comment to selected text"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Add Comment
        </Button>

        {/* Future tools go here (e.g., formatting buttons, AI tools) */}
      </div>

      {/* Right side - Utility actions */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onViewResolved}
        className="gap-2"
        aria-label={`View resolved comments (${unresolvedCount} unresolved)`}
      >
        <Archive className="w-4 h-4" />
        View Resolved
        {unresolvedCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {unresolvedCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
