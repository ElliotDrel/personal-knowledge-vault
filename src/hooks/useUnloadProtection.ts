/**
 * React hook for preventing browser tab close/refresh during active operations
 *
 * Uses the browser's native beforeunload event to show a confirmation dialog
 * when the user attempts to close/refresh the tab while operations are in progress.
 *
 * Key features:
 * - Only blocks during active operations (e.g., isSaving state)
 * - Native browser warning dialog
 * - Prevents accidental data loss from tab close/refresh
 * - Automatically adds/removes event listener based on condition
 */

import { useEffect } from 'react';

export interface UseUnloadProtectionOptions {
  /** Whether to block unload (typically: isSaving) */
  when: boolean;
  /** Optional custom message (note: modern browsers ignore this and show standard message) */
  message?: string;
}

/**
 * Prevent browser tab close/refresh during active operations
 *
 * @example
 * useUnloadProtection({
 *   when: isSaving, // Only block during active save
 * });
 */
export function useUnloadProtection(options: UseUnloadProtectionOptions): void {
  const { when, message = 'You have unsaved changes. Are you sure you want to leave?' } = options;

  useEffect(() => {
    if (!when) {
      // No protection needed
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Modern browsers require both of these to show the confirmation
      event.preventDefault();
      event.returnValue = message; // Standard requires this

      // Note: Most modern browsers ignore custom messages and show their own standard warning
      return message;
    };

    console.log('[useUnloadProtection] Enabling browser unload protection');
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log('[useUnloadProtection] Disabling browser unload protection');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);
}
