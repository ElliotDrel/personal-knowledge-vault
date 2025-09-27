import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorageAdapter, Resource } from '@/data/storageAdapter';
import { useAuth } from '@/hooks/useAuth';

export const useResources = () => {
  const { user } = useAuth();
  const storageAdapter = useStorageAdapter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load resources when auth state changes or component mounts
  const loadResources = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await storageAdapter.getResources();

      if (isMountedRef.current) {
        setResources(data);
      }
    } catch (err) {
      console.error('Error loading resources:', err);

      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load resources');
        setResources([]); // Fallback to empty array
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [storageAdapter]);

  // Load resources on mount and auth state changes
  useEffect(() => {
    loadResources();
  }, [loadResources, user?.id]); // Re-load when user changes (login/logout)

  // Subscribe to resource changes for real-time updates
  useEffect(() => {
    const unsubscribe = storageAdapter.subscribeToResourceChanges(() => {
      // Reload resources when changes occur
      loadResources();
    });

    return unsubscribe;
  }, [loadResources, user?.id, storageAdapter]);

  // For localStorage fallback, listen to storage events across tabs
  useEffect(() => {
    if (!user) {
      // Only listen to storage events when not authenticated (localStorage mode)
      const handleStorage = (event: StorageEvent) => {
        if (event.key === 'knowledge-vault-resources') {
          loadResources();
        }
      };

      window.addEventListener('storage', handleStorage);
      return () => {
        window.removeEventListener('storage', handleStorage);
      };
    }
  }, [loadResources, user]);

  return {
    resources,
    loading,
    error,
    refetch: loadResources,
    isOnline: storageAdapter.isOnline()
  };
};




