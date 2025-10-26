import { TextEditorDialog } from './TextEditorDialog';

interface TranscriptEditorDialogProps {
  /** Controls dialog open/close state */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Initial transcript markdown */
  initialValue: string;
  /** Callback when save is clicked */
  onSave: (value: string) => Promise<void>;
  /** Loading state during save */
  isLoading?: boolean;
}

/**
 * Transcript Editor Dialog
 *
 * A simple WYSIWYG editor for transcripts.
 * Uses the base TextEditorDialog with no additional features.
 *
 * Features:
 * - WYSIWYG editing with markdown storage
 * - Formatting toolbar (Bold, Italic, Headings, Lists, etc.)
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
 * - Clean, distraction-free editing
 *
 * Usage:
 * ```tsx
 * <TranscriptEditorDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   initialValue={transcript}
 *   onSave={async (value) => {
 *     await saveTranscript(value);
 *   }}
 *   isLoading={isSaving}
 * />
 * ```
 */
export function TranscriptEditorDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  isLoading,
}: TranscriptEditorDialogProps) {
  return (
    <TextEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Transcript"
      description="Edit the transcript with rich text formatting. Changes are saved as markdown."
      initialValue={initialValue}
      onSave={onSave}
      isLoading={isLoading}
      showToolbar={true}
    >
      {/* No additional toolbar items - simple editing only */}
    </TextEditorDialog>
  );
}
