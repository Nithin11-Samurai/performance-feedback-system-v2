import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLoading } from '../context/LoadingContext';

/**
 * Shows the branded LoadingOverlay on every route change. The very first
 * render is skipped here — initial app load is already covered by the
 * auth-bootstrap loader in App.jsx, so we don't want to trigger it twice
 * back-to-back on first paint.
 *
 * The overlay's own minimum-visible-duration logic (LoadingContext) takes
 * care of letting the full animation play out even though route changes
 * in a client-rendered SPA are otherwise instantaneous.
 */
export function useRouteChangeLoader() {
  const location = useLocation();
  const { showLoader, hideLoader } = useLoading();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    showLoader();
    // Route content is already rendered synchronously by React Router by
    // the time this effect runs; a short delay just gives the new page's
    // first paint a moment to settle before we start the fade-out.
    const timeout = setTimeout(() => hideLoader(), 50);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}
