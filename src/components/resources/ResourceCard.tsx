import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Resource, resourceTypeConfig } from '@/data/mockData';
import { Calendar, ExternalLink, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceCardProps {
  resource: Resource;
  variant?: 'default' | 'compact';
}

export const ResourceCard = ({ resource, variant = 'default' }: ResourceCardProps) => {
  const config = resourceTypeConfig[resource.type];
  const isCompact = variant === 'compact';

  return (
    <Card className={cn(
      "group transition-smooth hover:shadow-card hover:-translate-y-1 bg-gradient-card border-0",
      isCompact ? "h-full" : ""
    )}>
      <CardHeader className={cn(isCompact ? "pb-3" : "pb-4")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{config.icon}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium",
                `bg-${config.color}/10 text-${config.color} border-${config.color}/20`
              )}
            >
              {config.label.slice(0, -1)}
            </Badge>
          </div>
          {resource.url && (
            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-smooth">
              <ExternalLink className="w-3 h-3" />
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
            {resource.author && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{resource.author}</span>
              </div>
            )}
            {resource.creator && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{resource.creator}</span>
              </div>
            )}
            {resource.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{resource.duration}</span>
              </div>
            )}
            {resource.year && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{resource.year}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {!isCompact && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
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