import { useCallback, useEffect, useState } from 'react';
import { FinnhubKeyError, fetchGlobalNews, fetchIndianNews, getFinnhubKey } from '@/services/news/client';
import type { NewsItem } from '@/services/news/types';

export interface NewsState {
  items: NewsItem[];
  loading: boolean;
  /** The Indian feed endpoint isn't reachable (e.g. the hosted site has no worker). */
  indianUnavailable: boolean;
  /** Publishers whose feed failed this time. */
  failed: string[];
  globalError: string | null;
  fetchedAt: string | null;
  refresh: () => void;
}

export function useNews(finnhubKey = getFinnhubKey()): NewsState {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Omit<NewsState, 'refresh'>>({ items: [], loading: true, indianUnavailable: false, failed: [], globalError: null, fetchedAt: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    Promise.allSettled([fetchIndianNews(ctrl.signal), finnhubKey ? fetchGlobalNews(finnhubKey, ctrl.signal) : Promise.resolve([])]).then(([indian, global]) => {
      if (ctrl.signal.aborted) return;
      const local = indian.status === 'fulfilled' ? indian.value.items : [];
      const world = global.status === 'fulfilled' ? global.value : [];
      setState({
        items: [...local, ...world].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        loading: false,
        indianUnavailable: indian.status === 'rejected',
        failed: indian.status === 'fulfilled' ? indian.value.failed : [],
        globalError: global.status === 'rejected' ? (global.reason instanceof FinnhubKeyError ? global.reason.message : 'Finnhub could not be reached. Try again shortly.') : null,
        fetchedAt: new Date().toISOString(),
      });
    });
    return () => ctrl.abort();
  }, [finnhubKey, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refresh };
}
