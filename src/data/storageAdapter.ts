/**
 * Storage Adapter
 *
 * This module provides a unified interface for resource storage that automatically
 * switches between Supabase (for authenticated users) and localStorage (for
 * unauthenticated users). This hybrid approach ensures the app works both
 * offline and online seamlessly.
 *
 * @module storageAdapter
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Resource } from './mockData';
import * as localStorageOps from './storage';
import * as supabaseOps from './supabaseStorage';

/**
 * Storage adapter interface that provides unified access to resource storage
 * operations regardless of the underlying storage mechanism (localStorage or Supabase)
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

  // Utility methods
  isOnline(): boolean;
}

/**
 * localStorage adapter that wraps synchronous localStorage operations
 * in promises to maintain API consistency with the Supabase adapter.
 *
 * This adapter provides offline-first functionality for unauthenticated users,
 * storing data locally in the browser. All methods return promises to match
 * the async nature of the Supabase adapter.
 */
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

  subscribeToResourceTypeConfigChanges(callback: () => void): () => void {
    return supabaseOps.subscribeToResourceTypeConfigChanges(callback);
  }

  isOnline(): boolean {
    return true; // Supabase is "online"
  }
}

/**
 * Factory function that returns the appropriate storage adapter based on authentication status
 *
 * @param isAuthenticated - Whether the user is currently authenticated
 * @returns SupabaseStorageAdapter for authenticated users, LocalStorageAdapter for anonymous users
 */
export const getStorageAdapter = (isAuthenticated: boolean): StorageAdapter => {
  if (isAuthenticated) {
    return new SupabaseStorageAdapter();
  } else {
    return new LocalStorageAdapter();
  }
};

/**
 * React hook that provides the current storage adapter based on user authentication status
 *
 * This hook automatically switches between Supabase and localStorage adapters
 * based on whether the user is authenticated, providing seamless data persistence.
 *
 * @returns The appropriate StorageAdapter instance
 */
export const useStorageAdapter = (): StorageAdapter => {
  const { user } = useAuth();

  const adapter = useMemo(() => getStorageAdapter(!!user), [user]);

  return adapter;
};

// Re-export types for convenience
export type { Resource };
export type ResourceTypeConfig = supabaseOps.ResourceTypeConfig;

