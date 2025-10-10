/**
 * Storage Adapter
 *
 * Provides a unified interface for resource storage backed exclusively by Supabase.
 * Removing the legacy localStorage pathway ensures the frontend always works with
 * the canonical database schema.
 */

import { useAuth } from '@/hooks/useAuth';
import { Resource } from './mockData';
import * as supabaseOps from './supabaseStorage';
import type { Comment, CommentWithReplies, CreateCommentInput, UpdateCommentInput, CommentStatus } from '@/types/comments';

/**
 * Storage adapter interface that provides unified access to Supabase-backed resource storage.
 */
export interface StorageAdapter {
  // Resource CRUD operations
  getResources(): Promise<Resource[]>;
  getResourceById(id: string): Promise<Resource | null>;
  addResource(resource: Resource): Promise<Resource>;
  updateResource(resourceId: string, updates: Partial<Resource>): Promise<Resource>;
  deleteResource(resourceId: string): Promise<void>;
  getResourcesByType(type: string): Promise<Resource[]>;
  getRecentResources(limit?: number): Promise<Resource[]>;

  // Resource type configuration operations
  getResourceTypeConfig(): Promise<supabaseOps.ResourceTypeConfig>;
  updateResourceTypeFields(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fields: string[]
  ): Promise<supabaseOps.ResourceTypeConfig>;
  addFieldToResourceType(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fieldName: string
  ): Promise<supabaseOps.ResourceTypeConfig>;
  removeFieldFromResourceType(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fieldName: string
  ): Promise<supabaseOps.ResourceTypeConfig>;

  // Real-time subscription operations
  subscribeToResourceChanges(callback: () => void): () => void;
  subscribeToResourceTypeConfigChanges?(callback: () => void): () => void;

  // Comment operations
  getComments(resourceId: string, status?: CommentStatus): Promise<CommentWithReplies[]>;
  getComment(commentId: string): Promise<CommentWithReplies>;
  getUnresolvedCount(resourceId: string): Promise<number>;
  createComment(input: CreateCommentInput): Promise<CommentWithReplies>;
  addReply(commentId: string, body: string): Promise<Comment>;
  updateComment(commentId: string, updates: UpdateCommentInput): Promise<Comment>;
  resolveComment(commentId: string): Promise<Comment>;
  markAsStale(commentId: string, newQuotedText: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  deleteReply(replyId: string): Promise<void>;
}

// Supabase adapter (uses existing async operations)
/**
 * Supabase adapter that provides database-backed storage for authenticated users.
 *
 * This adapter handles all Supabase operations including row-level security,
 * real-time subscriptions, and user-scoped data access. It provides the full
 * feature set for authenticated users including real-time synchronization.
 */
class SupabaseStorageAdapter implements StorageAdapter {
  async getResources(): Promise<Resource[]> {
    return supabaseOps.getResources();
  }

  async getResourceById(id: string): Promise<Resource | null> {
    return supabaseOps.getResourceById(id);
  }

  async addResource(resource: Resource): Promise<Resource> {
    return supabaseOps.addResource(resource);
  }

  async updateResource(resourceId: string, updates: Partial<Resource>): Promise<Resource> {
    return supabaseOps.updateResource(resourceId, updates);
  }

  async deleteResource(resourceId: string): Promise<void> {
    return supabaseOps.deleteResource(resourceId);
  }

  async getResourcesByType(type: string): Promise<Resource[]> {
    return supabaseOps.getResourcesByType(type);
  }

  async getRecentResources(limit?: number): Promise<Resource[]> {
    return supabaseOps.getRecentResources(limit);
  }

  async getResourceTypeConfig(): Promise<supabaseOps.ResourceTypeConfig> {
    return supabaseOps.getResourceTypeConfig();
  }

  async updateResourceTypeFields(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fields: string[]
  ): Promise<supabaseOps.ResourceTypeConfig> {
    return supabaseOps.updateResourceTypeFields(resourceType, fields);
  }

  async addFieldToResourceType(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fieldName: string
  ): Promise<supabaseOps.ResourceTypeConfig> {
    return supabaseOps.addFieldToResourceType(resourceType, fieldName);
  }

  async removeFieldFromResourceType(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fieldName: string
  ): Promise<supabaseOps.ResourceTypeConfig> {
    return supabaseOps.removeFieldFromResourceType(resourceType, fieldName);
  }

  subscribeToResourceChanges(callback: () => void): () => void {
    return supabaseOps.subscribeToResourceChanges(callback);
  }

  subscribeToResourceTypeConfigChanges?(callback: () => void): () => void {
    return supabaseOps.subscribeToResourceTypeConfigChanges(callback);
  }

  // Comment operations
  async getComments(resourceId: string, status?: CommentStatus): Promise<CommentWithReplies[]> {
    return supabaseOps.getComments(resourceId, status);
  }

  async getComment(commentId: string): Promise<CommentWithReplies> {
    return supabaseOps.getComment(commentId);
  }

  async getUnresolvedCount(resourceId: string): Promise<number> {
    return supabaseOps.getUnresolvedCount(resourceId);
  }

  async createComment(input: CreateCommentInput): Promise<CommentWithReplies> {
    return supabaseOps.createComment(input);
  }

  async addReply(commentId: string, body: string): Promise<Comment> {
    return supabaseOps.addReply(commentId, body);
  }

  async updateComment(commentId: string, updates: UpdateCommentInput): Promise<Comment> {
    return supabaseOps.updateComment(commentId, updates);
  }

  async resolveComment(commentId: string): Promise<Comment> {
    return supabaseOps.resolveComment(commentId);
  }

  async markAsStale(commentId: string, newQuotedText: string): Promise<Comment> {
    return supabaseOps.markAsStale(commentId, newQuotedText);
  }

  async deleteComment(commentId: string): Promise<void> {
    return supabaseOps.deleteComment(commentId);
  }

  async deleteReply(replyId: string): Promise<void> {
    return supabaseOps.deleteReply(replyId);
  }
}

const adapter = new SupabaseStorageAdapter();

export const getStorageAdapter = (): StorageAdapter => adapter;

/**
 * React hook that provides the shared Supabase storage adapter.
 */
export const useStorageAdapter = (): StorageAdapter => {
  useAuth();
  return adapter;
};

// Re-export types for convenience
export type { Resource };
export type ResourceTypeConfig = supabaseOps.ResourceTypeConfig;

