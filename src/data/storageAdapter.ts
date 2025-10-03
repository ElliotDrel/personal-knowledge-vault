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

