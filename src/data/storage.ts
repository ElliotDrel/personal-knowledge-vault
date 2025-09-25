import { Resource, mockResources, resourceTypeConfig as defaultResourceTypeConfig } from './mockData';

const STORAGE_KEY = 'knowledge-vault-resources';
const CONFIG_STORAGE_KEY = 'knowledge-vault-resource-types';

// Load resources from localStorage, falling back to mock data
export const loadResources = (): Resource[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsedResources = JSON.parse(stored);
      // Validate that it's an array and has at least some resources
      if (Array.isArray(parsedResources) && parsedResources.length > 0) {
        return parsedResources;
      }
    }
  } catch (error) {
    console.warn('Error loading resources from localStorage:', error);
  }
  
  // First time loading - initialize with mock data
  const initialResources = [...mockResources];
  saveResources(initialResources);
  return initialResources;
};

// Save resources to localStorage
export const saveResources = (resources: Resource[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
  } catch (error) {
    console.error('Error saving resources to localStorage:', error);
  }
};

// Add a new resource
export const addResource = (resource: Resource): Resource[] => {
  const resources = loadResources();
  const updatedResources = [resource, ...resources];
  saveResources(updatedResources);
  return updatedResources;
};

// Update an existing resource
export const updateResource = (resourceId: string, updates: Partial<Resource>): Resource[] => {
  const resources = loadResources();
  const updatedResources = resources.map(resource => 
    resource.id === resourceId 
      ? { ...resource, ...updates, updatedAt: new Date().toISOString() }
      : resource
  );
  saveResources(updatedResources);
  return updatedResources;
};

// Get a single resource by ID
export const getResourceById = (id: string): Resource | undefined => {
  const resources = loadResources();
  return resources.find(resource => resource.id === id);
};

// Get resources by type
export const getResourcesByType = (type: string): Resource[] => {
  const resources = loadResources();
  return resources.filter(resource => resource.type === type);
};

// Get recent resources
export const getRecentResources = (limit = 5): Resource[] => {
  const resources = loadResources();
  return resources
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
};

// Clear all data (for development/testing)
export const clearAllData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Export a single resources array that components can use
// This will be initialized with localStorage data
let cachedResources: Resource[] | null = null;

export const getResources = (): Resource[] => {
  if (!cachedResources) {
    cachedResources = loadResources();
  }
  return cachedResources;
};

// Refresh the cache (call this after adding/updating resources)
export const refreshResourcesCache = (): Resource[] => {
  cachedResources = loadResources();
  return cachedResources;
};

// Resource Type Configuration Management
export type ResourceTypeConfig = typeof defaultResourceTypeConfig;

// Load resource type configuration from localStorage, falling back to defaults
export const loadResourceTypeConfig = (): ResourceTypeConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsedConfig = JSON.parse(stored);
      // Validate that it has the expected structure
      if (parsedConfig && typeof parsedConfig === 'object') {
        return { ...defaultResourceTypeConfig, ...parsedConfig };
      }
    }
  } catch (error) {
    console.warn('Error loading resource type config from localStorage:', error);
  }

  // First time loading - initialize with default config
  const initialConfig = { ...defaultResourceTypeConfig };
  saveResourceTypeConfig(initialConfig);
  return initialConfig;
};

// Save resource type configuration to localStorage
export const saveResourceTypeConfig = (config: ResourceTypeConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving resource type config to localStorage:', error);
  }
};

// Update a specific resource type's fields
export const updateResourceTypeFields = (
  resourceType: keyof ResourceTypeConfig,
  fields: string[]
): ResourceTypeConfig => {
  const config = loadResourceTypeConfig();
  const updatedConfig = {
    ...config,
    [resourceType]: {
      ...config[resourceType],
      fields
    }
  };
  saveResourceTypeConfig(updatedConfig);
  return updatedConfig;
};

// Add a field to a resource type
export const addFieldToResourceType = (
  resourceType: keyof ResourceTypeConfig,
  fieldName: string
): ResourceTypeConfig => {
  const config = loadResourceTypeConfig();
  const currentFields = config[resourceType].fields;

  // Don't add duplicate fields
  if (currentFields.includes(fieldName)) {
    return config;
  }

  const updatedFields = [...currentFields, fieldName];
  return updateResourceTypeFields(resourceType, updatedFields);
};

// Remove a field from a resource type
export const removeFieldFromResourceType = (
  resourceType: keyof ResourceTypeConfig,
  fieldName: string
): ResourceTypeConfig => {
  const config = loadResourceTypeConfig();
  const currentFields = config[resourceType].fields;
  const updatedFields = currentFields.filter(field => field !== fieldName);
  return updateResourceTypeFields(resourceType, updatedFields);
};

// Get current resource type configuration (cached version)
let cachedResourceTypeConfig: ResourceTypeConfig | null = null;

export const getResourceTypeConfig = (): ResourceTypeConfig => {
  if (!cachedResourceTypeConfig) {
    cachedResourceTypeConfig = loadResourceTypeConfig();
  }
  return cachedResourceTypeConfig;
};

// Refresh the resource type config cache
export const refreshResourceTypeConfigCache = (): ResourceTypeConfig => {
  cachedResourceTypeConfig = loadResourceTypeConfig();
  return cachedResourceTypeConfig;
};