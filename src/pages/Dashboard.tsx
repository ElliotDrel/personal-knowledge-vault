import { useMemo, useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useStorageAdapter, type ResourceTypeConfig, type Resource } from '@/data/storageAdapter';
import { useResources } from '@/hooks/use-resources';
import { useUrlDetection } from '@/hooks/useUrlDetection';
import { findDuplicateResourceByNormalizedUrl } from '@/utils/resourceDuplicateLookup';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Brain, Loader2, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const { resources, loading: resourcesLoading, error: resourcesError } = useResources();
  const storageAdapter = useStorageAdapter();
  const navigate = useNavigate();

  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);
  const [recentResources, setRecentResources] = useState<Resource[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // URL detection for smart routing
  const {
    url,
    setUrl,
    result: urlResult,
    isDetecting,
    shouldShowProcessButton,
    getStatusMessage,
    getStatusColor
  } = useUrlDetection('', { debounceMs: 300 });

  // Check for duplicate resource by URL
  const existingResource = useMemo(() => {
    if (!urlResult?.normalizedUrl || !urlResult.isValid) return null;

    console.log('🔍 [Duplicate Check] Checking for duplicates:', {
      normalizedUrl: urlResult.normalizedUrl,
      totalResources: resources.length,
      resourcesWithUrls: resources.filter(r => r.url).length
    });

    const found = findDuplicateResourceByNormalizedUrl(resources, urlResult.normalizedUrl);

    if (found) {
      console.log('✅ [Duplicate Check] Found duplicate:', found.title);
    } else {
      console.log('❌ [Duplicate Check] No duplicate found');
    }

    return found;
  }, [urlResult?.normalizedUrl, urlResult?.isValid, resources]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const [config, recent] = await Promise.all([
          storageAdapter.getResourceTypeConfig(),
          storageAdapter.getRecentResources(3)
        ]);

        if (!isMounted) {
          return;
        }

        setResourceTypeConfig(config);
        setRecentResources(recent);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (!isMounted) {
          return;
        }
        setConfigError(error instanceof Error ? error.message : 'Failed to load dashboard data');
        setResourceTypeConfig(null);
        setRecentResources([]);
      } finally {
        if (isMounted) {
          setConfigLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [storageAdapter]);

  // Navigation handlers for URL processing
  const handleProcessVideo = () => {
    if (!url || !urlResult?.isShortFormVideo) return;
    // Use original URL to preserve user's input format (keeps www, etc.)
    // Use template literal for readable address bar (backend normalizes anyway)
    navigate(`/resources/process?url=${encodeURIComponent(url)}`);
  };

  const handleViewExisting = () => {
    if (!existingResource?.id) return;
    navigate(`/resource/${existingResource.id}`);
  };

  const handleManualAdd = () => {
    const params = new URLSearchParams();
    if (url && urlResult?.isValid) {
      params.set('url', url);
      params.set('type', 'video');
    }
    navigate(`/resources/new${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Status color mapping helper
  const statusColorToClass = (color: 'success' | 'warning' | 'error' | 'neutral') => {
    switch (color) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-destructive';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const summary = useMemo(() => {
    const statsByType = resourceTypeConfig
      ? Object.entries(resourceTypeConfig).map(([type, config]) => ({
          type,
          config,
          count: resources.filter((resource) => resource.type === type).length,
        }))
      : [];

    return {
      totalResources: resources.length,
      statsByType,
      recentResources,
    };
  }, [resources, resourceTypeConfig, recentResources]);

  const isLoading = resourcesLoading || configLoading;
  const showError = !isLoading && (resourcesError || configError);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-knowledge rounded-2xl mb-6 shadow-glow">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-knowledge bg-clip-text text-transparent">
            Your Knowledge Vault
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Capture, organize, and share insights from books, videos, podcasts, and articles.
            Your learning journey, beautifully documented.
          </p>
          <Link to="/resources/new">
            <Button size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
              <Plus className="w-5 h-5 mr-2" />
              {resources.length === 0 ? 'Add Your First Resource' : 'Add New Resource'}
            </Button>
          </Link>
        </div>

        {showError && (
          <Alert variant="destructive" className="mb-10">
            <AlertDescription>
              {resourcesError ?? configError}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Total Resources */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total Resources</CardDescription>
              <CardTitle className="text-3xl font-bold text-primary">
                {isLoading ? (
                  <span className="flex items-center gap-2 text-base text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  summary.totalResources
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 mr-1" />
                Growing collection
              </div>
            </CardContent>
          </Card>

          {/* Resource Type Stats */}
          {summary.statsByType.map(({ type, config, count }) => (
            <Card key={type} className="bg-gradient-card border-0 shadow-card group hover:shadow-knowledge transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{config.icon}</span>
                  <CardTitle className="text-2xl font-bold">
                    {count}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="group-hover:text-foreground transition-smooth">
                  {config.label}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Resources */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Recent Updates</h2>
              <p className="text-muted-foreground">Your latest learning insights</p>
            </div>
            <Link to="/resources">
              <Button variant="outline" className="hover:bg-accent-soft transition-smooth" disabled={resourcesLoading}>
                View All Resources
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading recent resources...
            </div>
          ) : summary.recentResources.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {summary.recentResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              No recent activity yet. Add a resource to get started!
            </div>
          )}
        </div>

        {/* Add Resource Section */}
        <div className="space-y-8">
          {/* URL Processing Card */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Add Resource
              </CardTitle>
              <CardDescription>
                Paste a URL for automatic extraction, or add manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="url-input">Resource URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="Paste a YouTube Shorts, TikTok, or Instagram Reels URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (shouldShowProcessButton) handleProcessVideo();
                      else if (urlResult?.isValid) handleManualAdd();
                    }
                  }}
                  className="text-base h-12"
                />
              </div>

              {/* Detection Status */}
              {url && (
                <div className="rounded-md border p-4 bg-muted/30">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    {isDetecting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : existingResource ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : urlResult?.isShortFormVideo ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : urlResult?.isValid === false ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}

                    {/* Status Message */}
                    <div className="space-y-1 text-sm flex-1">
                      {existingResource ? (
                        <>
                          <p className="text-blue-600 dark:text-blue-400 font-medium">
                            This resource already exists in your vault
                          </p>
                          <p className="text-muted-foreground text-xs">
                            "{existingResource.title}"
                          </p>
                        </>
                      ) : (
                        <>
                          <p className={statusColorToClass(getStatusColor())}>
                            {getStatusMessage()}
                          </p>
                          {urlResult?.platformInfo && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {urlResult.platformInfo.icon} {urlResult.platformInfo.displayName}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {existingResource ? (
                  <Button
                    onClick={handleViewExisting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    View Existing Resource
                  </Button>
                ) : shouldShowProcessButton ? (
                  <Button
                    onClick={handleProcessVideo}
                    className="flex-1 bg-gradient-primary hover:shadow-knowledge transition-smooth"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Process Video
                  </Button>
                ) : null}

                <Button
                  variant={(existingResource || shouldShowProcessButton) ? "outline" : "default"}
                  onClick={handleManualAdd}
                  className={(existingResource || shouldShowProcessButton) ? "" : "flex-1"}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manual Resource
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions - Resource Type Buttons */}
          <div className="bg-gradient-card rounded-2xl p-8 shadow-card border-0">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Or Choose a Resource Type</h2>
              <p className="text-muted-foreground text-sm">Create a resource manually</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {resourceTypeConfig ? (
                Object.entries(resourceTypeConfig).map(([type, config]) => (
                  <Link key={type} to={`/resources/new?type=${type}`}>
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent-soft hover:border-accent transition-smooth group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-smooth">{config.icon}</span>
                      <span className="font-medium">Add {config.label.slice(0, -1)}</span>
                    </Button>
                  </Link>
                ))
              ) : (
                <div className="col-span-full flex items-center justify-center text-muted-foreground">
                  {configLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Loading resource types...
                    </>
                  ) : (
                    <span>{configError ?? 'Resource type configuration is unavailable.'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
