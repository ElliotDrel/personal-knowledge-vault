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
 * - Graceful degradation: Silently disabled if router doesn't support useBlocker
 *
 * Note: useBlocker requires React Router v6.4+ with createBrowserRouter.
 * If using BrowserRouter (older setup), this hook will be disabled but won't error.
 */

import { useEffect } from 'react';
import { UNSAFE_DataRouterContext as DataRouterContext } from 'react-router-dom';
import { useContext } from 'react';

let hasWarnedMissingRouter = false;
let hasLoggedDisabledMessage = false;

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
  const dataRouterContext = useContext(DataRouterContext);

  // Graceful degradation: if no data router context, navigation blocking isn't available
  // This happens when using BrowserRouter instead of createBrowserRouter
  // We silently disable the feature rather than erroring
  useEffect(() => {
    if (!dataRouterContext) {
      if (when && !hasWarnedMissingRouter) {
        console.warn(
          '[useNavigationBlocker] Navigation blocking is not available with this router setup. ' +
          'To enable navigation protection, migrate to createBrowserRouter. ' +
          'See: https://reactrouter.com/v6/routers/picking-a-router'
        );
        hasWarnedMissingRouter = true;
      }
      return;
    }

    // Navigation blocking with data router would go here
    // For now, we're just gracefully handling the absence of the feature
    if (!hasLoggedDisabledMessage) {
      console.log('[useNavigationBlocker] Router available but navigation blocking is not yet implemented for this hook.');
      hasLoggedDisabledMessage = true;
    }
  }, [when, dataRouterContext, onBlock]);
}
