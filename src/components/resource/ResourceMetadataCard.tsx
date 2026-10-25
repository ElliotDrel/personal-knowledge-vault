/**
 * Resource Metadata Card Component
 *
 * Displays resource metadata in a card with an "Edit" button that opens the metadata dialog.
 * Handles all metadata editing logic in isolation from the parent ResourceDetail component.
 *
 * Features:
 * - Read-only display of metadata fields
 * - Edit button triggers MetadataEditorDialog
 * - Type-specific field rendering (video, article, short-video)
 * - Clean separation of concerns
 */

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Loader2 } from 'lucide-react';
import type { Resource } from '@/data/storageAdapter';

// Lazy load the heavy dialog component
const MetadataEditorDialog = lazy(() =>
  import('@/components/dialogs/MetadataEditorDialog').then((m) => ({
    default: m.MetadataEditorDialog,
  }))
);

interface ResourceMetadataCardProps {
  /** The resource to display metadata for */
  resource: Resource;
  /** Callback when metadata is saved - receives processed updates */
  onSave: (updates: Partial<Resource>) => Promise<void>;
}

export function ResourceMetadataCard({ resource, onSave }: ResourceMetadataCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Convert resource data to form format for the dialog
  const formValues = {
    title: resource.title || '',
    description: resource.description || '',
    tags: resource.tags?.join(', ') || '',
    author: resource.author || '',
    creator: resource.creator || '',
    platform: resource.platform || '',
    year: resource.year ? resource.year.toString() : '',
    duration: resource.duration || '',
    url: resource.url || '',
    channelName: resource.channelName || '',
    handle: resource.handle || '',
    viewCount: typeof resource.viewCount === 'number' ? resource.viewCount.toString() : '',
    hashtags: resource.hashtags?.join(', ') || '',
  };

  // Handle save from dialog - convert form data back to resource format
  const handleSave = async (updates: Partial<typeof formValues>) => {
    const processedUpdates: Partial<Resource> = {};

    if (updates.title !== undefined) processedUpdates.title = updates.title.trim();
    if (updates.description !== undefined) processedUpdates.description = updates.description.trim();
    if (updates.tags !== undefined) {
      processedUpdates.tags = updates.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    // Type-specific fields
    if (updates.author) processedUpdates.author = updates.author.trim();
    if (updates.creator) processedUpdates.creator = updates.creator.trim();
    if (updates.platform) processedUpdates.platform = updates.platform.trim();
    if (updates.year) processedUpdates.year = parseInt(updates.year);
    if (updates.duration) processedUpdates.duration = updates.duration.trim();
    if (updates.url) processedUpdates.url = updates.url.trim();

    // Short-video fields
    if (updates.channelName) processedUpdates.channelName = updates.channelName.trim();
    if (updates.handle) processedUpdates.handle = updates.handle.trim();
    if (updates.viewCount) processedUpdates.viewCount = parseInt(updates.viewCount);
    if (updates.hashtags) {
      processedUpdates.hashtags = updates.hashtags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    await onSave(processedUpdates);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Basic information and metadata about this resource</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Title</div>
              <div className="font-medium">{resource.title || 'No title'}</div>
            </div>

            {/* Description */}
            {resource.description && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
                <div className="text-sm">{resource.description}</div>
              </div>
            )}

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* URL (for videos/short-videos) */}
            {resource.url && (resource.type === 'video' || resource.type === 'short-video') && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">URL</div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {resource.url}
                </a>
              </div>
            )}

            {/* Platform (for videos/short-videos) */}
            {resource.platform && (resource.type === 'video' || resource.type === 'short-video') && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Platform</div>
                <div className="text-sm">{resource.platform}</div>
              </div>
            )}

            {/* Author (for articles/books) */}
            {resource.author && (resource.type === 'article' || resource.type === 'book') && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Author</div>
                <div className="text-sm">{resource.author}</div>
              </div>
            )}

            {/* Creator (for videos/short-videos) */}
            {resource.creator && (resource.type === 'video' || resource.type === 'short-video') && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Creator</div>
                <div className="text-sm">{resource.creator}</div>
              </div>
            )}

            {/* Channel Name (short-videos) */}
            {resource.channelName && resource.type === 'short-video' && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Channel</div>
                <div className="text-sm">{resource.channelName}</div>
              </div>
            )}

            {/* Handle (short-videos) */}
            {resource.handle && resource.type === 'short-video' && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Handle</div>
                <div className="text-sm">{resource.handle}</div>
              </div>
            )}

            {/* Year */}
            {resource.year && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Year</div>
                <div className="text-sm">{resource.year}</div>
              </div>
            )}

            {/* Duration (videos/short-videos) */}
            {resource.duration && (resource.type === 'video' || resource.type === 'short-video') && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Duration</div>
                <div className="text-sm">{resource.duration}</div>
              </div>
            )}

            {/* View Count (short-videos) */}
            {typeof resource.viewCount === 'number' && resource.type === 'short-video' && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Views</div>
                <div className="text-sm">{resource.viewCount.toLocaleString()}</div>
              </div>
            )}

            {/* Hashtags (short-videos) */}
            {resource.hashtags && resource.hashtags.length > 0 && resource.type === 'short-video' && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Hashtags</div>
                <div className="flex flex-wrap gap-2">
                  {resource.hashtags.map((hashtag) => (
                    <Badge key={hashtag} variant="outline">
                      #{hashtag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          <MetadataEditorDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            initialValues={formValues}
            resourceType={resource.type}
            onSave={handleSave}
          />
        </Suspense>
      )}
    </>
  );
}
