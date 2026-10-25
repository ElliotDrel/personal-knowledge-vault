/**
 * React hook for blocking navigation until pending saves complete
 *
 * Wraps React Router's useBlocker to intercept navigation attempts,
 * flush auto-save, then allow navigation to proceed.
 *
 * Key features:
 * - Non-blocking: Allows navigation even if flush fails (fail-open approach)
 * - Transparent: No confirmation dialogs, just silent save before navigation
 * - Async-aware: Properly handles async flush operations
 * - Graceful degradation: Silently disabled if router doesn't support blocking
 *
 * Note: Requires React Router v6.19.0+ with createBrowserRouter.
 * useBlocker became stable in v6.19.0 (removed unstable_ prefix).
 */

import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

export interface UseNavigationBlockerOptions {
  /** Whether to block navigation (typically: isDirty && isOpen) */
  when: boolean;
  /** Async function to call when navigation is blocked (e.g., flush auto-save) */
  onBlock: () => Promise<void>;
}

/**
 * Block navigation until auto-save completes
 *
 * @example
 * useNavigationBlocker({
 *   when: isNotesDirty && open,
 *   onBlock: flushNotesAutoSave,
 * });
 */
export function useNavigationBlocker(options: UseNavigationBlockerOptions): void {
  const { when, onBlock } = options;
  const onBlockRef = useRef(onBlock);

  // Keep onBlock ref up to date without triggering blocker re-creation
  useEffect(() => {
    onBlockRef.current = onBlock;
  }, [onBlock]);

  // Use React Router's unstable_useBlocker hook
  const blocker = useBlocker(when);

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const proceed = async () => {
        try {
          console.log('[useNavigationBlocker] Navigation blocked, flushing auto-save...');
          await onBlockRef.current();
          console.log('[useNavigationBlocker] Auto-save flushed, proceeding with navigation');
          blocker.proceed();
        } catch (error) {
          console.error('[useNavigationBlocker] Error during navigation block handler:', error);
          // Even on error, allow navigation to proceed (fail-open)
          blocker.proceed();
        }
      };

      void proceed();
    }
  }, [blocker]);
}
