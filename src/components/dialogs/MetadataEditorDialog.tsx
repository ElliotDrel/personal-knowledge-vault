/**
 * Metadata Editor Dialog Component
 *
 * Modal dialog for editing resource metadata with multiple form fields.
 * Provides the same UX as NotesEditorDialog and TranscriptEditorDialog.
 *
 * Features:
 * - Multi-field form (title, description, tags, type-specific fields)
 * - Silent auto-save with 60-second debounce and exponential retry
 * - Critical trigger flushes (save button, dialog close, navigation)
 * - Navigation protection (blocks navigation until auto-save completes)
 * - Browser unload protection (prevents tab close during active save)
 * - Inline error notifications after retry exhaustion
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, X, AlertCircle } from 'lucide-react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useNavigationBlocker } from '@/hooks/useNavigationBlocker';
import { useUnloadProtection } from '@/hooks/useUnloadProtection';

interface MetadataFormData {
  title: string;
  description: string;
  tags: string;
  // Type-specific fields
  author: string;
  creator: string;
  platform: string;
  year: string;
  duration: string;
  url: string;
  // Short-video specific fields
  channelName: string;
  handle: string;
  viewCount: string;
  hashtags: string;
}

interface MetadataEditorDialogProps {
  /** Controls dialog open/close state */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Initial form values */
  initialValues: MetadataFormData;
  /** Resource type for conditional field rendering */
  resourceType: string;
  /** Async save function - receives processed metadata updates */
  onSave: (updates: Partial<MetadataFormData>) => Promise<void>;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
}

const METADATA_AUTO_SAVE_INTERVAL_MS = 60_000;

