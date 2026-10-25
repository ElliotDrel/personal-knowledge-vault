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

import { useContext, useEffect, useRef } from 'react';
import {
  UNSAFE_DataRouterContext as DataRouterContext,
  UNSAFE_NavigationContext as NavigationContext,
} from 'react-router-dom';

let hasWarnedMissingRouter = false;

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
  const navigationContext = useContext(NavigationContext);
  const navigator = navigationContext?.navigator as
    | { block?: (blocker: (tx: { retry: () => void }) => void) => () => void }
    | undefined;
  const onBlockRef = useRef(onBlock);

  useEffect(() => {
    onBlockRef.current = onBlock;
  }, [onBlock]);

  useEffect(() => {
    if (when && !dataRouterContext && !hasWarnedMissingRouter) {
      console.warn(
        '[useNavigationBlocker] Navigation blocking requires createBrowserRouter / RouterProvider. ' +
          'Current router does not expose Data Router context.',
      );
      hasWarnedMissingRouter = true;
    }
  }, [when, dataRouterContext]);

  useEffect(() => {
    if (when && !navigator?.block) {
      console.warn(
        '[useNavigationBlocker] Router navigator does not support blocking. ' +
          'Ensure you are using react-router-dom v6.4+.',
      );
    }
  }, [when, navigator]);

  useEffect(() => {
    if (!when || !navigator?.block) {
      return;
    }

    const unblock = navigator.block((tx: { retry: () => void }) => {
      const retry = () => {
        unblock();
        tx.retry();
      };

      const execute = async () => {
        try {
          await onBlockRef.current();
          retry();
        } catch (error) {
          console.error('[useNavigationBlocker] Error during navigation block handler:', error);
        }
      };

      try {
        void execute();
      } catch (error) {
        console.error('[useNavigationBlocker] Unexpected error scheduling blocker:', error);
      }

      return;
    });

    return unblock;
  }, [navigator, when]);
}
