/**
 * Shared resource-related types and helpers.
 *
 * Centralises unions so the storage layer, UI, and utilities can agree on
 * the supported resource kinds and their associated styling tokens.
 */
export type ResourceTypeId = 'book' | 'video' | 'podcast' | 'article' | 'short-video';

export type ResourceTypeColor =
  | 'knowledge-book'
  | 'knowledge-video'
  | 'knowledge-podcast'
  | 'knowledge-article'
  | 'knowledge-short-video';

export const RESOURCE_TYPE_IDS: ResourceTypeId[] = ['book', 'video', 'podcast', 'article', 'short-video'];

export const isResourceTypeColor = (value: string): value is ResourceTypeColor => {
  return (
    value === 'knowledge-book' ||
    value === 'knowledge-video' ||
    value === 'knowledge-podcast' ||
    value === 'knowledge-article' ||
    value === 'knowledge-short-video'
  );
};

export const DEFAULT_RESOURCE_TYPE_COLOR: ResourceTypeColor = 'knowledge-article';
