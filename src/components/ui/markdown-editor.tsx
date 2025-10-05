import { forwardRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  preview?: 'edit' | 'preview' | 'live';
  height?: number;
  className?: string;
}

const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ value = '', onChange, placeholder = 'Enter your content...', preview = 'live', height = 200, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("markdown-editor", className)} {...props}>
        <MDEditor
          value={value}
          onChange={(val) => onChange?.(val || '')}
          preview={preview}
          height={height}
          data-color-mode="light"
          hideToolbar={false}
          textareaProps={{
            placeholder,
            style: {
              fontSize: 14,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }
          }}
          previewOptions={{
            style: {
              fontSize: 14,
              fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }
          }}
        />
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

export { MarkdownEditor };