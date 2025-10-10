/**
 * NotesEditorDialog Component
 *
 * A modal dialog for editing notes with markdown support.
 * Features:
 * - Large editing area with MarkdownField (raw on focus, formatted on blur)
 * - Unsaved changes protection with confirmation dialog
 * - Future-ready layout structure for additional features
 * - Explicit save action (no auto-save)
 *
 * @component
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MarkdownField } from '@/components/ui/markdown-field';
import { Save, Loader2 } from 'lucide-react';

interface NotesEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
}

export function NotesEditorDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  isLoading = false,
}: NotesEditorDialogProps) {
  // Internal editing state
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Sync internal state when dialog opens or initialValue changes
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
    }
  }, [open, initialValue]);

  // Check if content has been modified
  const isDirty = currentValue !== initialValue;

  // Handle save action
  const handleSave = async () => {
    try {
      await onSave(currentValue);
      // Close dialog on successful save
      onOpenChange(false);
    } catch (error) {
      // Error handling done by parent (ResourceDetail)
      // Keep dialog open so user can retry
      console.error('NotesEditorDialog: Save failed', error);
    }
  };

  // Handle close attempts (X button, ESC, backdrop click)
  const handleClose = () => {
    if (isDirty) {
      // Show confirmation if there are unsaved changes
      setShowConfirmation(true);
    } else {
      // Close immediately if no changes
      onOpenChange(false);
    }
  };

  // Handle discard action
  const handleDiscard = () => {
    setCurrentValue(initialValue);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  // Handle save from confirmation dialog
  const handleConfirmSave = async () => {
    setShowConfirmation(false);
    await handleSave();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-[1400px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Write your notes with markdown formatting. Raw text shows while editing, formatted output appears when you click outside the textbox.
            </DialogDescription>
          </DialogHeader>

          {/* Main content area - full width for now, future: add right panel as sibling */}
          <div className="flex-1 min-h-0 max-h-[600px] overflow-y-auto px-1">
            <MarkdownField
              value={currentValue}
              onChange={setCurrentValue}
              placeholder="Start writing your notes... Use markdown formatting."
              minHeight={400}
              className="font-reading text-base leading-relaxed"
              isEditing={true}
              readOnly={true}
            />
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="ml-auto"
            >
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

      {/* Confirmation dialog for unsaved changes */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscard}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
