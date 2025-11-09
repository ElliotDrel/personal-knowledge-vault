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
import { Loader2, Save, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useNavigationBlocker } from '@/hooks/useNavigationBlocker';
import { useUnloadProtection } from '@/hooks/useUnloadProtection';

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
 * Provides consistent save/cancel actions and auto-save with dirty state tracking.
 *
 * Features:
 * - Markdown editing with WYSIWYG interface
 * - Silent auto-save with 1-second debounce and exponential retry
 * - Dirty state tracking (detects unsaved changes)
 * - Critical trigger flushes (manual save, dialog close)
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

  // Auto-save for text content
  const {
    isDirty,
    isSaving,
    saveError: autoSaveError,
    retryCount,
    flushPendingUpdates,
    clearError,
  } = useAutoSave({
    value: currentValue,
    onSave,
    maxRetries: 5,
    enabled: open, // Only auto-save while dialog is open
  });

  // Navigation protection: block navigation while dirty to flush auto-save
  useNavigationBlocker({
    when: isDirty && open,
    onBlock: flushPendingUpdates,
  });

  // Browser unload protection: prevent tab close during active save
  useUnloadProtection({
    when: isSaving,
  });

  // Format error message from auto-save hook
  const saveError = autoSaveError
    ? autoSaveError.message || 'Failed to save changes. Please try again.'
    : null;

  // Reset content when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
      clearError();
    }
  }, [open, initialValue, clearError]);

  const handleChange = (value: string) => {
    setCurrentValue(value);
    // Auto-save hook tracks dirty state and errors automatically
    if (saveError) {
      clearError();
    }
  };

  const handleSave = async () => {
    try {
      // Flush auto-save to ensure latest changes are saved
      await flushPendingUpdates();
      onOpenChange(false);
    } catch (error) {
      // Error handling done by auto-save hook
      console.error('Save failed:', error);

      if (import.meta.env.DEV) {
        console.error('Full error context:', {
          error,
          currentValuePreview: typeof currentValue === 'string' ? currentValue.slice(0, 100) : null,
          valueLength: typeof currentValue === 'string' ? currentValue.length : null,
        });
      }
    }
  };

  const handleCancel = () => {
    // Flush auto-save if there are pending changes (fire and forget)
    if (isDirty) {
      void flushPendingUpdates().catch((error) => {
        console.error('Auto-save flush failed on cancel:', error);
      });

      const shouldDiscard =
        typeof window === 'undefined'
          ? true
          : window.confirm('You have unsaved changes. Discard them?');
      if (!shouldDiscard) {
        return;
      }
    }

    onOpenChange(false);
    clearError();
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void handleSave();
      return;
    }
    onOpenChange(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to save your changes</AlertTitle>
            <AlertDescription>
              {saveError} Please check your network connection and try saving again.
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={clearError}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
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
