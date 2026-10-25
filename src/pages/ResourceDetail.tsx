/**
 * ResourceDetail Component (Refactored)
 *
 * Simplified orchestrator that delegates to specialized card components.
 *
 * Features:
 * - Metadata, notes, and transcript cards handle their own editing dialogs
 * - Auto-save, navigation protection, and unload protection handled by cards
 * - Clean separation of concerns
 * - Reduced from ~1114 lines to ~320 lines
 *
 * @component
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Resource card components (handle their own dialogs and lazy loading)
import { ResourceMetadataCard } from '@/components/resource/ResourceMetadataCard';
import { ResourceNotesCard } from '@/components/resource/ResourceNotesCard';
import { ResourceTranscriptCard } from '@/components/resource/ResourceTranscriptCard';

import { useStorageAdapter, type ResourceTypeConfig, type Resource } from '@/data/storageAdapter';
import { useResources } from '@/hooks/use-resources';
import {
  ArrowLeft,
  ExternalLink,
  Share,
  Calendar,
  User,
  Clock,
  Tag,
  Trash2,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { parseTimestamp } from '@/utils/timestamp';
import { getResourceBadgeClasses } from '@/utils/resourceTypeStyles';

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const storageAdapter = useStorageAdapter();
  const { resources, upsertResource, removeResource } = useResources();

  // Local state
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [commentCount, setCommentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);

  // Save request tracking to ignore stale responses
  const notesSaveRequestIdRef = useRef(0);
  const transcriptSaveRequestIdRef = useRef(0);

  // Find current resource from global state
  const resource = useMemo(() => {
    return resources.find((r) => r.id === id);
  }, [resources, id]);

  // Load resource type config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await storageAdapter.getResourceTypeConfig();
        setResourceTypeConfig(config);
      } catch (err) {
        console.error('Error loading resource type config:', err);
      }
    };
    loadConfig();
  }, [storageAdapter]);

  // Sync local state with resource data
  useEffect(() => {
    if (!resource) {
      setNotes('');
      setTranscript('');
      return;
    }

    setNotes(resource.notes || '');
    setTranscript(resource.transcript || '');
  }, [resource]);

  // Get type-specific config
  const config = useMemo(() => {
    if (!resource || !resourceTypeConfig) {
      return {
        icon: '📄',
        label: 'Resources',
        color: 'default' as const,
      };
    }
    return resourceTypeConfig[resource.type] || resourceTypeConfig.default;
  }, [resource, resourceTypeConfig]);

  // Handle notes save
  const handleNotesSave = async (newNotes: string) => {
    if (!resource) return;
    const requestId = ++notesSaveRequestIdRef.current;

    try {
      const result = await storageAdapter.updateResource(resource.id, { notes: newNotes });

      if (requestId !== notesSaveRequestIdRef.current) {
        console.warn('[ResourceDetail] Ignoring stale notes save response');
        return;
      }

      if (result.success && result.data) {
        setNotes(result.data.notes || '');
        upsertResource(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to update notes');
      }
    } catch (err) {
      console.error('[ResourceDetail] Error saving notes:', err);
      throw err; // Let card handle error display
    }
  };

  // Handle transcript save
  const handleTranscriptSave = async (newTranscript: string) => {
    if (!resource) return;
    const requestId = ++transcriptSaveRequestIdRef.current;

    try {
      const result = await storageAdapter.updateResource(resource.id, { transcript: newTranscript });

      if (requestId !== transcriptSaveRequestIdRef.current) {
        console.warn('[ResourceDetail] Ignoring stale transcript save response');
        return;
      }

      if (result.success && result.data) {
        setTranscript(result.data.transcript || '');
        upsertResource(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to update transcript');
      }
    } catch (err) {
      console.error('[ResourceDetail] Error saving transcript:', err);
      throw err; // Let card handle error display
    }
  };

  // Handle metadata save
  const handleMetadataSave = async (updates: Partial<Resource>) => {
    if (!resource) return;

    try {
      const updatedResource = await storageAdapter.updateResource(resource.id, updates);
      upsertResource(updatedResource);
    } catch (err) {
      console.error('[ResourceDetail] Error saving metadata:', err);
      throw err; // Let card handle error display
    }
  };

  // Handle resource deletion
  const handleDelete = async () => {
    if (!resource) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await storageAdapter.deleteResource(resource.id);

      if (result.success) {
        removeResource(resource.id);
        navigate('/dashboard/resources');
      } else {
        throw new Error(result.error?.message || 'Failed to delete resource');
      }
    } catch (err) {
      console.error('Error deleting resource:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete resource');
      setIsDeleting(false);
    }
  };

  // Loading state
  if (!resource) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard/resources">
            <Button variant="ghost" size="sm" className="mb-4 hover:bg-accent-soft transition-smooth">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resources
            </Button>
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">{config.icon}</span>
                <Badge
                  variant="secondary"
                  className={cn('font-medium', getResourceBadgeClasses(config.color))}
                >
                  {config.label.slice(0, -1)}
                </Badge>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-reading">
                {resource.title}
              </h1>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Button size="sm" variant="outline">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              {resource.url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </a>
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-8">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quick Info Bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {resource.createdAt && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Added {parseTimestamp(resource.createdAt)}
              </div>
            )}
            {resource.updatedAt && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Updated {parseTimestamp(resource.updatedAt)}
              </div>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Content Cards */}
        <div className="space-y-8">
          {/* Metadata Card */}
          <ResourceMetadataCard resource={resource} onSave={handleMetadataSave} />

          {/* Notes Card */}
          <ResourceNotesCard
            resourceId={resource.id}
            notes={notes}
            commentCount={commentCount}
            onSave={handleNotesSave}
            onCommentCountChange={setCommentCount}
          />

          {/* Transcript Card (only for video types) */}
          {(resource.type === 'video' || resource.type === 'short-video') && (
            <ResourceTranscriptCard transcript={transcript} onSave={handleTranscriptSave} />
          )}

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage this resource</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Resource
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the resource and all
                      associated data including notes, comments, and transcripts.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ResourceDetail;
