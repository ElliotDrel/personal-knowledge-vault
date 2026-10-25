import { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { stripMarkdown, normalizePlainTextWhitespace } from '@/utils/stripMarkdown';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
} from 'lucide-react';

/**
 * Configure Turndown for consistent markdown output
 *
 * Settings:
 * - headingStyle: 'atx' -> Use # syntax for headings (not underlines)
 * - codeBlockStyle: 'fenced' -> Use ``` for code blocks (not indentation)
 */
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

interface WYSIWYGEditorProps {
  /** Markdown string to display */
  value: string;
  /** Callback with markdown string when content changes */
  onChange?: (value: string) => void;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Additional CSS classes for container */
  className?: string;
  /** Minimum height in pixels (default: 300) */
  minHeight?: number;
  /** Disable editing (default: false) */
  readOnly?: boolean;
  /** Show formatting toolbar (default: true) */
  showToolbar?: boolean;
  /** Auto-focus editor on mount (default: false) */
  autoFocus?: boolean;
  /** Callback when user selects text (provides selected text and character offsets in markdown) */
  onSelectionChange?: (selection: { text: string; start: number; end: number } | null) => void;
}

/**
 * WYSIWYG Editor Component
 *
 * A rich text editor built on TipTap that stores content as markdown.
 * Provides a formatting toolbar and supports both editing and read-only modes.
 *
 * Features:
 * - Markdown input/output (HTML used internally)
 * - Rich text editing with toolbar
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
 * - Read-only mode for display
 * - Configurable min height and styling
 *
 * Usage:
 * ```tsx
 * <WYSIWYGEditor
 *   value={markdownContent}
 *   onChange={setMarkdownContent}
 *   showToolbar={true}
 *   minHeight={400}
 * />
 * ```
 */
