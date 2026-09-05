import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  fetchRemoteWatchlist,
  saveRemoteWatchlist,
  uniqueTickers,
  WATCHLIST_LIMIT,
} from '../lib/watchlist';

function reportSyncFailure(action, error) {
  console.warn(`[watchlist] could not ${action}:`, error?.message || error, error);
}

/**
 * Watchlists belong to accounts only. Guests see an empty list; the page that
 * calls toggleWatchlist is responsible for opening signup when they try to add.
 */
export function useWatchlist() {
  const { user, isSignedIn, status } = useAuth();
  const userId = user?.id ?? null;
  const [watchlist, setWatchlist] = useState([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status === 'loading') return undefined;
    if (!isSignedIn || !userId) {
      setWatchlist([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchRemoteWatchlist();
        if (cancelled) return;
        setWatchlist(remote);
      } catch (error) {
        reportSyncFailure('read your saved watchlist', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, status, userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleWatchlist = useCallback((ticker) => {
    if (!isSignedIn || !userId || !ticker) return false;
    setWatchlist((current) => {
      const symbol = String(ticker).trim().toUpperCase();
      const next = current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : uniqueTickers(current, [symbol]).slice(0, WATCHLIST_LIMIT);
      saveRemoteWatchlist(userId, next)
        .catch((error) => reportSyncFailure('save your watchlist', error));
      return next;
    });
    return true;
  }, [isSignedIn, userId]);

  return { watchlist, toggleWatchlist };
}
