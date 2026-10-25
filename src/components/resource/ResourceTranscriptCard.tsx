/**
 * Resource Transcript Card Component
 *
 * Displays resource transcript with an "Edit" button that opens the transcript editor dialog.
 * Handles transcript display and editing in isolation from the parent component.
 *
 * Features:
 * - Markdown preview of transcript
 * - Edit button triggers TranscriptEditorDialog
 * - Conditional rendering (only for video/short-video types)
 * - Clean separation of concerns
 */

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Mic, Loader2 } from 'lucide-react';
import { MarkdownField } from '@/components/ui/markdown-field';

// Lazy load the heavy dialog component
const TranscriptEditorDialog = lazy(() =>
  import('@/components/dialogs/TranscriptEditorDialog').then((m) => ({
    default: m.TranscriptEditorDialog,
  }))
);

interface ResourceTranscriptCardProps {
  /** Current transcript content (markdown) */
  transcript: string;
  /** Callback when transcript is saved */
  onSave: (transcript: string) => Promise<void>;
}

export function ResourceTranscriptCard({ transcript, onSave }: ResourceTranscriptCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const hasContent = transcript && transcript.trim().length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Transcript
              </CardTitle>
              <CardDescription>Full text transcript of the video</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              {hasContent ? 'Edit' : 'Add Transcript'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {hasContent ? (
            <MarkdownField value={transcript} />
          ) : (
            <div className="text-sm text-muted-foreground italic">
              No transcript available. Click "Add Transcript" to add one manually.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lazy-loaded dialog - only renders when opened */}
      {isDialogOpen && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          }
        >
          <TranscriptEditorDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            initialValue={transcript}
            onSave={onSave}
            title="Edit Transcript"
            description="Edit the transcript of this video"
          />
        </Suspense>
      )}
    </>
  );
}