export function WYSIWYGEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  className,
  minHeight = 300,
  readOnly = false,
  showToolbar = true,
  autoFocus = false,
  onSelectionChange,
}: WYSIWYGEditorProps) {
  // Convert markdown to sanitized HTML for initial content
  const initialHtml = useMemo(() => sanitizeHtml(marked(value || '') as string), [value]);
  const lastSyncedMarkdownRef = useRef(value ?? '');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const debouncedOnChange = useDebouncedCallback(
    (markdown: string) => {
      onChangeRef.current?.(markdown);
    },
    300,
    { maxWait: 1000 },
  );

  useEffect(() => {
    return () => {
      debouncedOnChange.flush();
    };
  }, [debouncedOnChange]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Disable default keyboard shortcuts that conflict with browser
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    [placeholder],
  );

  // Initialize TipTap editor
  const editor = useEditor({
    extensions,
    content: initialHtml,
    editable: !readOnly,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none p-4',
        'data-placeholder': placeholder,
      },
      handleDOMEvents: {
        blur: () => {
          debouncedOnChange.flush();
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (readOnly) {
        return;
      }

      const sanitizedHtml = sanitizeHtml(editor.getHTML());
      const markdown = turndownService.turndown(sanitizedHtml);
      lastSyncedMarkdownRef.current = markdown;

      if (!onChangeRef.current) {
        return;
      }

      debouncedOnChange(markdown);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!onSelectionChange) return;

      const { from, to } = editor.state.selection;

      // If no selection (cursor only), clear
      if (from === to) {
        onSelectionChange(null);
        return;
      }

      const rawSelectedText = editor.state.doc.textBetween(from, to, '\n');
      const normalizedSelectedText = normalizePlainTextWhitespace(rawSelectedText, {
        trimEdges: false,
      });

      if (!normalizedSelectedText.trim()) {
        onSelectionChange(null);
        return;
      }

      const sanitizedHtml = sanitizeHtml(editor.getHTML());
      const markdown = turndownService.turndown(sanitizedHtml);
      const plainText = stripMarkdown(markdown);
      const rawTextBeforeSelection = editor.state.doc.textBetween(0, from, '\n');
      const normalizedTextBeforeSelection = normalizePlainTextWhitespace(
        rawTextBeforeSelection,
        { trimEdges: false },
      );

      const rawTextThroughSelection = editor.state.doc.textBetween(0, to, '\n');
      const normalizedTextThroughSelection = normalizePlainTextWhitespace(
        rawTextThroughSelection,
        { trimEdges: false },
      );

      const rawFullText = editor.state.doc.textBetween(
        0,
        editor.state.doc.content.size,
        '\n',
      );
      const normalizedFullText = normalizePlainTextWhitespace(rawFullText, {
        trimEdges: false,
      });
      const leadingWhitespaceRemoved =
        normalizedFullText.length - normalizedFullText.trimStart().length;

      const start = Math.max(
        0,
        normalizedTextBeforeSelection.length - leadingWhitespaceRemoved,
      );
      const endCandidate = Math.max(
        start,
        normalizedTextThroughSelection.length - leadingWhitespaceRemoved,
      );

      if (start > plainText.length) {
        onSelectionChange(null);
        return;
      }

      const end = Math.min(endCandidate, plainText.length);
      const plainTextSelection = plainText.slice(start, end);

      if (!plainTextSelection.trim()) {
        onSelectionChange(null);
        return;
      }

      if (
        normalizePlainTextWhitespace(plainTextSelection, { trimEdges: false }) !==
        normalizedSelectedText
      ) {
        console.warn('[WYSIWYGEditor] Plain text selection mismatch detected.', {
          normalizedSelectedText,
          plainTextSelection,
          start,
          end,
        });
      }

      onSelectionChange({
        text: plainTextSelection,
        start,
        end,
      });
    },
  });

  // Sync external value changes to editor
  useEffect(() => {
    if (!editor) {
      return;
    }

    const normalizedValue = value ?? '';

    // Only update when external markdown changes
    if (normalizedValue !== lastSyncedMarkdownRef.current) {
      debouncedOnChange.flush();
      const newHtml = sanitizeHtml(marked(normalizedValue) as string);
      editor.commands.setContent(newHtml, false);
      lastSyncedMarkdownRef.current = normalizedValue;
      return;
    }

    // Keep ref aligned even if nothing changed
    lastSyncedMarkdownRef.current = normalizedValue;
  }, [value, editor, debouncedOnChange]);

  // Cleanup editor on unmount
  useEffect(() => {
    const currentEditor = editor;
    return () => {
      currentEditor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn('border rounded-lg p-4', className)}>
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      {showToolbar && !readOnly && <EditorToolbar editor={editor} />}

      {/* Editor Content */}
      <div style={{ minHeight: `${minHeight}px` }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/**
 * Editor Toolbar Component
 *
 * Provides formatting buttons for the TipTap editor.
 * Buttons show active state when formatting is applied to current selection.
 */
interface EditorToolbarProps {
  editor: NonNullable<ReturnType<typeof useEditor>>;
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Bold',
      shortcut: 'Ctrl+B',
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: 'Italic',
      shortcut: 'Ctrl+I',
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      type: 'separator' as const,
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      type: 'separator' as const,
    },
    {
      icon: List,
      label: 'Bullet List',
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      type: 'separator' as const,
    },
    {
      icon: Quote,
      label: 'Blockquote',
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
    {
      icon: Code,
      label: 'Code Block',
      onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
    },
  ];

  return (
    <div className="border-b bg-muted/30 p-2 flex flex-wrap gap-1">
      {toolbarButtons.map((btn, index) => {
        if (btn.type === 'separator') {
          return <div key={`sep-${index}`} className="w-px bg-border mx-1" />;
        }

        const Icon = btn.icon;
        return (
          <Button
            key={btn.label}
            type="button"
            size="sm"
            variant={btn.isActive ? 'default' : 'ghost'}
            onClick={btn.onClick}
            title={`${btn.label}${btn.shortcut ? ` (${btn.shortcut})` : ''}`}
            className="h-8 w-8 p-0"
          >
            <Icon className="w-4 h-4" />
            <span className="sr-only">{btn.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
