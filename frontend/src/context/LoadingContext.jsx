import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { registerLoaderHandlers } from '../utils/loaderBridge';

const LoadingContext = createContext(null);

// Matches the LoadingOverlay's full 4-phase animation length (see
// LoadingOverlay.jsx PHASE_TIMINGS). Kept in one place so the two files
// can't drift out of sync.
export const LOADER_MIN_VISIBLE_MS = 1700;

/**
 * Reference-counted loading state, so multiple concurrent triggers (e.g. a
 * route change firing at the same moment as an API call) don't cause the
 * overlay to hide early just because one of them finished first — it only
 * hides once EVERY active request/transition has completed.
 *
 * Also enforces a minimum visible duration equal to the full animation
 * length: if the underlying work finishes in 50ms, we still let the
 * premium 4-phase sequence play out fully rather than yanking it away
 * mid-animation, which would look broken rather than "premium."
 */
export function LoadingProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const activeCount = useRef(0);
  const shownAt = useRef(null);
  const hideTimeoutRef = useRef(null);

  const showLoader = useCallback(() => {
    activeCount.current += 1;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (!isVisible) {
      shownAt.current = Date.now();
      setIsVisible(true);
    }
  }, [isVisible]);

  const hideLoader = useCallback(() => {
    activeCount.current = Math.max(0, activeCount.current - 1);
    if (activeCount.current > 0) return;

    const elapsed = shownAt.current ? Date.now() - shownAt.current : LOADER_MIN_VISIBLE_MS;
    const remaining = Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed);

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      shownAt.current = null;
    }, remaining);
  }, []);

  /**
   * Convenience wrapper: shows the loader for the duration of an async
   * call, hides it afterward (success or failure), respecting the same
   * reference-counting and minimum-duration rules.
   */
  const withLoader = useCallback(
    async (promiseFactory) => {
      showLoader();
      try {
        return await promiseFactory();
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader]
  );

  // Let the plain-JS axios module (api.js) trigger this loader for any
  // request that explicitly opts in — see loaderBridge.js.
  useEffect(() => {
    registerLoaderHandlers(showLoader, hideLoader);
  }, [showLoader, hideLoader]);

  return (
    <LoadingContext.Provider value={{ isVisible, showLoader, hideLoader, withLoader }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within a LoadingProvider');
  return ctx;
}