export function MetadataEditorDialog({
  open,
  onOpenChange,
  initialValues,
  resourceType,
  onSave,
  title = 'Edit Metadata',
  description = 'Update resource information and metadata',
}: MetadataEditorDialogProps) {
  // Internal form state
  const [formData, setFormData] = useState<MetadataFormData>(initialValues);
  const [isClosePending, setIsClosePending] = useState(false);
  const [blockingError, setBlockingError] = useState<{ title: string; message: string } | null>(
    null
  );

  // Reset form when dialog opens or initial values change
  useEffect(() => {
    if (open) {
      setFormData(initialValues);
      setBlockingError(null);
      setIsClosePending(false);
    }
  }, [open, initialValues]);

  // Validation: form is valid if title is not empty
  const formIsValid = formData.title.trim().length > 0;

  // Auto-save for metadata form
  const {
    isDirty,
    isSaving,
    saveError,
    retryCount,
    flushPendingUpdates,
    clearError,
  } = useAutoSave({
    value: formData,
    serializeValue: (data) => JSON.stringify(data),
    onSave: async (data) => {
      // Process form data before saving
      const updates: Partial<MetadataFormData> = {
        title: data.title.trim(),
        description: data.description.trim(),
        tags: data.tags,
      };

      // Add type-specific fields if they have values
      if (data.author) updates.author = data.author.trim();
      if (data.creator) updates.creator = data.creator.trim();
      if (data.platform) updates.platform = data.platform.trim();
      if (data.year) updates.year = data.year;
      if (data.duration) updates.duration = data.duration.trim();
      if (data.url) updates.url = data.url.trim();

      // Add short-video specific fields if they have values
      if (data.channelName) updates.channelName = data.channelName.trim();
      if (data.handle) updates.handle = data.handle.trim();
      if (data.viewCount) updates.viewCount = data.viewCount;
      if (data.hashtags) updates.hashtags = data.hashtags;

      await onSave(updates);
    },
    debounceMs: METADATA_AUTO_SAVE_INTERVAL_MS,
    maxRetries: 5,
    enabled: open && formIsValid,
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

  // Helper to flush and handle errors
  const requireFreshMetadata = useCallback(
    async (context: string, errorTitle?: string): Promise<boolean> => {
      console.log(`[MetadataEditorDialog] Syncing latest metadata before ${context}...`);
      try {
        await flushPendingUpdates();
        console.log(`[MetadataEditorDialog] Sync completed for ${context}.`);
        return true;
      } catch (error) {
        console.error(`[MetadataEditorDialog] Failed to sync before ${context}:`, error);
        setBlockingError({
          title: errorTitle ?? 'Unable to sync metadata',
          message: `We couldn't save your latest changes, so we can't finish ${context} yet. Please check your network connection and try again.`,
        });
        return false;
      }
    },
    [flushPendingUpdates]
  );

  // Handle form field changes
  const handleFieldChange = (field: keyof MetadataFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (saveError) {
      clearError();
    }
  };

  // Handle save button click
  const handleSave = async () => {
    if (isClosePending || !formIsValid) {
      return;
    }

    const synced = await requireFreshMetadata('saving your changes');
    if (synced) {
      onOpenChange(false);
    }
  };

  // Handle close attempts (X button, ESC, backdrop click)
  const handleClose = useCallback(() => {
    if (isClosePending) {
      return;
    }

    const flushAndClose = async () => {
      console.log('[MetadataEditorDialog] Close requested – syncing latest metadata before exit...');
      setBlockingError(null);
      setIsClosePending(true);

      try {
        const synced = await requireFreshMetadata(
          'closing the metadata editor',
          'Unable to close yet'
        );
        if (synced) {
          onOpenChange(false);
        }
      } finally {
        setIsClosePending(false);
      }
    };

    void flushAndClose();
  }, [isClosePending, onOpenChange, requireFreshMetadata]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Error notification after retry exhaustion */}
        {saveError && retryCount >= 5 && (
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to save metadata</AlertTitle>
            <AlertDescription>
              Please check your network connection and try again. Your changes are still in the
              editor.
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

        {blockingError && (
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{blockingError.title}</AlertTitle>
            <AlertDescription>{blockingError.message}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => setBlockingError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Title (required) */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Resource title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Resource description"
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleFieldChange('tags', e.target.value)}
              placeholder="Comma-separated tags"
            />
          </div>

          {/* URL */}
          {(resourceType === 'video' || resourceType === 'short-video') && (
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                placeholder="Resource URL"
              />
            </div>
          )}

          {/* Platform */}
          {(resourceType === 'video' || resourceType === 'short-video') && (
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                value={formData.platform}
                onChange={(e) => handleFieldChange('platform', e.target.value)}
                placeholder="e.g., YouTube, TikTok"
              />
            </div>
          )}

          {/* Author */}
          {(resourceType === 'article' || resourceType === 'book') && (
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleFieldChange('author', e.target.value)}
                placeholder="Author name"
              />
            </div>
          )}

          {/* Creator */}
          {(resourceType === 'video' || resourceType === 'short-video') && (
            <div className="space-y-2">
              <Label htmlFor="creator">Creator</Label>
              <Input
                id="creator"
                value={formData.creator}
                onChange={(e) => handleFieldChange('creator', e.target.value)}
                placeholder="Creator name"
              />
            </div>
          )}

          {/* Channel Name (short-video) */}
          {resourceType === 'short-video' && (
            <div className="space-y-2">
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={formData.channelName}
                onChange={(e) => handleFieldChange('channelName', e.target.value)}
                placeholder="Channel name"
              />
            </div>
          )}

          {/* Handle (short-video) */}
          {resourceType === 'short-video' && (
            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={formData.handle}
                onChange={(e) => handleFieldChange('handle', e.target.value)}
                placeholder="@handle"
              />
            </div>
          )}

          {/* Year */}
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={formData.year}
              onChange={(e) => handleFieldChange('year', e.target.value)}
              placeholder="Publication/release year"
            />
          </div>

          {/* Duration (video/short-video) */}
          {(resourceType === 'video' || resourceType === 'short-video') && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleFieldChange('duration', e.target.value)}
                placeholder="e.g., 10:30"
              />
            </div>
          )}

          {/* View Count (short-video) */}
          {resourceType === 'short-video' && (
            <div className="space-y-2">
              <Label htmlFor="viewCount">View Count</Label>
              <Input
                id="viewCount"
                type="number"
                value={formData.viewCount}
                onChange={(e) => handleFieldChange('viewCount', e.target.value)}
                placeholder="Number of views"
              />
            </div>
          )}

          {/* Hashtags (short-video) */}
          {resourceType === 'short-video' && (
            <div className="space-y-2">
              <Label htmlFor="hashtags">Hashtags</Label>
              <Input
                id="hashtags"
                value={formData.hashtags}
                onChange={(e) => handleFieldChange('hashtags', e.target.value)}
                placeholder="Comma-separated hashtags"
              />
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button onClick={handleSave} disabled={isSaving || isClosePending || !formIsValid}>
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
