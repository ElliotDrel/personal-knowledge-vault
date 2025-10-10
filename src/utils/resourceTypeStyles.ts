import { DEFAULT_RESOURCE_TYPE_COLOR, isResourceTypeColor, type ResourceTypeColor } from '@/types/resource';

const RESOURCE_BADGE_CLASS_MAP: Record<ResourceTypeColor, string> = {
  'knowledge-book': 'bg-knowledge-book/10 text-knowledge-book border-knowledge-book/20',
  'knowledge-video': 'bg-knowledge-video/10 text-knowledge-video border-knowledge-video/20',
  'knowledge-podcast': 'bg-knowledge-podcast/10 text-knowledge-podcast border-knowledge-podcast/20',
  'knowledge-article': 'bg-knowledge-article/10 text-knowledge-article border-knowledge-article/20',
  'knowledge-short-video': 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20',
};

const FALLBACK_BADGE_CLASSES = 'bg-secondary text-secondary-foreground border-secondary/20';

export const getResourceBadgeClasses = (color: string | null | undefined): string => {
  if (!color) {
    return RESOURCE_BADGE_CLASS_MAP[DEFAULT_RESOURCE_TYPE_COLOR];
  }

  if (isResourceTypeColor(color)) {
    return RESOURCE_BADGE_CLASS_MAP[color];
  }

  return FALLBACK_BADGE_CLASSES;
};
