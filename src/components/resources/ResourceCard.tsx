import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Resource, resourceTypeConfig } from '@/data/mockData';
import { Calendar, ExternalLink, User, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getResourceBadgeClasses } from '@/utils/resourceTypeStyles';

const formatViewCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
};

interface ResourceCardProps {
  resource: Resource;
  variant?: 'default' | 'compact';
}

// Platform display configuration for short-form videos
const platformInfo: Record<'youtube-short' | 'tiktok' | 'instagram-reel', { icon: string; label: string }> = {
  'youtube-short': { icon: '▶', label: 'YouTube Shorts' },
  'tiktok': { icon: '🎵', label: 'TikTok' },
  'instagram-reel': { icon: '📸', label: 'Instagram Reels' }
};

export const ResourceCard = ({ resource, variant = 'default' }: ResourceCardProps) => {
  const config = resourceTypeConfig[resource.type];
  const isCompact = variant === 'compact';
  // Platform badge only for short-video resources
  const platform = resource.type === 'short-video' && resource.platform
    ? platformInfo[resource.platform as keyof typeof platformInfo]
    : null;

  return (
    <Card className={cn(
      "group transition-smooth hover:shadow-card hover:-translate-y-1 bg-gradient-card border-0",
      config.color, // Apply type-specific styling (e.g., knowledge-short-video)
      isCompact ? "h-full" : ""
    )}>
      <CardHeader className={cn(isCompact ? "pb-3" : "pb-4")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{config.icon}</span>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-medium",
                  getResourceBadgeClasses(config.color)
                )}
              >
                {config.label.slice(0, -1)}
              </Badge>
            </div>
            {platform && (
              <Badge
                variant="outline"
                className="text-xs font-medium bg-primary/5 border-primary/20"
              >
                {platform.icon} {platform.label}
              </Badge>
            )}
          </div>
          {resource.url && (
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-smooth"
              asChild
            >
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
        
        <CardTitle className={cn(
          "line-clamp-2 group-hover:text-primary transition-smooth",
          isCompact ? "text-lg" : "text-xl"
        )}>
          <Link to={`/resource/${resource.id}`} className="hover:underline">
            {resource.title}
          </Link>
        </CardTitle>
        
        {!isCompact && (
          <CardDescription className="line-clamp-2">
            {resource.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={cn(isCompact ? "pt-0" : "")}>
        <div className="space-y-3">
          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {/* Creator/Author: Cascading fallback for short-video and other types */}
            {resource.channelName ? (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{resource.channelName}</span>
              </div>
            ) : resource.handle ? (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>@{resource.handle}</span>
              </div>
            ) : resource.author ? (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{resource.author}</span>
              </div>
            ) : resource.creator ? (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{resource.creator}</span>
              </div>
            ) : null}
            {resource.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{resource.duration}</span>
              </div>
            )}
            {resource.viewCount && (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{formatViewCount(resource.viewCount)} views</span>
              </div>
            )}
            {resource.year && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{resource.year}</span>
              </div>
            )}
          </div>

          {/* Tags and Extraction Method */}
          {!isCompact && (resource.tags.length > 0 || resource.extractionMethod === 'auto') && (
            <div className="flex flex-wrap gap-1 items-center">
              {resource.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{resource.tags.length - 3}
                </Badge>
              )}
              {resource.extractionMethod === 'auto' && (
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                  Auto-processed
                </Badge>
              )}
            </div>
          )}

          {/* Notes Preview */}
          {!isCompact && resource.notes && (
            <div className="bg-muted/30 rounded-md p-3 border border-border/50">
              <p className="text-sm text-muted-foreground line-clamp-3 font-reading leading-relaxed">
                {resource.notes.replace(/[#*`]/g, '').substring(0, 120)}...
              </p>
            </div>
          )}

          {/* Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Updated {new Date(resource.updatedAt).toLocaleDateString()}
            </span>
            <Link to={`/resource/${resource.id}`}>
              <Button size="sm" variant="ghost" className="group-hover:bg-primary group-hover:text-primary-foreground transition-smooth">
                {isCompact ? 'View' : 'View Notes'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
