/**
 * NewResource Component
 *
 * Form for creating new resources with dynamic field configuration.
 * Features include:
 * - Dynamic form fields based on resource type configuration
 * - Pre-selection of resource type via URL parameters
 * - Markdown editor for notes with live preview
 * - Transcript input for video/podcast resources
 * - Comprehensive validation and error handling
 * - Async storage with loading states
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStorageAdapter, type ResourceTypeConfig } from '@/data/storageAdapter';
import { ArrowLeft, Plus, Loader2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

const generateResourceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const NewResource = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storageAdapter = useStorageAdapter();

  const preSelectedType = (searchParams.get('type') as keyof ResourceTypeConfig | null) || null;
  const preFilledUrl = searchParams.get('url') || null;

  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configReloadToken, setConfigReloadToken] = useState(0);

  const [selectedType, setSelectedType] = useState<keyof ResourceTypeConfig | null>(preSelectedType);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    transcript: '',
    tags: '',
    // Dynamic fields based on resource type
    author: '',
    creator: '',
    platform: '',
    year: '',
    duration: '',
    url: preFilledUrl || '',
    isbn: '',
    episode: '',
    readTime: ''
  });

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const config = await storageAdapter.getResourceTypeConfig();
        if (!isMounted) {
          return;
        }
        setResourceTypeConfig(config);
      } catch (error) {
        console.error('Error loading resource type config:', error);
        if (!isMounted) {
          return;
        }
        setConfigError(error instanceof Error ? error.message : 'Failed to load resource type configuration');
        setResourceTypeConfig(null);
      } finally {
        if (isMounted) {
          setConfigLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [storageAdapter, configReloadToken]);

  useEffect(() => {
    if (!resourceTypeConfig) {
      return;
    }

    if (selectedType && resourceTypeConfig[selectedType]) {
      return;
    }

    if (preSelectedType && resourceTypeConfig[preSelectedType]) {
      setSelectedType(preSelectedType);
      return;
    }

    const firstType = Object.keys(resourceTypeConfig)[0] as keyof ResourceTypeConfig;
    setSelectedType(firstType);
  }, [resourceTypeConfig, preSelectedType, selectedType]);

  const selectedTypeConfig = selectedType && resourceTypeConfig
    ? resourceTypeConfig[selectedType]
    : null;

  const handleRetryConfig = () => {
    setConfigReloadToken((token) => token + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType || !formData.title.trim()) {
      setFormError('Please select a resource type and enter a title');
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      const resourceId = generateResourceId();
      const timestamp = new Date().toISOString();

      const newResource = {
        id: resourceId,
        type: selectedType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        notes: formData.notes.trim(),
        transcript: formData.transcript.trim(),
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        createdAt: timestamp,
        updatedAt: timestamp,
        // Add type-specific fields
        ...(formData.author && { author: formData.author.trim() }),
        ...(formData.creator && { creator: formData.creator.trim() }),
        ...(formData.platform && { platform: formData.platform.trim() }),
        ...(formData.year && { year: parseInt(formData.year, 10) }),
        ...(formData.duration && { duration: formData.duration.trim() }),
        ...(formData.url && { url: formData.url.trim() }),
        ...(formData.isbn && { isbn: formData.isbn.trim() }),
        ...(formData.episode && { episode: formData.episode.trim() }),
        ...(formData.readTime && { readTime: formData.readTime.trim() })
      };

      const savedResource = await storageAdapter.addResource(newResource);
      navigate(`/resource/${savedResource.id}`);
    } catch (error) {
      console.error('Error creating resource:', error);
      setFormError(error instanceof Error ? error.message : 'Failed to create resource');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }
  };

  const renderTypeSpecificFields = () => {
    if (!selectedTypeConfig) return null;

    const fields = selectedTypeConfig.fields || [];

    return fields.map((field) => {
      switch (field) {
        case 'author':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="author" className="text-sm font-medium">
                Author
              </Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Who created this resource?"
              />
            </div>
          );
        case 'creator':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="creator" className="text-sm font-medium">
                Creator
              </Label>
              <Input
                id="creator"
                value={formData.creator}
                onChange={(e) => handleInputChange('creator', e.target.value)}
                placeholder="Content creator or presenter"
              />
            </div>
          );
        case 'platform':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="platform" className="text-sm font-medium">
                Platform
              </Label>
              <Input
                id="platform"
                value={formData.platform}
                onChange={(e) => handleInputChange('platform', e.target.value)}
                placeholder="Where is this resource hosted?"
              />
            </div>
          );
        case 'year':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">
                Year
              </Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                placeholder="Year of publication"
              />
            </div>
          );
        case 'duration':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Duration
              </Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                placeholder="e.g., 45m, 1h 30m"
              />
            </div>
          );
        case 'url':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="url" className="text-sm font-medium">
                URL
              </Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="Link to the resource"
              />
            </div>
          );
        case 'isbn':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="isbn" className="text-sm font-medium">
                ISBN
              </Label>
              <Input
                id="isbn"
                value={formData.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                placeholder="International Standard Book Number"
              />
            </div>
          );
        case 'episode':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="episode" className="text-sm font-medium">
                Episode
              </Label>
              <Input
                id="episode"
                value={formData.episode}
                onChange={(e) => handleInputChange('episode', e.target.value)}
                placeholder="Episode number or title"
              />
            </div>
          );
        case 'readTime':
          return (
            <div key={field} className="space-y-2">
              <Label htmlFor="readTime" className="text-sm font-medium">
                Estimated Read Time
              </Label>
              <Input
                id="readTime"
                value={formData.readTime}
                onChange={(e) => handleInputChange('readTime', e.target.value)}
                placeholder="e.g., 10 minutes"
              />
            </div>
          );
        default:
          return null;
      }
    });
  };

  if (configLoading && !resourceTypeConfig) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-muted-foreground">
          <Loader2 className="w-6 h-6 mb-4 animate-spin" />
          Loading resource types...
        </div>
      </Layout>
    );
  }

  if (configError && !resourceTypeConfig) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="mb-4 text-destructive font-semibold">{configError}</div>
          <div className="text-muted-foreground mb-6">We weren't able to load your resource type configuration.</div>
          <div className="flex justify-center gap-4">
            <Button onClick={handleRetryConfig} disabled={configLoading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedTypeConfig) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-muted-foreground">
          <Loader2 className="w-6 h-6 mb-4 animate-spin" />
          Preparing resource form...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Add New Resource</h1>
            <p className="text-muted-foreground">Capture insights from your learning journey</p>
          </div>
        </div>

        {preFilledUrl && (
          <Alert className="mb-8">
            <AlertDescription>
              We couldn't automatically process this URL. Please fill in the details manually.
            </AlertDescription>
          </Alert>
        )}

        {configError && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription>{configError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-8">
          {/* Resource Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Type</CardTitle>
              <CardDescription>What type of content are you adding?</CardDescription>
            </CardHeader>
            <CardContent>
              {!preSelectedType ? (
                <Select value={selectedType || ''} onValueChange={(value) => setSelectedType(value as keyof ResourceTypeConfig)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(resourceTypeConfig).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label.slice(0, -1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                  <span className="text-2xl">{selectedTypeConfig.icon}</span>
                  <div>
                    <p className="font-medium">{selectedTypeConfig.label.slice(0, -1)}</p>
                    <p className="text-sm text-muted-foreground">Pre-selected from dashboard</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential details about your resource</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter resource title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the resource"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium">
                  Tags
                </Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="Enter tags separated by commas (e.g., javascript, programming, tutorial)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Type-Specific Fields */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedTypeConfig.label.slice(0, -1)} Details</CardTitle>
              <CardDescription>Specific information for this resource type</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderTypeSpecificFields()}
              {selectedTypeConfig.fields.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p>No custom fields configured for this resource type.</p>
                  <p className="text-sm mt-1">
                    You can add custom fields in{' '}
                    <Link to="/settings" className="text-primary hover:underline">
                      Settings
                    </Link>
                    .
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Your Insights</CardTitle>
              <CardDescription>Add your notes and key takeaways</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <MarkdownEditor
                  value={formData.notes}
                  onChange={(value) => handleInputChange('notes', value)}
                  placeholder="Add your notes, key insights, and takeaways here..."
                  height={300}
                />
              </div>

              {(selectedType === 'video' || selectedType === 'podcast') && (
                <div className="space-y-2">
                  <Label htmlFor="transcript" className="text-sm font-medium">
                    Transcript
                  </Label>
                  <Textarea
                    id="transcript"
                    value={formData.transcript}
                    onChange={(e) => handleInputChange('transcript', e.target.value)}
                    placeholder="Paste transcript or key quotes here..."
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              size="lg"
              className="bg-gradient-primary hover:shadow-knowledge transition-smooth"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Resource
                </>
              )}
            </Button>
            <Link to="/">
              <Button type="button" variant="outline" size="lg" disabled={loading}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewResource;
