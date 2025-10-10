import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorageAdapter, Resource } from '@/data/storageAdapter';
import { useAuth } from '@/hooks/useAuth';

const parseTimestamp = (value?: string) => {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
};

const mergeResources = (previous: Resource[], incoming: Resource[]) => {
  if (!previous.length) {
    return incoming;
  }

  const byId = new Map(previous.map((resource) => [resource.id, resource]));

  incoming.forEach((resource) => {
    const current = byId.get(resource.id);
    if (!current) {
      byId.set(resource.id, resource);
      return;
    }

    const currentTime = parseTimestamp(current.updatedAt);
    const incomingTime = parseTimestamp(resource.updatedAt);

    if (currentTime === null || incomingTime === null) {
      // If we cannot compare timestamps reliably, prefer the incoming value
      byId.set(resource.id, resource);
      return;
    }

    if (incomingTime >= currentTime) {
      byId.set(resource.id, resource);
    }
  });

  // Only keep resources returned from Supabase; drop deleted entries
  return incoming.map((resource) => byId.get(resource.id) ?? resource);
};

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
        setResources((previous) => mergeResources(previous, data));
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

  // Load resources on mount and when the authenticated user changes
  useEffect(() => {
    loadResources();
  }, [loadResources, user?.id]);

  // Subscribe to resource changes for real-time updates
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const unsubscribe = storageAdapter.subscribeToResourceChanges(() => {
      // Clear any pending refetch
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Wait 500ms before refetching to allow database replication
      // This prevents reading stale data from read replicas
      timeoutId = setTimeout(() => {
        loadResources();
      }, 500);
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [loadResources, user?.id, storageAdapter]);

  const upsertResource = useCallback((updatedResource: Resource) => {
    setResources((previous) => {
      const exists = previous.some((resource) => resource.id === updatedResource.id);
      if (!exists) {
        return [...previous, updatedResource];
      }

      return previous.map((resource) =>
        resource.id === updatedResource.id ? updatedResource : resource
      );
    });
  }, []);

  return {
    resources,
    loading,
    error,
    refetch: loadResources,
    upsertResource,
  };
};




