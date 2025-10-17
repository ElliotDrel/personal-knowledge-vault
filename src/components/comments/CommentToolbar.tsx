/**
 * CommentToolbar Component
 *
 * Displays toolbar above notes editor with comment actions.
 * Shows "Add Comment" button (enabled when text selected),
 * "AI Notes Check" button, and "View Resolved" button with unresolved count badge.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, Archive, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface CommentToolbarProps {
  hasSelection: boolean;
  onCreateComment: () => void;
  onViewResolved: () => void;
  unresolvedCount: number;
  // AI Notes Check props
  onAICheck?: () => void;
  aiCheckState?: 'idle' | 'processing' | 'complete' | 'error';
  aiCheckDisabled?: boolean;
}

export function CommentToolbar({
  hasSelection,
  onCreateComment,
  onViewResolved,
  unresolvedCount,
  onAICheck,
  aiCheckState = 'idle',
  aiCheckDisabled = false,
}: CommentToolbarProps) {
  // Icon for AI button based on state
  const getAIIcon = () => {
    switch (aiCheckState) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  // Button text based on state
  const getAIButtonText = () => {
    switch (aiCheckState) {
      case 'processing':
        return 'Checking...';
      case 'complete':
        return 'Done!';
      case 'error':
        return 'Try Again';
      default:
        return 'AI Notes Check';
    }
  };

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

        {/* AI Notes Check button */}
        {onAICheck && (
          <Button
            size="sm"
            variant={aiCheckState === 'complete' ? 'outline' : 'default'}
            disabled={aiCheckDisabled || aiCheckState === 'processing'}
            onClick={onAICheck}
            className="gap-2"
            aria-label="Check notes with AI"
          >
            {getAIIcon()}
            {getAIButtonText()}
          </Button>
        )}
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
