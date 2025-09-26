import { Resource, mockResources, resourceTypeConfig as defaultResourceTypeConfig } from './mockData';

export const RESOURCES_STORAGE_KEY = 'knowledge-vault-resources';
const CONFIG_STORAGE_KEY = 'knowledge-vault-resource-types';

type ResourceListener = () => void;

const resourceListeners = new Set<ResourceListener>();
let resourceCache: Resource[] | null = null;

const notifyResourceListeners = () => {
  resourceListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Error notifying resource listener:', error);
    }
  });
};

export const subscribeToResourceChanges = (listener: ResourceListener): (() => void) => {
  resourceListeners.add(listener);
  return () => {
    resourceListeners.delete(listener);
  };
};

const writeResourcesToLocalStorage = (resources: Resource[]) => {
  try {
    localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(resources));
  } catch (error) {
    console.error('Error saving resources to localStorage:', error);
  }
};

const readResourcesFromLocalStorage = (): Resource[] => {
  try {
    const stored = localStorage.getItem(RESOURCES_STORAGE_KEY);
    if (stored) {
      const parsedResources = JSON.parse(stored);
      if (Array.isArray(parsedResources)) {
        return parsedResources;
      }
    }
  } catch (error) {
    console.warn('Error loading resources from localStorage:', error);
  }

  const initialResources = [...mockResources];
  writeResourcesToLocalStorage(initialResources);
  return initialResources;
};

const ensureResourceCache = (): Resource[] => {
  if (!resourceCache) {
    resourceCache = readResourcesFromLocalStorage();
  }
  return resourceCache;
};

// Load resources from localStorage, falling back to mock data
export const loadResources = (): Resource[] => {
  const resources = readResourcesFromLocalStorage();
  resourceCache = resources;
  return resources;
};

// Save resources to localStorage and notify subscribers
export const saveResources = (resources: Resource[]): void => {
  writeResourcesToLocalStorage(resources);
  resourceCache = resources;
  notifyResourceListeners();
};

// Add a new resource
export const addResource = (resource: Resource): Resource[] => {
  const resources = ensureResourceCache();
  const updatedResources = [resource, ...resources];
  saveResources(updatedResources);
  return updatedResources;
};

// Update an existing resource
export const updateResource = (resourceId: string, updates: Partial<Resource>): Resource[] => {
  const resources = ensureResourceCache();
  const updatedResources = resources.map((resource) =>
    resource.id === resourceId
      ? { ...resource, ...updates, updatedAt: new Date().toISOString() }
      : resource
  );
  saveResources(updatedResources);
  return updatedResources;
};

// Get a single resource by ID
export const getResourceById = (id: string): Resource | undefined => {
  const resources = ensureResourceCache();
  return resources.find((resource) => resource.id === id);
};

// Get resources by type
export const getResourcesByType = (type: string): Resource[] => {
  const resources = ensureResourceCache();
  return resources.filter((resource) => resource.type === type);
};

// Get recent resources
export const getRecentResources = (limit = 5): Resource[] => {
  const resources = ensureResourceCache();
  return [...resources]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
};

// Clear all data (for development/testing)
export const clearAllData = (): void => {
  try {
    localStorage.removeItem(RESOURCES_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing data:', error);
  }

  const resetResources = [...mockResources];
  writeResourcesToLocalStorage(resetResources);
  resourceCache = resetResources;
  notifyResourceListeners();
};

// Export snapshots for hooks/components
export const getResources = (): Resource[] => ensureResourceCache();
export const getResourcesSnapshot = (): Resource[] => ensureResourceCache();

// Refresh the cache (call this after external updates)
export const refreshResourcesCache = (): Resource[] => {
  const resources = readResourcesFromLocalStorage();
  resourceCache = resources;
  notifyResourceListeners();
  return resources;
};

// Resource Type Configuration Management
export type ResourceTypeConfig = typeof defaultResourceTypeConfig;

// Load resource type configuration from localStorage, falling back to defaults
export const loadResourceTypeConfig = (): ResourceTypeConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const parsedConfig = JSON.parse(stored);
      if (parsedConfig && typeof parsedConfig === 'object') {
        return { ...defaultResourceTypeConfig, ...parsedConfig };
      }
    }
  } catch (error) {
    console.warn('Error loading resource type config from localStorage:', error);
  }

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
      fields,
    },
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
  const updatedFields = currentFields.filter((field) => field !== fieldName);
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
