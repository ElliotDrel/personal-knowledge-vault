/**
 * AI Metadata Configuration
 * Defines which metadata fields to include per resource type when sending context to AI
 *
 * This configuration ensures AI receives relevant context for each resource type
 * without overwhelming the prompt with unnecessary data.
 */

import type { ResourceTypeId } from '../types/resource';

// ============================================================================
// Metadata Field Mapping
// ============================================================================

/**
 * Maps resource types to fields that should be included in AI prompts
 *
 * Design principles:
 * - Include fields that provide context for understanding notes
 * - Prioritize fields that help AI identify missing concepts
 * - Avoid redundant or low-value fields (e.g., viewCount, hashtags)
 * - Easy to extend: just add new resource type mapping
 */
export const AI_METADATA_CONFIG: Record<ResourceTypeId, string[]> = {
  // Short-form videos: Focus on creator and content
  'short-video': ['author', 'creator', 'channelName', 'handle', 'description', 'transcript', 'platform'],

  // Long-form videos: Comprehensive context
  video: ['title', 'description', 'transcript', 'author', 'creator', 'platform', 'duration'],

  // Books: Author and description context
  book: ['title', 'description', 'author', 'year'],

  // Articles: Minimal context (notes-focused)
  article: ['title', 'url', 'author', 'platform'],

  // Podcasts: Similar to videos
  podcast: ['title', 'description', 'transcript', 'creator', 'platform', 'duration'],
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract AI-relevant metadata from a resource
 *
 * Filters resource object to only include fields specified in AI_METADATA_CONFIG
 * for the resource's type. Skips null/undefined values to keep prompt clean.
 *
 * @param resource - The resource object to extract metadata from
 * @returns Object containing only relevant metadata fields with values
 *
 * @example
 * const resource = {
 *   id: '123',
 *   type: 'video',
 *   title: 'How to Learn',
 *   description: 'A guide to effective learning',
 *   transcript: 'Welcome to...',
 *   notes: 'My notes here',
 *   tags: ['learning'],
 *   viewCount: 1000, // Not in config, won't be included
 * };
 *
 * const metadata = getAIMetadataForResource(resource);
 * // Returns: { title: 'How to Learn', description: 'A guide...', transcript: 'Welcome...' }
 */
export function getAIMetadataForResource(resource: Record<string, unknown>): Record<string, unknown> {
  const type = resource.type as ResourceTypeId;

  // Get configured fields for this resource type
  const fields = AI_METADATA_CONFIG[type] || [];

  // Extract only configured fields that have values
  const metadata: Record<string, unknown> = {};

  for (const field of fields) {
    const value = resource[field];

    // Only include fields with actual values (skip null, undefined, empty strings)
    if (value !== null && value !== undefined && value !== '') {
      metadata[field] = value;
    }
  }

  return metadata;
}

/**
 * Get list of metadata field names for a resource type
 *
 * Useful for documentation, debugging, or UI display
 *
 * @param type - The resource type ID
 * @returns Array of field names configured for this type
 *
 * @example
 * const fields = getConfiguredFieldsForType('video');
 * // Returns: ['title', 'description', 'transcript', 'author', 'creator', 'platform', 'duration']
 */
export function getConfiguredFieldsForType(type: ResourceTypeId): readonly string[] {
  return AI_METADATA_CONFIG[type] || [];
}

/**
 * Check if a field is configured for AI metadata in a given resource type
 *
 * @param type - The resource type ID
 * @param field - The field name to check
 * @returns True if field is configured for this resource type
 *
 * @example
 * isFieldConfigured('video', 'transcript'); // true
 * isFieldConfigured('book', 'transcript'); // false
 */
export function isFieldConfigured(type: ResourceTypeId, field: string): boolean {
  const fields = AI_METADATA_CONFIG[type] || [];
  return fields.includes(field);
}
