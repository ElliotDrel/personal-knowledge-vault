import { useMemo, useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStorageAdapter, type ResourceTypeConfig, type Resource } from '@/data/storageAdapter';
import { useResources } from '@/hooks/use-resources';
import { Link } from 'react-router-dom';
import { Search, Plus, Grid, List, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const Resources = () => {
  const { resources, loading: resourcesLoading, error: resourcesError } = useResources();
  const storageAdapter = useStorageAdapter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<Resource['type'] | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'youtube-short' | 'tiktok' | 'instagram-reel'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

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
  }, [storageAdapter]);

  useEffect(() => {
    if (!resourceTypeConfig) {
      return;
    }

    if (selectedType !== 'all' && !resourceTypeConfig[selectedType]) {
      setSelectedType('all');
    }
  }, [resourceTypeConfig, selectedType]);

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesType = selectedType === 'all' || resource.type === selectedType;
      const matchesPlatform = selectedPlatform === 'all' || resource.shortFormPlatform === selectedPlatform;

      if (!query) {
        return matchesType && matchesPlatform;
      }

      const matchesSearch =
        resource.title.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query) ||
        resource.author?.toLowerCase().includes(query) ||
        resource.creator?.toLowerCase().includes(query) ||
        resource.shortFormMetadata?.channelName?.toLowerCase().includes(query) ||
        resource.shortFormMetadata?.handle?.toLowerCase().includes(query) ||
        resource.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        resource.shortFormMetadata?.hashtags?.some((tag) => tag.toLowerCase().includes(query));

      return matchesType && matchesPlatform && matchesSearch;
    });
  }, [resources, searchQuery, selectedType, selectedPlatform]);

  const typeCounts = useMemo(() => {
    if (!resourceTypeConfig) {
      return {} as Record<string, number>;
    }

    return Object.keys(resourceTypeConfig).reduce((acc, type) => {
      acc[type] = resources.filter((resource) => resource.type === type).length;
      return acc;
    }, {} as Record<string, number>);
  }, [resources, resourceTypeConfig]);

  const platformCounts = useMemo(() => {
    return {
      'youtube-short': resources.filter((r) => r.shortFormPlatform === 'youtube-short').length,
      'tiktok': resources.filter((r) => r.shortFormPlatform === 'tiktok').length,
      'instagram-reel': resources.filter((r) => r.shortFormPlatform === 'instagram-reel').length
    };
  }, [resources]);

  const hasShortFormVideos = platformCounts['youtube-short'] + platformCounts['tiktok'] + platformCounts['instagram-reel'] > 0;

  const isLoading = resourcesLoading || configLoading;
  const showError = !isLoading && (resourcesError || configError);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Your Resources</h1>
              <p className="text-muted-foreground">
                {filteredResources.length} of {resources.length} resources
              </p>
            </div>
            <Link to="/resources/new">
              <Button className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </Link>
          </div>

          {showError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {resourcesError ?? configError}
              </AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources, authors, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-secondary rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-md"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-md"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedType('all')
                setSelectedPlatform('all')
              }}
              className="transition-smooth"
              disabled={isLoading}
            >
              All ({resources.length})
            </Button>
            {resourceTypeConfig ? (
              Object.entries(resourceTypeConfig).map(([type, config]) => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedType(type as Resource['type'])
                    if (type !== 'video') {
                      setSelectedPlatform('all')
                    }
                  }}
                  className="transition-smooth"
                  disabled={isLoading}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.label} ({typeCounts[type] || 0})
                </Button>
              ))
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading types...
              </div>
            )}
          </div>

          {/* Platform Filters - Only show when viewing videos or all */}
          {hasShortFormVideos && (selectedType === 'all' || selectedType === 'video') && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              <span className="text-sm font-medium text-muted-foreground flex items-center">
                Platforms:
              </span>
              <Button
                variant={selectedPlatform === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlatform('all')}
                className="transition-smooth"
                disabled={isLoading}
              >
                All Platforms
              </Button>
              {platformCounts['youtube-short'] > 0 && (
                <Button
                  variant={selectedPlatform === 'youtube-short' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPlatform('youtube-short')}
                  className="transition-smooth"
                  disabled={isLoading}
                >
                  <span className="mr-1">▶</span>
                  YouTube Shorts ({platformCounts['youtube-short']})
                </Button>
              )}
              {platformCounts['tiktok'] > 0 && (
                <Button
                  variant={selectedPlatform === 'tiktok' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPlatform('tiktok')}
                  className="transition-smooth"
                  disabled={isLoading}
                >
                  <span className="mr-1">🎵</span>
                  TikTok ({platformCounts['tiktok']})
                </Button>
              )}
              {platformCounts['instagram-reel'] > 0 && (
                <Button
                  variant={selectedPlatform === 'instagram-reel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPlatform('instagram-reel')}
                  className="transition-smooth"
                  disabled={isLoading}
                >
                  <span className="mr-1">📸</span>
                  Instagram Reels ({platformCounts['instagram-reel']})
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Resources Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Loading resources...
          </div>
        ) : filteredResources.length > 0 ? (
          <div
            className={cn(
              'gap-6',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col space-y-4'
            )}
          >
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                variant={viewMode === 'list' ? 'compact' : 'default'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start building your knowledge vault by adding your first resource'}
            </p>
            {searchQuery || selectedType !== 'all' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Link to="/resources/new">
                <Button className="bg-gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Resource
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Resources;
