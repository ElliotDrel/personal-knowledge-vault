import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Resource } from './mockData';
import * as localStorageOps from './storage';
import * as supabaseOps from './supabaseStorage';

// Type definitions for storage operations
export interface StorageAdapter {
  // Resource operations
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

  // Subscription operations
  subscribeToResourceChanges(callback: () => void): () => void;
  subscribeToResourceTypeConfigChanges?(callback: () => void): () => void;

  // Utility
  isOnline(): boolean;
}

// localStorage adapter (wraps sync operations in promises)
class LocalStorageAdapter implements StorageAdapter {
  async getResources(): Promise<Resource[]> {
    return localStorageOps.getResources();
  }

  async getResourceById(id: string): Promise<Resource | null> {
    return localStorageOps.getResourceById(id) || null;
  }

  async addResource(resource: Resource): Promise<Resource> {
    localStorageOps.addResource(resource);
    return resource;
  }

  async updateResource(resourceId: string, updates: Partial<Resource>): Promise<Resource> {
    localStorageOps.updateResource(resourceId, updates);
    const updatedResource = localStorageOps.getResourceById(resourceId);
    if (!updatedResource) {
      throw new Error('Resource not found after update');
    }
    return updatedResource;
  }

  async deleteResource(resourceId: string): Promise<void> {
    const resources = localStorageOps.getResources();
    const filteredResources = resources.filter(r => r.id !== resourceId);
    localStorageOps.saveResources(filteredResources);
  }

  async getResourcesByType(type: string): Promise<Resource[]> {
    return localStorageOps.getResourcesByType(type);
  }

  async getRecentResources(limit?: number): Promise<Resource[]> {
    return localStorageOps.getRecentResources(limit);
  }

  async getResourceTypeConfig(): Promise<supabaseOps.ResourceTypeConfig> {
    return localStorageOps.getResourceTypeConfig() as supabaseOps.ResourceTypeConfig;
  }

  async updateResourceTypeFields(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fields: string[]
  ): Promise<supabaseOps.ResourceTypeConfig> {
    return localStorageOps.updateResourceTypeFields(resourceType, fields) as supabaseOps.ResourceTypeConfig;
  }

  async addFieldToResourceType(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fieldName: string
  ): Promise<supabaseOps.ResourceTypeConfig> {
    return localStorageOps.addFieldToResourceType(resourceType, fieldName) as supabaseOps.ResourceTypeConfig;
  }

  async removeFieldFromResourceType(
    resourceType: keyof supabaseOps.ResourceTypeConfig,
    fieldName: string
  ): Promise<supabaseOps.ResourceTypeConfig> {
    return localStorageOps.removeFieldFromResourceType(resourceType, fieldName) as supabaseOps.ResourceTypeConfig;
  }

  subscribeToResourceChanges(callback: () => void): () => void {
    return localStorageOps.subscribeToResourceChanges(callback);
  }

  isOnline(): boolean {
    return false; // localStorage is always "offline"
  }
}

// Supabase adapter (uses existing async operations)
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

  subscribeToResourceTypeConfigChanges(callback: () => void): () => void {
    return supabaseOps.subscribeToResourceTypeConfigChanges(callback);
  }

  isOnline(): boolean {
    return true; // Supabase is "online"
  }
}

// Factory function to get the appropriate storage adapter
export const getStorageAdapter = (isAuthenticated: boolean): StorageAdapter => {
  if (isAuthenticated) {
    return new SupabaseStorageAdapter();
  } else {
    return new LocalStorageAdapter();
  }
};

// Hook to get the current storage adapter
export const useStorageAdapter = (): StorageAdapter => {
  const { user } = useAuth();

  const adapter = useMemo(() => getStorageAdapter(!!user), [user?.id]);

  return adapter;
};

// Re-export types for convenience
export type { Resource };
export type ResourceTypeConfig = supabaseOps.ResourceTypeConfig;

