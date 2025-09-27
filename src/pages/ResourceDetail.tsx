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
import { MarkdownEditor } from '@/components/ui/markdown-editor';
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
  const { resources } = useResources();
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
    url: ''
  });

  useEffect(() => {
    if (!resource) {
      if (!isEditingNotes) {
        setNotes('');
      }
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
          url: ''
        });
      }
      return;
    }

    if (!isEditingNotes) {
      setNotes(resource.notes || '');
    }

    if (!isEditingTranscript) {
      setTranscript(resource.transcript || '');
    }

    if (!isEditingMetadata) {
      setMetadataForm({
        title: resource.title || '',
        description: resource.description || '',
        tags: resource.tags?.join(', ') || '',
        author: resource.author || '',
        creator: resource.creator || '',
        platform: resource.platform || '',
        year: resource.year?.toString() || '',
        duration: resource.duration || '',
        url: resource.url || ''
      });
    }
  }, [resource, isEditingNotes, isEditingTranscript, isEditingMetadata]);

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
    if (!resource) return;
    setLoading(true);
    setError(null);
    try {
      await storageAdapter.updateResource(resource.id, { notes });
      console.log('Saved notes for resource:', resource.id);
      setIsEditingNotes(false);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTranscript = async () => {
    if (!resource) return;
    setLoading(true);
    setError(null);
    try {
      await storageAdapter.updateResource(resource.id, { transcript });
      console.log('Saved transcript for resource:', resource.id);
      setIsEditingTranscript(false);
    } catch (err) {
      console.error('Error saving transcript:', err);
      setError('Failed to save transcript');
    } finally {
      setLoading(false);
    }
  };

  const handleMetadataChange = (field: string, value: string) => {
    setMetadataForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMetadata = async () => {
    if (!resource) return;

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

      await storageAdapter.updateResource(resource.id, updatedData);
      console.log('Saved metadata for resource:', resource.id);
      setIsEditingMetadata(false);
    } catch (err) {
      console.error('Error saving metadata:', err);
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
      console.log('Successfully deleted resource:', resource.id);
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
              
              <p className="text-lg text-muted-foreground font-reading leading-relaxed">
                {resource.description}
              </p>
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

                    {/* Description - always shown */}
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
                  </div>

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
                  </div>
                  
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
                    setIsEditingNotes(true);
                  }
                }}
              >
                {isEditingNotes ? (
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
              Capture your insights, key takeaways, and thoughts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <MarkdownEditor
                value={notes}
                onChange={(value) => setNotes(value)}
                placeholder="Write your notes here... You can use markdown formatting."
                height={400}
                className="font-reading text-base leading-relaxed"
              />
            ) : (
              <div className="prose prose-slate max-w-none font-reading">
                <div className="whitespace-pre-wrap text-base leading-relaxed">
                  {notes || (
                    <div className="text-muted-foreground italic text-center py-8">
                      No notes yet. Click Edit to add your insights.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript Section (for videos/podcasts) */}
        {(resource.type === 'video' || resource.type === 'podcast') && (
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
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste transcript or key quotes here..."
                  className="min-h-[300px] font-reading text-sm leading-relaxed resize-none"
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-reading">
                    {transcript || (
                      <div className="text-muted-foreground italic text-center py-8">
                        No transcript available. Click Edit to add one.
                      </div>
                    )}
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
