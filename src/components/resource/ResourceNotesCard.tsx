/**
 * Resource Notes Card Component
 *
 * Displays resource notes with an "Edit" button that opens the notes editor dialog.
 * Handles notes display and editing in isolation from the parent component.
 *
 * Features:
 * - Markdown preview of notes
 * - Edit button triggers NotesEditorDialog
 * - Comment count badge
 * - Clean separation of concerns
 */

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, Loader2, MessageSquare } from 'lucide-react';
import { MarkdownField } from '@/components/ui/markdown-field';

// Lazy load the heavy dialog component
const NotesEditorDialog = lazy(() =>
  import('@/components/NotesEditorDialog').then((m) => ({
    default: m.NotesEditorDialog,
  }))
);

interface ResourceNotesCardProps {
  /** The resource ID */
  resourceId: string;
  /** Current notes content (markdown) */
  notes: string;
  /** Number of active comments */
  commentCount?: number;
  /** Callback when notes are saved */
  onSave: (notes: string) => Promise<void>;
  /** Callback when dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Callback when comment count changes */
  onCommentCountChange?: (count: number) => void;
}

export function ResourceNotesCard({
  resourceId,
  notes,
  commentCount = 0,
  onSave,
  onDirtyChange,
  onCommentCountChange,
}: ResourceNotesCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const hasContent = notes && notes.trim().length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                  {commentCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {commentCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Your personal notes and insights</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              {hasContent ? 'Edit' : 'Add Notes'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {hasContent ? (
            <MarkdownField value={notes} />
          ) : (
            <div className="text-sm text-muted-foreground italic">
              No notes yet. Click "Add Notes" to get started.
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
          <NotesEditorDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            resourceId={resourceId}
            initialValue={notes}
            onSave={onSave}
            onDirtyChange={onDirtyChange}
            onCommentCountChange={onCommentCountChange}
          />
        </Suspense>
      )}
    </>
  );
}
