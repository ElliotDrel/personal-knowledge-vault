/**
 * TextHighlight Component
 *
 * Renders visual highlights for comments in a textarea using the "mirror div" technique.
 * Creates an invisible div with same styling, inserts <mark> elements for highlights.
 *
 * Features:
 * - Multiple layered highlights (darker when overlapping)
 * - Active comment highlight (primary color)
 * - Hovered comment preview (lighter shade)
 * - Filters out stale comments (no visual highlight)
 * - Accurate multi-line highlighting
 *
 * @component
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { CommentWithReplies } from '@/types/comments';
import { isSelectedTextComment } from '@/types/comments';

interface HighlightSegment {
  text: string;
  commentIds: string[]; // Can have multiple overlapping comments
  isActive: boolean;
  isHovered: boolean;
}

interface TextHighlightProps {
  /** The text content being highlighted */
  text: string;

  /** Comments with offset information */
  comments: CommentWithReplies[];

  /** Currently active comment ID */
  activeCommentId: string | null;

  /** Currently hovered comment ID */
  hoveredCommentId: string | null;

  /** Additional CSS class for the container */
  className?: string;

  /** Inline styles applied to the container (used to mirror textarea styles) */
  style?: CSSProperties;
}

export function TextHighlight({
  text,
  comments,
  activeCommentId,
  hoveredCommentId,
  className = '',
  style,
}: TextHighlightProps) {
  // Build segments with highlight information
  const segments = useMemo(() => {
    // Filter valid comments
    const validComments = comments.filter(
      (c) =>
        isSelectedTextComment(c) &&
        !c.isStale &&
        c.startOffset !== undefined &&
        c.endOffset !== undefined &&
        c.startOffset < c.endOffset
    );

    if (validComments.length === 0) {
      return [{ text, commentIds: [], isActive: false, isHovered: false }];
    }

    // Create a list of all split points (start and end offsets)
    const splitPoints = new Set<number>([0, text.length]);
    validComments.forEach((c) => {
      splitPoints.add(c.startOffset!);
      splitPoints.add(c.endOffset!);
    });

    const sortedSplits = Array.from(splitPoints).sort((a, b) => a - b);

    // Build segments
    const result: HighlightSegment[] = [];
    for (let i = 0; i < sortedSplits.length - 1; i++) {
      const start = sortedSplits[i];
      const end = sortedSplits[i + 1];

      // Find which comments overlap this segment
      const overlappingComments = validComments.filter(
        (c) => c.startOffset! <= start && c.endOffset! >= end
      );

      const commentIds = overlappingComments.map((c) => c.id);
      const isActive = commentIds.includes(activeCommentId || '');
      const isHovered = commentIds.includes(hoveredCommentId || '');

      result.push({
        text: text.substring(start, end),
        commentIds,
        isActive,
        isHovered,
      });
    }

    return result;
  }, [text, comments, activeCommentId, hoveredCommentId]);

  // Determine background color based on segment state
  const getHighlightColor = (segment: HighlightSegment): string => {
    if (segment.commentIds.length === 0) return 'transparent';

    // Active takes priority
    if (segment.isActive) {
      // Darker if multiple overlaps
      return segment.commentIds.length > 1
        ? 'rgba(59, 130, 246, 0.4)' // blue-500, darker
        : 'rgba(59, 130, 246, 0.3)'; // blue-500, normal
    }

    // Hovered second priority
    if (segment.isHovered) {
      return segment.commentIds.length > 1
        ? 'rgba(59, 130, 246, 0.25)'
        : 'rgba(59, 130, 246, 0.15)';
    }

    // Default highlight
    return segment.commentIds.length > 1
      ? 'rgba(250, 204, 21, 0.35)' // yellow-400, darker for overlap
      : 'rgba(250, 204, 21, 0.25)'; // yellow-400, normal
  };

  return (
    <div
      className={cn(
        'pointer-events-none whitespace-pre-wrap break-words',
        className
      )}
      style={{
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        color: 'transparent',
        ...style,
      }}
    >
      {segments.map((segment, i) => (
        <span
          key={i}
          style={{
            backgroundColor: getHighlightColor(segment),
            borderRadius: '2px',
            transition: 'background-color 0.15s ease',
          }}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
