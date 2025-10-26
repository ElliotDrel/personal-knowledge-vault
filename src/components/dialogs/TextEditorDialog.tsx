import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WYSIWYGEditor } from '@/components/ui/wysiwyg-editor';
import { Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TextEditorDialogProps {
  /** Controls dialog open/close state */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Optional description shown below title */
  description?: string;
  /** Initial markdown content */
  initialValue: string;
  /** Callback when save is clicked (receives markdown) */
  onSave: (value: string) => Promise<void>;
  /** Loading state during save operation */
  isLoading?: boolean;
  /** Show WYSIWYG toolbar (default: true) */
  showToolbar?: boolean;
  /** Additional content to render above editor (e.g., comment toolbar) */
  children?: React.ReactNode;
}

/**
 * Base Text Editor Dialog Component
 *
 * A reusable dialog that wraps WYSIWYGEditor for modal editing workflows.
 * Provides consistent save/cancel actions and dirty state tracking.
 *
 * Features:
 * - Markdown editing with WYSIWYG interface
 * - Dirty state tracking (detects unsaved changes)
 * - Resets content when dialog opens
 * - Children slot for additional toolbar items
 * - Consistent dialog UI across the app
 *
 * Usage:
 * ```tsx
 * <TextEditorDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Edit Notes"
 *   description="Write your notes here"
 *   initialValue={notes}
 *   onSave={async (value) => {
 *     await saveNotes(value);
 *   }}
 *   isLoading={isSaving}
 * />
 * ```
 *
 * Extending with additional features:
 * ```tsx
 * <TextEditorDialog {...baseProps}>
 *   <CommentToolbar onAddComment={handleAddComment} />
 * </TextEditorDialog>
 * ```
 */
export function TextEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue,
  onSave,
  isLoading = false,
  showToolbar = true,
  children,
}: TextEditorDialogProps) {
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset content and dirty state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
      setIsDirty(false);
      setSaveError(null);
    }
  }, [open, initialValue]);

  const handleChange = (value: string) => {
    setCurrentValue(value);
    setIsDirty(true);
    if (saveError) {
      setSaveError(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaveError(null);
      await onSave(currentValue);
      setIsDirty(false);
      onOpenChange(false);
    } catch (error) {
      // Error handling delegated to parent via onSave
      console.error('Save failed:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to save changes. Please try again.';
      setSaveError(message);
    }
  };

  const handleCancel = () => {
    // TODO: Add unsaved changes warning if isDirty
    onOpenChange(false);
    setSaveError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Children slot for additional toolbar items (e.g., comment tools) */}
        {children}

        {/* Editor - flex-1 to fill available space */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <WYSIWYGEditor
            value={currentValue}
            onChange={handleChange}
            showToolbar={showToolbar}
            minHeight={400}
          />
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertTitle>Save failed</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !isDirty}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
