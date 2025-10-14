/**
 * MarkdownHighlight Component
 *
 * Renders markdown with visual highlights for comments.
 * Similar to TextHighlight but works with rendered markdown output.
 *
 * Strategy:
 * - Split source markdown into segments based on comment offsets
 * - Wrap highlighted segments in spans with background colors
 * - Render each segment through ReactMarkdown
 *
 * Note: This is a simplified approach that may break some markdown syntax
 * across segment boundaries. For production, consider a rehype plugin approach.
 *
 * @component
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { CommentWithReplies } from '@/types/comments';
import { isSelectedTextComment } from '@/types/comments';

interface HighlightSegment {
  text: string;
  commentIds: string[];
  isActive: boolean;
  isHovered: boolean;
}

interface MarkdownHighlightProps {
  /** The markdown source text */
  text: string;

  /** Comments with offset information */
  comments: CommentWithReplies[];

  /** Currently active comment ID */
  activeCommentId: string | null;

  /** Currently hovered comment ID */
  hoveredCommentId: string | null;

  /** Additional CSS class */
  className?: string;
}

export function MarkdownHighlight({
  text,
  comments,
  activeCommentId,
  hoveredCommentId,
  className = '',
}: MarkdownHighlightProps) {
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

    // Create split points
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

  // Determine background color
  const getHighlightColor = (segment: HighlightSegment): string => {
    if (segment.commentIds.length === 0) return 'transparent';

    if (segment.isActive) {
      return segment.commentIds.length > 1
        ? 'rgba(59, 130, 246, 0.4)'
        : 'rgba(59, 130, 246, 0.3)';
    }

    if (segment.isHovered) {
      return segment.commentIds.length > 1
        ? 'rgba(59, 130, 246, 0.25)'
        : 'rgba(59, 130, 246, 0.15)';
    }

    return segment.commentIds.length > 1
      ? 'rgba(250, 204, 21, 0.35)'
      : 'rgba(250, 204, 21, 0.25)';
  };

  return (
    <div className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>
      {segments.map((segment, i) => {
        const bgColor = getHighlightColor(segment);

        // If no highlight, render normally
        if (bgColor === 'transparent') {
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {segment.text}
            </ReactMarkdown>
          );
        }

        // Render with highlight background
        return (
          <span
            key={i}
            style={{
              backgroundColor: bgColor,
              borderRadius: '2px',
              transition: 'background-color 0.15s ease',
              display: 'inline',
            }}
          >
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                // Override default components to render inline
                p: ({ children }) => <span>{children}</span>,
              }}
            >
              {segment.text}
            </ReactMarkdown>
          </span>
        );
      })}
    </div>
  );
}
