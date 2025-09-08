import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { resourceTypeConfig, Resource } from '@/data/mockData';
import { getResources } from '@/data/storage';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, Grid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

const Resources = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<Resource['type'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const resources = getResources();

  // Filter resources based on search and type
  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.creator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Get resource counts by type
  const typeCounts = Object.entries(resourceTypeConfig).reduce((acc, [type, config]) => {
    acc[type] = resources.filter(r => r.type === type).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Your Resources</h1>
              <p className="text-muted-foreground">
                {filteredResources.length} of {mockResources.length} resources
              </p>
            </div>
            <Link to="/resources/new">
              <Button className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </Link>
          </div>

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
              onClick={() => setSelectedType('all')}
              className="transition-smooth"
            >
              All ({mockResources.length})
            </Button>
            {Object.entries(resourceTypeConfig).map(([type, config]) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type as Resource['type'])}
                className="transition-smooth"
              >
                <span className="mr-1">{config.icon}</span>
                {config.label} ({typeCounts[type] || 0})
              </Button>
            ))}
          </div>
        </div>

        {/* Resources Grid/List */}
        {filteredResources.length > 0 ? (
          <div className={cn(
            "gap-6",
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "flex flex-col space-y-4"
          )}>
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
                ? "Try adjusting your search or filters" 
                : "Start building your knowledge vault by adding your first resource"
              }
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