/**
 * MarkdownHighlight Component
 *
 * Renders markdown with visual highlights for comments.
 * Similar logic to TextHighlight but applies highlights within formatted markdown output.
 *
 * Strategy:
 * - Build text segments based on comment offsets
 * - Convert highlight segments into a rehype plugin that wraps rendered text nodes
 * - Render markdown once (preserves correct formatting like lists/headings)
 *
 * @component
 */

import { useMemo } from 'react';
import type { Plugin } from 'unified';
import type { Root } from 'hast';
import { visit } from 'unist-util-visit';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { CommentWithReplies } from '@/types/comments';
import { isSelectedTextComment } from '@/types/comments';

interface HighlightSegment {
  text: string;
  start: number;
  end: number;
  commentIds: string[];
  isActive: boolean;
  isHovered: boolean;
}

interface HighlightRange {
  start: number;
  end: number;
  color: string;
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
  // Build segments with highlight information (non-overlapping by construction)
  const segments = useMemo<HighlightSegment[]>(() => {
    const validComments = comments.filter(
      (c) =>
        isSelectedTextComment(c) &&
        !c.isStale &&
        c.startOffset !== undefined &&
        c.endOffset !== undefined &&
        c.startOffset < c.endOffset
    );

    if (validComments.length === 0) {
      return [
        {
          text,
          start: 0,
          end: text.length,
          commentIds: [],
          isActive: false,
          isHovered: false,
        },
      ];
    }

    const splitPoints = new Set<number>([0, text.length]);
    validComments.forEach((c) => {
      splitPoints.add(c.startOffset!);
      splitPoints.add(c.endOffset!);
    });

    const sortedSplits = Array.from(splitPoints).sort((a, b) => a - b);
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
        start,
        end,
        commentIds,
        isActive,
        isHovered,
      });
    }

    return result;
  }, [text, comments, activeCommentId, hoveredCommentId]);

  // Determine background color for a segment
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

  const highlightRanges = useMemo<HighlightRange[]>(() => {
    return segments
      .filter((segment) => segment.commentIds.length > 0)
      .map((segment) => ({
        start: segment.start,
        end: segment.end,
        color: getHighlightColor(segment),
      }));
  }, [segments]);

  const highlightPlugin = useMemo(() => {
    if (highlightRanges.length === 0) {
      return null;
    }
    return createRehypeHighlightPlugin(highlightRanges);
  }, [highlightRanges]);

  const rehypePlugins = useMemo(() => {
    const plugins: Plugin[] = [rehypeSanitize];
    if (highlightPlugin) {
      plugins.push(highlightPlugin);
    }
    return plugins;
  }, [highlightPlugin]);

  return (
    <div className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function createRehypeHighlightPlugin(ranges: HighlightRange[]): Plugin<[], Root> {
  return () => (tree: Root) => {
    if (!ranges.length) return;

    interface TextNodeInfo {
      node: any;
      parent: any;
      index: number;
      start: number;
      length: number;
    }

    const textNodes: TextNodeInfo[] = [];
    let offset = 0;

    visit(tree, 'text', (node, index, parent) => {
      if (parent && typeof index === 'number') {
        const length = node.value.length;
        textNodes.push({ node, parent, index, start: offset, length });
        offset += length;
      }
    });

    if (textNodes.length === 0) return;

    const rangeMap = new Map<string, HighlightRange>();
    ranges.forEach((range) => {
      rangeMap.set(`${range.start}:${range.end}`, range);
    });

    for (let i = textNodes.length - 1; i >= 0; i--) {
      const { node, parent, index, start, length } = textNodes[i];
      const end = start + length;

      const overlapping = ranges.filter(
        (range) => range.start < end && range.end > start
      );

      if (overlapping.length === 0) {
        continue;
      }

      const breakpoints = new Set<number>([start, end]);
      overlapping.forEach((range) => {
        breakpoints.add(Math.max(start, range.start));
        breakpoints.add(Math.min(end, range.end));
      });

      const sortedBreakpoints = Array.from(breakpoints).sort((a, b) => a - b);
      const replacement: any[] = [];

      for (let j = 0; j < sortedBreakpoints.length - 1; j++) {
        const segStart = sortedBreakpoints[j];
        const segEnd = sortedBreakpoints[j + 1];
        if (segEnd <= segStart) continue;

        const sliceStart = segStart - start;
        const sliceEnd = segEnd - start;
        const value = node.value.slice(sliceStart, sliceEnd);

        if (!value) continue;

        const rangeKey = `${segStart}:${segEnd}`;
        const matchedRange = rangeMap.get(rangeKey);

        if (matchedRange) {
          replacement.push({
            type: 'element',
            tagName: 'span',
            properties: {
              style: `background-color: ${matchedRange.color}; border-radius: 2px; transition: background-color 0.15s ease;`,
            },
            children: [{ type: 'text', value }],
          });
        } else {
          replacement.push({ type: 'text', value });
        }
      }

      parent.children.splice(index, 1, ...replacement);
    }
  };
}
