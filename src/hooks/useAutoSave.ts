/**
 * React hook for auto-saving data with debouncing and exponential retry logic
 *
 * Provides silent auto-save functionality with:
 * - Debounced saves (default 60s after last change)
 * - Exponential backoff retry (up to 5 attempts by default)
 * - Manual flush for critical triggers (AI check, dialog close, navigation)
 * - Error state management for UI feedback
 * - Clean resource management (flush on unmount)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDebouncedCallback, type DebouncedState } from 'use-debounce';

export interface UseAutoSaveOptions<T> {
  /** Current value to auto-save */
  value: T;
  /** Async save function called with value */
  onSave: (value: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 60000ms) */
  debounceMs?: number;
  /** Maximum retry attempts on failure (default: 5) */
  maxRetries?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /**
   * Optional serializer for comparisons/logging.
   * Use this for non-primitive values (e.g., forms) so deep equality is respected.
   */
  serializeValue?: (value: T) => unknown;
}

export interface UseAutoSaveReturn {
  /** Whether current value differs from last saved value */
  isDirty: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Error from last save attempt (null if no error) */
  saveError: Error | null;
  /** Current retry attempt number (0 if no retries) */
  retryCount: number;
  /** Force immediate save, canceling any pending debounced save */
  flushPendingUpdates: () => Promise<void>;
  /** Clear error state (e.g., after user dismisses notification) */
  clearError: () => void;
}

/**
 * Calculate exponential backoff delay for retry attempts
 * @param attempt - Zero-based attempt number (0 = first retry)
 * @returns Delay in milliseconds (capped at 8000ms)
 */
function getRetryDelay(attempt: number): number {
  return Math.min(500 * Math.pow(2, attempt), 8000);
}

/**
 * Build a concise log summary so we can see what payload reached persistence.
 */
function summarizeValueForLog(value: unknown) {
  if (typeof value === 'string') {
    const preview = value.length > 120 ? `${value.slice(0, 120)}...` : value;
    return { type: 'string', length: value.length, preview };
  }

  if (typeof value === 'object' && value !== null) {
    try {
      const serialized = JSON.stringify(value);
      const preview = serialized.length > 200 ? `${serialized.slice(0, 200)}...` : serialized;
      return { type: 'object', length: serialized.length, preview };
    } catch (error) {
      return { type: 'object', preview: '[unserializable]', error };
    }
  }

  return { type: typeof value, value };
}

/**
 * Auto-save hook with debouncing and retry logic
 *
 * @example
 * const { isDirty, isSaving, saveError, flushPendingUpdates } = useAutoSave({
 *   value: noteContent,
 *   onSave: async (content) => {
 *     await storageAdapter.updateNote(noteId, { content });
 *   },
 *   debounceMs: 60000,
 *   maxRetries: 5,
 * });
 *
 * // In critical triggers (AI check, close, navigation):
 * await flushPendingUpdates();
 */
