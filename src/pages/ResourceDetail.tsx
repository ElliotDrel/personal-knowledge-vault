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
import { NotesEditorDialog } from '@/components/NotesEditorDialog';
import { TranscriptEditorDialog } from '@/components/dialogs/TranscriptEditorDialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
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
import { parseTimestamp } from '@/utils/timestamp';
import { getResourceBadgeClasses } from '@/utils/resourceTypeStyles';

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { resources, upsertResource } = useResources();
  const storageAdapter = useStorageAdapter();
  const navigate = useNavigate();

  const resource = useMemo(
    () => (id ? resources.find((item) => item.id === id) ?? null : null),
    [resources, id]
  );
  const resourceId = resource?.id ?? null;

  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);
  const [notes, setNotes] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isNotesDialogDirty, setIsNotesDialogDirty] = useState(false);
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
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
    if (!resource) {
      setNotes('');
      if (!isTranscriptDialogOpen) {
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

    const resourceTimestamp = parseTimestamp(resource.updatedAt);

    // Sync notes unless the dialog currently has unsaved edits
    if (!isNotesDialogOpen && !isNotesDialogDirty) {
      const notesSavedTimestamp = parseTimestamp(notesLastSavedAt);
      const shouldSyncNotes =
        resourceTimestamp === null ||
        notesSavedTimestamp === null ||
        resourceTimestamp >= notesSavedTimestamp;

      if (shouldSyncNotes) {
        setNotes(resource.notes || '');
      }
    }

    if (!isTranscriptDialogOpen) {
      const lastSavedTimestamp = parseTimestamp(lastSavedAt);
      const shouldSyncTranscript =
        resourceTimestamp === null ||
        lastSavedTimestamp === null ||
        resourceTimestamp >= lastSavedTimestamp;

      if (shouldSyncTranscript) {
        setTranscript(resource.transcript || '');
      }
    }

    if (!isEditingMetadata) {
      const metadataSavedTimestamp = parseTimestamp(metadataLastSavedAt);
      const shouldSyncMetadata =
        resourceTimestamp === null ||
        metadataSavedTimestamp === null ||
        resourceTimestamp >= metadataSavedTimestamp;

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
      }
    }
  }, [
    resource,
    isTranscriptDialogOpen,
    isEditingMetadata,
    transcript,
    notes,
    lastSavedAt,
    notesLastSavedAt,
    metadataLastSavedAt,
    isNotesDialogOpen,
    isNotesDialogDirty
  ]);

  useEffect(() => {
    if (!resourceId) {
      setCommentCount(0);
      return;
    }

    let isActive = true;

    const loadCommentCount = async () => {
      try {
        const activeComments = await storageAdapter.getComments(resourceId, 'active');
        if (isActive) {
          setCommentCount(activeComments.length);
        }
      } catch (err) {
        console.error('[ResourceDetail] Error loading comment count:', err);
        if (isActive) {
          setCommentCount(0);
        }
      }
    };

    loadCommentCount();

    return () => {
      isActive = false;
    };
  }, [resourceId, storageAdapter]);

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

  const handleSaveNotes = async (value: string) => {
    if (!resource) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await storageAdapter.updateResource(resource.id, { notes: value });
      setNotes(result.notes || '');
      setNotesLastSavedAt(result.updatedAt ?? new Date().toISOString());
      upsertResource(result);
    } catch (err) {
      console.error('[ResourceDetail] handleSaveNotes: Error saving notes:', err);
      setError('Failed to save notes');
      throw err; // Re-throw so dialog knows save failed
    } finally {
      setLoading(false);
    }
  };

  const handleNotesDialogOpenChange = (open: boolean) => {
    if (open) {
      setNotesLastSavedAt(resource?.updatedAt ?? null);
    } else {
      setIsNotesDialogDirty(false);
    }
    setIsNotesDialogOpen(open);
  };

  const handleSaveTranscript = async (value: string) => {
    if (!resource) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await storageAdapter.updateResource(resource.id, { transcript: value });
      setTranscript(result.transcript || '');
      setLastSavedAt(result.updatedAt ?? new Date().toISOString());
      upsertResource(result);
    } catch (err) {
      console.error('[ResourceDetail] handleSaveTranscript: Error saving transcript:', err);
      setError('Failed to save transcript');
      throw err; // Re-throw so dialog can handle error state
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadataForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMetadata = async () => {
    if (!resource) {
      return;
    }

    // Validation
    if (!metadataForm.title.trim()) {
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

      const result = await storageAdapter.updateResource(resource.id, updatedData);
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
      setError('Failed to save metadata');
    } finally {
      setLoading(false);
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
                    getResourceBadgeClasses(config.color)
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
                          <p className="font-reading text-base">{resource.author}</p>
                        </div>
                      </div>
                    )}
                    {resource.creator && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Creator</p>
                          <p className="font-reading text-base">{resource.creator}</p>
                        </div>
                      </div>
                    )}
                    {resource.duration && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-reading text-base">{resource.duration}</p>
                        </div>
                      </div>
                    )}
                    {resource.year && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Year</p>
                          <p className="font-reading text-base">{resource.year}</p>
                        </div>
                      </div>
                    )}
                    {/* Short-video specific fields in display mode */}
                    {resource.channelName && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Channel</p>
                          <p className="font-reading text-base">{resource.channelName}</p>
                        </div>
                      </div>
                    )}
                    {resource.handle && (
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Handle</p>
                          <p className="font-reading text-base">@{resource.handle}</p>
                        </div>
                      </div>
                    )}
                    {resource.viewCount && (
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 text-muted-foreground">👁</span>
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="font-reading text-base">{resource.viewCount.toLocaleString()}</p>
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
                variant="outline"
                onClick={() => handleNotesDialogOpenChange(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
                {commentCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {commentCount}
                  </Badge>
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
              placeholder="Click Edit to start writing... Use markdown formatting."
              minHeight={400}
              textareaClassName="font-reading text-base leading-relaxed"
              readOnly={true}
            />
          </CardContent>
        </Card>

        {/* Notes Editor Dialog */}
        <NotesEditorDialog
          open={isNotesDialogOpen}
          onOpenChange={handleNotesDialogOpenChange}
          initialValue={notes}
          onSave={handleSaveNotes}
          isLoading={loading}
          onDirtyChange={setIsNotesDialogDirty}
          resourceId={resource.id}
          onCommentCountChange={setCommentCount}
        />

        {/* Transcript Editor Dialog */}
        <TranscriptEditorDialog
          open={isTranscriptDialogOpen}
          onOpenChange={setIsTranscriptDialogOpen}
          initialValue={transcript}
          onSave={handleSaveTranscript}
          isLoading={loading}
        />

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
                  variant="outline"
                  onClick={() => setIsTranscriptDialogOpen(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Transcript
                </Button>
              </div>
              <CardDescription>
                Full transcript or key quotes from the {resource.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 max-h-[400px] overflow-y-auto">
                {transcript ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none font-reading text-base leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {transcript}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-center py-8">
                    No transcript available. Click Edit Transcript to add one.
                  </div>
                )}
              </div>
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
