/**
 * MarkdownField Component
 *
 * Obsidian-style markdown editing experience with two modes:
 *
 * **Auto Mode** (default):
 * - Click the rendered content to enter edit mode (raw markdown)
 * - Blur the textarea to return to formatted preview mode
 *
 * **Controlled Mode** (with readOnly prop):
 * - Parent controls edit/view via the isEditing prop
 * - View is not clickable (use Edit/Save buttons)
 * - Textarea stays active until the parent toggles it off
 *
 * Features:
 * - Single field (not split-screen)
 * - Raw markdown visible while editing
 * - Formatted output when not editing
 * - GitHub Flavored Markdown support
 * - Sanitized HTML output (XSS protection)
 *
 * @component
 */

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TextHighlight } from '@/components/comments/TextHighlight';
import { MarkdownHighlight } from '@/components/comments/MarkdownHighlight';
import type { CommentWithReplies } from '@/types/comments';

interface MarkdownFieldProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  readOnly?: boolean; // When true, disables auto-toggle (use with Edit/Save buttons)

  /** Callback when user selects text (character offsets) */
  onSelectionChange?: (range: { start: number; end: number } | null) => void;

  /** Comment highlighting props */
  comments?: CommentWithReplies[];
  activeCommentId?: string | null;
  hoveredCommentId?: string | null;
}

export function MarkdownField({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  className,
  minHeight = 300,
  isEditing = false,
  onEditingChange,
  readOnly = false,
  onSelectionChange,
  comments = [],
  activeCommentId = null,
  hoveredCommentId = null,
}: MarkdownFieldProps) {
  const [isFocused, setIsFocused] = useState(isEditing);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (readOnly) {
      setIsFocused(isEditing);
    }
  }, [isEditing, readOnly]);

  const handleFocus = () => {
    if (!readOnly) {
      setIsFocused(true);
      onEditingChange?.(true);
    }
  };

  const handleBlur = () => {
    if (!readOnly) {
      setIsFocused(false);
      onEditingChange?.(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  /**
   * Handle text selection in textarea
   * Fires when user selects text with mouse or keyboard
   */
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (!onSelectionChange) return;

    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    // Only fire if there's an actual selection (not just cursor position)
    if (start !== end) {
      onSelectionChange({ start, end });
    } else {
      // Selection cleared (collapsed to cursor)
      onSelectionChange(null);
    }
  };

  // Show textarea when editing (focused or controlled via isEditing)
  if (isFocused || isEditing) {
    return (
      <div className="relative">
        {/* Highlight overlay (positioned behind textarea) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="p-3"
            style={{
              minHeight: `${minHeight}px`,
            }}
          >
            <TextHighlight
              text={value}
              comments={comments}
              activeCommentId={activeCommentId}
              hoveredCommentId={hoveredCommentId}
            />
          </div>
        </div>

        {/* Textarea (foreground, transparent background to show highlights) */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onSelect={handleSelect}
          onFocus={handleFocus}
          onBlur={readOnly ? undefined : handleBlur}
          placeholder={placeholder}
          className={cn(
            'font-mono text-sm leading-relaxed resize-none relative z-10',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'bg-transparent',
            className
          )}
          style={{ minHeight: `${minHeight}px` }}
          autoFocus={isEditing}
        />
      </div>
    );
  }

  // Show rendered markdown when not editing (blurred)
  return (
    <div
      onClick={readOnly ? undefined : handleFocus}
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-4',
        !readOnly && 'cursor-text hover:bg-muted/50',
        'transition-colors',
        'font-reading text-base leading-relaxed',
        className
      )}
      style={{ minHeight: `${minHeight}px` }}
    >
      {value ? (
        comments.length > 0 ? (
          <MarkdownHighlight
            text={value}
            comments={comments}
            activeCommentId={activeCommentId}
            hoveredCommentId={hoveredCommentId}
          />
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {value}
            </ReactMarkdown>
          </div>
        )
      ) : (
        <div className="text-muted-foreground italic">
          {placeholder}
        </div>
      )}
    </div>
  );
}
