/**
 * MarkdownField Component
 *
 * Obsidian-style markdown editing experience with two modes:
 *
 * **Auto Mode** (default):
 * - Click view → edit mode (raw markdown)
 * - Blur → view mode (formatted HTML)
 *
 * **Controlled Mode** (with readOnly prop):
 * - Parent controls edit/view via isEditing prop
 * - View is not clickable (use Edit/Save buttons)
 * - Textarea doesn't auto-blur back to view
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

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MarkdownFieldProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  readOnly?: boolean; // When true, disables auto-toggle (use with Edit/Save buttons)
}

export function MarkdownField({
  value = '',
  onChange,
  placeholder = 'Start writing...',
  className,
  minHeight = 300,
  isEditing = false,
  onEditingChange,
  readOnly = false
}: MarkdownFieldProps) {
  const [isFocused, setIsFocused] = useState(isEditing);

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

  // Show textarea when editing (focused or controlled via isEditing)
  if (isFocused || isEditing) {
    return (
      <Textarea
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={readOnly ? undefined : handleBlur}
        placeholder={placeholder}
        className={cn(
          'font-mono text-sm leading-relaxed resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          className
        )}
        style={{ minHeight: `${minHeight}px` }}
        autoFocus={isEditing}
      />
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
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="text-muted-foreground italic">
          {placeholder}
        </div>
      )}
    </div>
  );
}
