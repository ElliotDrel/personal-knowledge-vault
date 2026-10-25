/**
 * ResourceDetail Component
 *
 * Displays detailed view of a single resource with editing capabilities.
 * Features include:
 * - Inline editing of metadata, notes, and transcripts
 * - Type-specific field display based on resource type configuration
 * - Real-time persistence through hybrid storage adapter
 * - Delete functionality with confirmation dialog
 *
 * @component
 */

import { useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownField } from '@/components/ui/markdown-field';
import { useStorageAdapter, type ResourceTypeConfig } from '@/data/storageAdapter';
import { useResources } from '@/hooks/use-resources';
import {
  ArrowLeft,
  ExternalLink,
  Share,
  Edit,
  Calendar,
  User,
  Clock,
  Tag,
  FileText,
  Mic,
  Save,
  AlertTriangle,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { resources, upsertResource } = useResources();
  const storageAdapter = useStorageAdapter();
  const navigate = useNavigate();

  const resource = useMemo(
    () => (id ? resources.find((item) => item.id === id) ?? null : null),
    [resources, id]
  );

  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [notesLastSavedAt, setNotesLastSavedAt] = useState<string | null>(null);

  // Delete functionality state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load resource type config on mount
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

  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadataLastSavedAt, setMetadataLastSavedAt] = useState<string | null>(null);
  const [metadataForm, setMetadataForm] = useState({
    title: '',
    description: '',
    tags: '',
    // Type-specific fields
    author: '',
    creator: '',
    platform: '',
    year: '',
    duration: '',
    url: '',
    // Short-video specific fields
    channelName: '',
    handle: '',
    viewCount: '',
    hashtags: ''
  });

  // Description truncation state
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    console.log('[ResourceDetail] useEffect: Resource state sync triggered', {
      resourceId: resource?.id,
      hasResource: !!resource,
      isEditingTranscript,
      isEditingNotes,
      isEditingMetadata,
      resourceTranscriptLength: resource?.transcript?.length,
      resourceTranscriptPreview: resource?.transcript?.substring(0, 100),
      localTranscriptLength: transcript.length,
      localTranscriptPreview: transcript.substring(0, 100),
      lastSavedAt,
      notesLastSavedAt,
      metadataLastSavedAt
    });

    if (!resource) {
      console.log('[ResourceDetail] useEffect: No resource, clearing state');
      setNotes('');
      if (!isEditingTranscript) {
        setTranscript('');
      }
      if (!isEditingMetadata) {
        setMetadataForm({
          title: '',
          description: '',
          tags: '',
          author: '',
          creator: '',
          platform: '',
          year: '',
          duration: '',
          url: '',
          channelName: '',
          handle: '',
          viewCount: '',
          hashtags: ''
        });
      }
      setLastSavedAt(null);
      setNotesLastSavedAt(null);
      setMetadataLastSavedAt(null);
      return;
    }

    if (!isEditingNotes) {
      const resourceTimestamp = resource.updatedAt ? Date.parse(resource.updatedAt) : NaN;
      const notesSavedTimestamp = notesLastSavedAt ? Date.parse(notesLastSavedAt) : NaN;
      const shouldSyncNotes =
        Number.isNaN(notesSavedTimestamp) ||
        Number.isNaN(resourceTimestamp) ||
        resourceTimestamp >= notesSavedTimestamp;

      console.log('[ResourceDetail] useEffect: Evaluating notes sync', {
        fromLength: notes.length,
        toLength: resource.notes?.length || 0,
        willUpdate: notes !== (resource.notes || ''),
        resourceTimestamp,
        notesSavedTimestamp,
        shouldSyncNotes
      });

      if (shouldSyncNotes) {
        setNotes(resource.notes || '');
      } else {
        console.log('[ResourceDetail] useEffect: Skipping notes sync due to newer local value');
      }
    } else {
      console.log('[ResourceDetail] useEffect: Skipping notes sync (currently editing)');
    }

    if (!isEditingTranscript) {
      const resourceTimestamp = resource.updatedAt ? Date.parse(resource.updatedAt) : NaN;
      const lastSavedTimestamp = lastSavedAt ? Date.parse(lastSavedAt) : NaN;
      const shouldSyncTranscript =
        Number.isNaN(lastSavedTimestamp) ||
        Number.isNaN(resourceTimestamp) ||
        resourceTimestamp >= lastSavedTimestamp;

      console.log('[ResourceDetail] useEffect: Evaluating transcript sync', {
        fromLength: transcript.length,
        toLength: resource.transcript?.length || 0,
        willUpdate: transcript !== (resource.transcript || ''),
        resourceTimestamp,
        lastSavedTimestamp,
        shouldSyncTranscript
      });

      if (shouldSyncTranscript) {
        setTranscript(resource.transcript || '');
      } else {
        console.log('[ResourceDetail] useEffect: Skipping transcript sync due to newer local value');
      }
    } else {
      console.log('[ResourceDetail] useEffect: Skipping transcript sync (currently editing)');
    }

    if (!isEditingMetadata) {
      const resourceTimestamp = resource.updatedAt ? Date.parse(resource.updatedAt) : NaN;
      const metadataSavedTimestamp = metadataLastSavedAt ? Date.parse(metadataLastSavedAt) : NaN;
      const shouldSyncMetadata =
        Number.isNaN(metadataSavedTimestamp) ||
        Number.isNaN(resourceTimestamp) ||
        resourceTimestamp >= metadataSavedTimestamp;

      console.log('[ResourceDetail] useEffect: Evaluating metadata sync', {
        resourceTimestamp,
        metadataSavedTimestamp,
        shouldSyncMetadata
      });

      if (shouldSyncMetadata) {
        setMetadataForm({
          title: resource.title || '',
          description: resource.description || '',
          tags: resource.tags?.join(', ') || '',
          author: resource.author || '',
          creator: resource.creator || '',
          platform: resource.platform || '',
          year: resource.year?.toString() || '',
          duration: resource.duration || '',
          url: resource.url || '',
          channelName: resource.channelName || '',
          handle: resource.handle || '',
          viewCount: resource.viewCount?.toString() || '',
          hashtags: resource.hashtags?.join(', ') || ''
        });
      } else {
        console.log('[ResourceDetail] useEffect: Skipping metadata sync due to newer local value');
      }
    } else {
      console.log('[ResourceDetail] useEffect: Skipping metadata sync (currently editing)');
    }
  }, [
    resource,
    isEditingTranscript,
    isEditingMetadata,
    isEditingNotes,
    transcript,
    notes,
    lastSavedAt,
    notesLastSavedAt,
    metadataLastSavedAt
  ]);

  if (!resource || !resourceTypeConfig) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">
              {!resource ? 'Resource not found' : 'Loading...'}
            </h1>
            <Link to="/resources">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const config = resourceTypeConfig[resource.type];

  const handleSaveNotes = async () => {
    if (!resource) {
      console.log('[ResourceDetail] handleSaveNotes: No resource found');
      return;
    }

    console.log('[ResourceDetail] handleSaveNotes: Starting save process', {
      resourceId: resource.id,
      notesLength: notes.length,
      notesPreview: notes.substring(0, 100)
    });

    setLoading(true);
    setError(null);
    try {
      console.log('[ResourceDetail] handleSaveNotes: Calling storageAdapter.updateResource');
      const result = await storageAdapter.updateResource(resource.id, { notes });
      console.log('[ResourceDetail] handleSaveNotes: Update successful', { result });
      setNotes(result.notes || '');
      setNotesLastSavedAt(result.updatedAt ?? new Date().toISOString());
      upsertResource(result);
      setIsEditingNotes(false);
    } catch (err) {
      console.error('[ResourceDetail] handleSaveNotes: Error saving notes:', err);
      console.error('[ResourceDetail] handleSaveNotes: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError('Failed to save notes');
    } finally {
      setLoading(false);
      console.log('[ResourceDetail] handleSaveNotes: Finished (loading=false)');
    }
  };

  const handleSaveTranscript = async () => {
    if (!resource) {
      console.log('[ResourceDetail] handleSaveTranscript: No resource found');
      return;
    }

    console.log('[ResourceDetail] handleSaveTranscript: Starting save process', {
      resourceId: resource.id,
      transcriptLength: transcript.length,
      transcriptPreview: transcript.substring(0, 100)
    });

    setLoading(true);
    setError(null);
    try {
      console.log('[ResourceDetail] handleSaveTranscript: Calling storageAdapter.updateResource');
      const result = await storageAdapter.updateResource(resource.id, { transcript });
      console.log('[ResourceDetail] handleSaveTranscript: Update successful', { result });
      setTranscript(result.transcript || '');
      setLastSavedAt(result.updatedAt ?? new Date().toISOString());
      upsertResource(result);
      setIsEditingTranscript(false);
    } catch (err) {
      console.error('[ResourceDetail] handleSaveTranscript: Error saving transcript:', err);
      console.error('[ResourceDetail] handleSaveTranscript: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError('Failed to save transcript');
    } finally {
      setLoading(false);
      console.log('[ResourceDetail] handleSaveTranscript: Finished (loading=false)');
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadataForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMetadata = async () => {
    if (!resource) {
      console.log('[ResourceDetail] handleSaveMetadata: No resource found');
      return;
    }

    console.log('[ResourceDetail] handleSaveMetadata: Starting save process', {
      resourceId: resource.id,
      resourceType: resource.type,
      formData: metadataForm
    });

    // Validation
    if (!metadataForm.title.trim()) {
      console.warn('[ResourceDetail] handleSaveMetadata: Validation failed - title is empty');
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Process form data
      const updatedData: Partial<typeof resource> = {
        title: metadataForm.title.trim(),
        description: metadataForm.description.trim(),
        tags: metadataForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      // Add type-specific fields if they have values
      if (metadataForm.author) updatedData.author = metadataForm.author.trim();
      if (metadataForm.creator) updatedData.creator = metadataForm.creator.trim();
      if (metadataForm.platform) updatedData.platform = metadataForm.platform.trim();
      if (metadataForm.year) updatedData.year = parseInt(metadataForm.year);
      if (metadataForm.duration) updatedData.duration = metadataForm.duration.trim();
      if (metadataForm.url) updatedData.url = metadataForm.url.trim();

      // Add short-video specific fields if they have values
      if (metadataForm.channelName) updatedData.channelName = metadataForm.channelName.trim();
      if (metadataForm.handle) updatedData.handle = metadataForm.handle.trim();
      if (metadataForm.viewCount) updatedData.viewCount = parseInt(metadataForm.viewCount);
      if (metadataForm.hashtags) {
        updatedData.hashtags = metadataForm.hashtags.split(',').map(tag => tag.trim()).filter(Boolean);
      }

      console.log('[ResourceDetail] handleSaveMetadata: Processed update data', updatedData);
      console.log('[ResourceDetail] handleSaveMetadata: Calling storageAdapter.updateResource');

      const result = await storageAdapter.updateResource(resource.id, updatedData);

      console.log('[ResourceDetail] handleSaveMetadata: Update successful', { result });

      const nextMetadataForm = {
        title: result.title || '',
        description: result.description || '',
        tags: result.tags?.join(', ') || '',
        author: result.author || '',
        creator: result.creator || '',
        platform: result.platform || '',
        year: result.year ? result.year.toString() : '',
        duration: result.duration || '',
        url: result.url || '',
        channelName: result.channelName || '',
        handle: result.handle || '',
        viewCount: typeof result.viewCount === 'number' ? result.viewCount.toString() : '',
        hashtags: result.hashtags?.join(', ') || ''
      };

      setMetadataForm(nextMetadataForm);
      setMetadataLastSavedAt(result.updatedAt ?? new Date().toISOString());
      upsertResource(result);
      setIsEditingMetadata(false);
    } catch (err) {
      console.error('[ResourceDetail] handleSaveMetadata: Error saving metadata:', err);
      console.error('[ResourceDetail] handleSaveMetadata: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError('Failed to save metadata');
    } finally {
      setLoading(false);
      console.log('[ResourceDetail] handleSaveMetadata: Finished (loading=false)');
    }
  };

  const handleDelete = async () => {
    if (!resource) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await storageAdapter.deleteResource(resource.id);
      // Navigate to resources list on success
      navigate('/resources');
    } catch (err) {
      console.error('Error deleting resource:', err);
      // Keep dialog open, show error, allow retry
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete resource. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/resources">
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
                  className={cn(
                    "font-medium",
                    `bg-${config.color}/10 text-${config.color} border-${config.color}/20`
                  )}
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

          {/* Metadata */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>Resource Information</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant={isEditingMetadata ? "default" : "outline"}
                onClick={() => {
                  if (isEditingMetadata) {
                    handleSaveMetadata();
                  } else {
                    setMetadataLastSavedAt(resource?.updatedAt ?? null);
                    setIsEditingMetadata(true);
                  }
                }}
                >
                  {isEditingMetadata ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Basic information and metadata about this resource
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingMetadata ? (
                // Edit mode - Form fields
                <div className="space-y-4">
                  {/* First row: Title & Platform */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Title - always shown */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        value={metadataForm.title}
                        onChange={(e) => handleMetadataChange('title', e.target.value)}
                        placeholder="Resource title"
                        required
                      />
                    </div>

                    {config.fields.includes('platform') && (
                      <div className="space-y-2">
                        <Label htmlFor="platform" className="text-sm font-medium">
                          Platform
                        </Label>
                        <Input
                          id="platform"
                          value={metadataForm.platform}
                          onChange={(e) => handleMetadataChange('platform', e.target.value)}
                          placeholder="Platform or source"
                        />
                      </div>
                    )}
                  </div>

                  {/* Second row: Description - full width */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={metadataForm.description}
                      onChange={(e) => handleMetadataChange('description', e.target.value)}
                      placeholder="Brief description"
                      rows={3}
                    />
                  </div>

                  {/* Remaining fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dynamic fields based on resource type */}
                    {config.fields.includes('author') && (
                      <div className="space-y-2">
                        <Label htmlFor="author" className="text-sm font-medium">
                          Author
                        </Label>
                        <Input
                          id="author"
                          value={metadataForm.author}
                          onChange={(e) => handleMetadataChange('author', e.target.value)}
                          placeholder="Author name"
                        />
                      </div>
                    )}

                    {config.fields.includes('creator') && (
                      <div className="space-y-2">
                        <Label htmlFor="creator" className="text-sm font-medium">
                          Creator
                        </Label>
                        <Input
                          id="creator"
                          value={metadataForm.creator}
                          onChange={(e) => handleMetadataChange('creator', e.target.value)}
                          placeholder="Creator name"
                        />
                      </div>
                    )}

                    {config.fields.includes('year') && (
                      <div className="space-y-2">
                        <Label htmlFor="year" className="text-sm font-medium">
                          Year
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          value={metadataForm.year}
                          onChange={(e) => handleMetadataChange('year', e.target.value)}
                          placeholder="Publication year"
                        />
                      </div>
                    )}

                    {config.fields.includes('duration') && (
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-sm font-medium">
                          Duration
                        </Label>
                        <Input
                          id="duration"
                          value={metadataForm.duration}
                          onChange={(e) => handleMetadataChange('duration', e.target.value)}
                          placeholder="e.g., 1h 30m"
                        />
                      </div>
                    )}

                    {config.fields.includes('url') && (
                      <div className="space-y-2">
                        <Label htmlFor="url" className="text-sm font-medium">
                          URL
                        </Label>
                        <Input
                          id="url"
                          type="url"
                          value={metadataForm.url}
                          onChange={(e) => handleMetadataChange('url', e.target.value)}
                          placeholder="Resource URL"
                        />
                      </div>
                    )}

                    {/* Short-video specific fields */}
                    {config.fields.includes('channelName') && (
                      <div className="space-y-2">
                        <Label htmlFor="channelName" className="text-sm font-medium">
                          Channel Name
                        </Label>
                        <Input
                          id="channelName"
                          value={metadataForm.channelName}
                          onChange={(e) => handleMetadataChange('channelName', e.target.value)}
                          placeholder="YouTube channel name"
                        />
                      </div>
                    )}

                    {config.fields.includes('handle') && (
                      <div className="space-y-2">
                        <Label htmlFor="handle" className="text-sm font-medium">
                          Handle
                        </Label>
                        <Input
                          id="handle"
                          value={metadataForm.handle}
                          onChange={(e) => handleMetadataChange('handle', e.target.value)}
                          placeholder="@username"
                        />
                      </div>
                    )}

                    {config.fields.includes('viewCount') && (
                      <div className="space-y-2">
                        <Label htmlFor="viewCount" className="text-sm font-medium">
                          View Count
                        </Label>
                        <Input
                          id="viewCount"
                          type="number"
                          value={metadataForm.viewCount}
                          onChange={(e) => handleMetadataChange('viewCount', e.target.value)}
                          placeholder="Number of views"
                        />
                      </div>
                    )}
                  </div>

                  {/* Hashtags - for short-video */}
                  {config.fields.includes('hashtags') && (
                    <div className="space-y-2">
                      <Label htmlFor="hashtags" className="text-sm font-medium">
                        Hashtags
                      </Label>
                      <Input
                        id="hashtags"
                        value={metadataForm.hashtags}
                        onChange={(e) => handleMetadataChange('hashtags', e.target.value)}
                        placeholder="Enter hashtags separated by commas"
                      />
                    </div>
                  )}

                  {/* Tags - always shown */}
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={metadataForm.tags}
                      onChange={(e) => handleMetadataChange('tags', e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                  </div>
                </div>
              ) : (
                // Display mode - Current format
                <>
                  {/* Description Section - Truncated with expand/collapse */}
                  {resource.description && (
                    <>
                      <div
                        className="mb-4 cursor-pointer group"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      >
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p
                          className={cn(
                            "text-base font-reading leading-relaxed transition-all",
                            !isDescriptionExpanded && "line-clamp-1",
                            "group-hover:text-foreground/80"
                          )}
                        >
                          {resource.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 group-hover:text-primary transition-colors">
                          Click to {isDescriptionExpanded ? 'collapse' : 'expand'}
                        </p>
                      </div>
                      <Separator className="mb-4" />
                    </>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {resource.author && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Author</p>
                          <p className="font-medium">{resource.author}</p>
                        </div>
                      </div>
                    )}
                    {resource.creator && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Creator</p>
                          <p className="font-medium">{resource.creator}</p>
                        </div>
                      </div>
                    )}
                    {resource.duration && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-medium">{resource.duration}</p>
                        </div>
                      </div>
                    )}
                    {resource.year && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Year</p>
                          <p className="font-medium">{resource.year}</p>
                        </div>
                      </div>
                    )}
                    {/* Short-video specific fields in display mode */}
                    {resource.channelName && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Channel</p>
                          <p className="font-medium">{resource.channelName}</p>
                        </div>
                      </div>
                    )}
                    {resource.handle && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Handle</p>
                          <p className="font-medium">@{resource.handle}</p>
                        </div>
                      </div>
                    )}
                    {resource.viewCount && (
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 text-muted-foreground">👁</span>
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="font-medium">{resource.viewCount.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hashtags for short-video */}
                  {resource.hashtags && resource.hashtags.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Hashtags</p>
                          <div className="flex flex-wrap gap-2">
                            {resource.hashtags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {resource.tags.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-2">
                          {resource.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes Section */}
        <Card className="mb-8 bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Your Notes</CardTitle>
              </div>
              <Button
                size="sm"
                variant={isEditingNotes ? "default" : "outline"}
                onClick={() => {
                  if (isEditingNotes) {
                    handleSaveNotes();
                  } else {
                    setNotesLastSavedAt(resource?.updatedAt ?? null);
                    setIsEditingNotes(true);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEditingNotes ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Capture your insights, key takeaways, and thoughts - markdown supported
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarkdownField
              value={notes}
              onChange={(value) => setNotes(value)}
              placeholder="Click Edit to start writing... Use markdown formatting."
              minHeight={400}
              className="font-reading text-base leading-relaxed"
              isEditing={isEditingNotes}
              readOnly={true}
            />
          </CardContent>
        </Card>

        {/* Transcript Section (for videos/podcasts/short-videos) */}
        {(resource.type === 'video' || resource.type === 'podcast' || resource.type === 'short-video') && (
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="w-5 h-5 text-primary" />
                  <CardTitle>Transcript</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant={isEditingTranscript ? "default" : "outline"}
                  onClick={() => {
                    if (isEditingTranscript) {
                      handleSaveTranscript();
                    } else {
                      setLastSavedAt(resource?.updatedAt ?? null);
                      setIsEditingTranscript(true);
                    }
                  }}
                >
                  {isEditingTranscript ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Full transcript or key quotes from the {resource.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingTranscript ? (
                <Textarea
                  value={transcript}
                  onChange={(e) => {
                    console.log('[ResourceDetail] Transcript onChange', {
                      oldLength: transcript.length,
                      newLength: e.target.value.length,
                      lengthDiff: e.target.value.length - transcript.length,
                      oldPreview: transcript.substring(0, 100),
                      newPreview: e.target.value.substring(0, 100),
                      oldEnd: transcript.substring(transcript.length - 50),
                      newEnd: e.target.value.substring(e.target.value.length - 50)
                    });
                    setTranscript(e.target.value);
                  }}
                  placeholder="Paste transcript or key quotes here..."
                  className="min-h-[300px] font-reading text-sm leading-relaxed resize-none"
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50 max-h-[400px] overflow-y-auto">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-reading">
                    {(() => {
                      console.log('[ResourceDetail] Rendering transcript display mode', {
                        transcriptLength: transcript.length,
                        transcriptPreview: transcript.substring(0, 100),
                        transcriptEnd: transcript.substring(transcript.length - 100),
                        resourceTranscriptLength: resource.transcript?.length || 0,
                        areEqual: transcript === (resource.transcript || '')
                      });
                      return transcript || (
                        <div className="text-muted-foreground italic text-center py-8">
                          No transcript available. Click Edit to add one.
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="mt-8 border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that permanently delete this resource
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Resource
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{resource.title}"?
                    This action is permanent and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Error state within dialog */}
                {deleteError && (
                  <Alert variant="destructive">
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ResourceDetail;
