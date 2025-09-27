import { supabase } from '@/lib/supabaseClient';
import { Resource } from './mockData';

// Database types that align with our schema
export interface DatabaseResource {
  id: string;
  user_id: string;
  type: 'book' | 'video' | 'podcast' | 'article';
  title: string;
  description: string;
  notes: string;
  transcript: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseResourceTypeConfig {
  id: string;
  user_id: string;
  resource_type: 'book' | 'video' | 'podcast' | 'article';
  config: {
    label: string;
    icon: string;
    color: string;
    fields: string[];
  };
  created_at: string;
  updated_at: string;
}

// Transform database resource to frontend Resource interface
const transformDatabaseResource = (dbResource: DatabaseResource): Resource => {
  const { metadata, created_at, updated_at, ...baseResource } = dbResource;

  return {
    ...baseResource,
    // Merge metadata fields into the main resource object
    ...metadata,
    transcript: dbResource.transcript || undefined,
    createdAt: created_at,
    updatedAt: updated_at,
  };
};

// Transform frontend Resource to database format
const transformToDatabase = (resource: Resource): Partial<DatabaseResource> => {
  const {
    id,
    type,
    title,
    description,
    notes,
    transcript,
    tags,
    createdAt,
    updatedAt,
    ...metadata
  } = resource;

  return {
    id,
    type,
    title,
    description,
    notes,
    transcript: transcript || null,
    tags,
    metadata,
    // Don't include timestamps for updates - they're handled by triggers
  };
};

// Get the current authenticated user
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user;
};

// Resource CRUD Operations

export const getResources = async (): Promise<Resource[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }

    return (data || []).map(transformDatabaseResource);
  } catch (error) {
    console.error('Error in getResources:', error);
    throw error;
  }
};

export const getResourceById = async (id: string): Promise<Resource | null> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching resource:', error);
      throw new Error(`Failed to fetch resource: ${error.message}`);
    }

    return data ? transformDatabaseResource(data) : null;
  } catch (error) {
    console.error('Error in getResourceById:', error);
    throw error;
  }
};

export const addResource = async (resource: Resource): Promise<Resource> => {
  try {
    const user = await getCurrentUser();
    const dbResource = transformToDatabase(resource);

    const { data, error } = await supabase
      .from('resources')
      .insert({
        ...dbResource,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding resource:', error);
      throw new Error(`Failed to add resource: ${error.message}`);
    }

    return transformDatabaseResource(data);
  } catch (error) {
    console.error('Error in addResource:', error);
    throw error;
  }
};

export const updateResource = async (resourceId: string, updates: Partial<Resource>): Promise<Resource> => {
  try {
    const user = await getCurrentUser();

    // Get current resource first to merge updates
    const currentResource = await getResourceById(resourceId);
    if (!currentResource) {
      throw new Error('Resource not found');
    }

    // Merge updates with current resource
    const mergedResource = { ...currentResource, ...updates };
    const dbUpdates = transformToDatabase(mergedResource);

    const { data, error } = await supabase
      .from('resources')
      .update(dbUpdates)
      .eq('id', resourceId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating resource:', error);
      throw new Error(`Failed to update resource: ${error.message}`);
    }

    return transformDatabaseResource(data);
  } catch (error) {
    console.error('Error in updateResource:', error);
    throw error;
  }
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting resource:', error);
      throw new Error(`Failed to delete resource: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteResource:', error);
    throw error;
  }
};

// Helper functions for filtering and searching
export const getResourcesByType = async (type: string): Promise<Resource[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources by type:', error);
      throw new Error(`Failed to fetch resources by type: ${error.message}`);
    }

    return (data || []).map(transformDatabaseResource);
  } catch (error) {
    console.error('Error in getResourcesByType:', error);
    throw error;
  }
};

export const getRecentResources = async (limit = 5): Promise<Resource[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent resources:', error);
      throw new Error(`Failed to fetch recent resources: ${error.message}`);
    }

    return (data || []).map(transformDatabaseResource);
  } catch (error) {
    console.error('Error in getRecentResources:', error);
    throw error;
  }
};

// Resource Type Configuration Operations

export type ResourceTypeConfig = {
  [key in 'book' | 'video' | 'podcast' | 'article']: {
    label: string;
    icon: string;
    color: string;
    fields: string[];
  };
};

export const getResourceTypeConfig = async (): Promise<ResourceTypeConfig> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resource_type_configs')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching resource type config:', error);
      throw new Error(`Failed to fetch resource type config: ${error.message}`);
    }

    // Transform array of configs into the expected object format
    const config: ResourceTypeConfig = {
      book: { label: 'Books', icon: '📚', color: 'knowledge-book', fields: ['author', 'year', 'isbn'] },
      video: { label: 'Videos', icon: '🎬', color: 'knowledge-video', fields: ['creator', 'platform', 'duration', 'url'] },
      podcast: { label: 'Podcasts', icon: '🎧', color: 'knowledge-podcast', fields: ['creator', 'platform', 'duration', 'episode'] },
      article: { label: 'Articles', icon: '📄', color: 'knowledge-article', fields: ['author', 'platform', 'readTime', 'url'] }
    };

    // Override with user's custom configurations
    (data || []).forEach((item: DatabaseResourceTypeConfig) => {
      config[item.resource_type] = item.config;
    });

    return config;
  } catch (error) {
    console.error('Error in getResourceTypeConfig:', error);
    throw error;
  }
};

export const updateResourceTypeFields = async (
  resourceType: keyof ResourceTypeConfig,
  fields: string[]
): Promise<ResourceTypeConfig> => {
  try {
    const user = await getCurrentUser();
    const currentConfig = await getResourceTypeConfig();

    const updatedConfig = {
      ...currentConfig[resourceType],
      fields,
    };

    const { error } = await supabase
      .from('resource_type_configs')
      .upsert({
        user_id: user.id,
        resource_type: resourceType,
        config: updatedConfig,
      });

    if (error) {
      console.error('Error updating resource type fields:', error);
      throw new Error(`Failed to update resource type fields: ${error.message}`);
    }

    return await getResourceTypeConfig();
  } catch (error) {
    console.error('Error in updateResourceTypeFields:', error);
    throw error;
  }
};

export const addFieldToResourceType = async (
  resourceType: keyof ResourceTypeConfig,
  fieldName: string
): Promise<ResourceTypeConfig> => {
  try {
    const config = await getResourceTypeConfig();
    const currentFields = config[resourceType].fields;

    if (currentFields.includes(fieldName)) {
      return config;
    }

    const updatedFields = [...currentFields, fieldName];
    return await updateResourceTypeFields(resourceType, updatedFields);
  } catch (error) {
    console.error('Error in addFieldToResourceType:', error);
    throw error;
  }
};

export const removeFieldFromResourceType = async (
  resourceType: keyof ResourceTypeConfig,
  fieldName: string
): Promise<ResourceTypeConfig> => {
  try {
    const config = await getResourceTypeConfig();
    const currentFields = config[resourceType].fields;
    const updatedFields = currentFields.filter((field) => field !== fieldName);
    return await updateResourceTypeFields(resourceType, updatedFields);
  } catch (error) {
    console.error('Error in removeFieldFromResourceType:', error);
    throw error;
  }
};

// Real-time subscriptions for live updates
export const subscribeToResourceChanges = (callback: () => void) => {
  const channel = supabase
    .channel('resources_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'resources',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToResourceTypeConfigChanges = (callback: () => void) => {
  const channel = supabase
    .channel('resource_type_configs_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'resource_type_configs',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