export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const {
    value,
    onSave,
    debounceMs = 60000,
    maxRetries = 5,
    enabled = true,
    serializeValue,
  } = options;

  // State for UI feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Track last successfully saved value (ref to avoid re-renders)
  const lastSavedValueRef = useRef<T>(value);
  const lastSavedSerializedRef = useRef<unknown>(
    serializeValue ? serializeValue(value) : (value as unknown)
  );
  const latestSaveIdRef = useRef(0);
  const activeSaveCountRef = useRef(0);

  const serializedValue = serializeValue ? serializeValue(value) : (value as unknown);

  // Compute dirty state
  const isDirty = !Object.is(serializedValue, lastSavedSerializedRef.current);

  /**
   * Core save function with exponential retry logic
   * @param valueToSave - Value to save
   * @param attemptNumber - Current attempt (0-indexed)
   */
  const performSave = useCallback(
    async (valueToSave: T, attemptNumber: number = 0, existingSaveId?: number): Promise<void> => {
      const requestId = existingSaveId ?? ++latestSaveIdRef.current;
      const serializedValueToSave = serializeValue
        ? serializeValue(valueToSave)
        : (valueToSave as unknown);

      activeSaveCountRef.current += 1;
      if (activeSaveCountRef.current === 1) {
        setIsSaving(true);
      }
      setRetryCount(attemptNumber);

      try {
        console.log(
          `[useAutoSave] Starting save attempt ${attemptNumber + 1}/${maxRetries + 1}`,
          {
            requestId,
            attempt: attemptNumber + 1,
            valueSummary: summarizeValueForLog(valueToSave),
          }
        );

        await onSave(valueToSave);

        console.log('[useAutoSave] Save successful, value synced', {
          requestId,
          valueSummary: summarizeValueForLog(valueToSave),
        });

        if (requestId === latestSaveIdRef.current) {
          // Success: update last saved value and clear error state
          lastSavedValueRef.current = valueToSave;
          lastSavedSerializedRef.current = serializedValueToSave;
          setSaveError(null);
          setRetryCount(0);
        } else {
          console.log('[useAutoSave] Save result ignored (outdated request)', {
            requestId,
            latestSaveId: latestSaveIdRef.current,
          });
        }
      } catch (error) {
        const saveErr = error instanceof Error ? error : new Error(String(error));

        console.error(`[useAutoSave] Save failed (attempt ${attemptNumber + 1}):`, saveErr);

        // Check if we have retries remaining
        if (attemptNumber < maxRetries) {
          const delay = getRetryDelay(attemptNumber);
          console.log(
            `[useAutoSave] Retrying in ${delay}ms (attempt ${attemptNumber + 2}/${maxRetries + 1})`
          );

          // Wait with exponential backoff, then retry
          await new Promise((resolve) => setTimeout(resolve, delay));
          return performSave(valueToSave, attemptNumber + 1, requestId);
        } else {
          // Max retries exhausted
          console.error('[useAutoSave] Max retries exhausted, save failed permanently');
          if (requestId === latestSaveIdRef.current) {
            setSaveError(saveErr);
          }
          throw saveErr; // Let caller handle if needed
        }
      } finally {
        activeSaveCountRef.current = Math.max(0, activeSaveCountRef.current - 1);
        if (activeSaveCountRef.current === 0) {
          setIsSaving(false);
        }
      }
    },
    [onSave, maxRetries, serializeValue]
  );

  /**
   * Debounced save trigger for background auto-save
   */
  const debouncedSave: DebouncedState<(valueToSave: T) => Promise<void>> =
    useDebouncedCallback(
      async (valueToSave: T) => {
        if (!enabled) return;

        try {
          await performSave(valueToSave, 0);
        } catch (error) {
          // Error already logged and state updated in performSave
          // Catch here to prevent unhandled promise rejection
        }
      },
      debounceMs
    );

  /**
   * Auto-trigger effect: debounced save when value changes
   */
  useEffect(() => {
    if (!enabled || !isDirty) return;

    debouncedSave(value);
  }, [value, isDirty, enabled, debouncedSave]);

  /**
   * Flush pending updates immediately (for critical triggers)
   */
  const flushPendingUpdates = useCallback(async () => {
    // Cancel any pending debounced save
    debouncedSave.cancel();

    // Nothing to save if not dirty
    if (!isDirty) return;

    // Save immediately (errors thrown to caller)
    await performSave(value, 0);
  }, [debouncedSave, isDirty, value, performSave]);

  /**
   * Clear error state (for manual dismissal)
   */
  const clearError = useCallback(() => {
    setSaveError(null);
    setRetryCount(0);
  }, []);

  /**
   * Cleanup: flush pending saves on unmount
   */
  useEffect(() => {
    return () => {
      const maybePromise = debouncedSave.flush();
      if (maybePromise) {
        // Fire and forget in cleanup but log errors
        maybePromise.catch((error) => {
          console.error('[useAutoSave] Flush error during cleanup:', error);
        });
      }
    };
  }, [debouncedSave]);

  return {
    isDirty,
    isSaving,
    saveError,
    retryCount,
    flushPendingUpdates,
    clearError,
  };
}
