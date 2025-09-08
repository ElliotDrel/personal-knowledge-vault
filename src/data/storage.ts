import { Resource, mockResources } from './mockData';

const STORAGE_KEY = 'knowledge-vault-resources';

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