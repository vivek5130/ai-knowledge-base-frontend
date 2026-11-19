import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Calls `fetcher` now and every `intervalMs` while the tab is visible.
 * Returns { data, error, loading, refresh, updatedAt }.
 */
export function usePolling(fetcher, intervalMs) {
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const data = await fetcherRef.current();
      setState({ data, error: null, loading: false, updatedAt: new Date() });
    } catch (error) {
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!intervalMs) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { ...state, refresh };
}
