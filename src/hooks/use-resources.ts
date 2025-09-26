import { useEffect, useSyncExternalStore } from 'react';
import {
  RESOURCES_STORAGE_KEY,
  getResourcesSnapshot,
  refreshResourcesCache,
  subscribeToResourceChanges,
} from '@/data/storage';

export const useResources = () => {
  const resources = useSyncExternalStore(
    subscribeToResourceChanges,
    getResourcesSnapshot,
    getResourcesSnapshot
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === RESOURCES_STORAGE_KEY) {
        refreshResourcesCache();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return resources;
};
