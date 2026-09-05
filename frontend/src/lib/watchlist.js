import { isSupabaseConfigured, supabase } from './supabase';

export const WATCHLIST_LIMIT = 12;

const TICKER_PATTERN = /^[A-Z0-9][A-Z0-9./-]{0,11}$/;

export function uniqueTickers(...lists) {
  const next = [];
  for (const list of lists) {
    for (const raw of list || []) {
      const symbol = String(raw || '').trim().toUpperCase();
      if (!TICKER_PATTERN.test(symbol) || next.includes(symbol)) continue;
      next.push(symbol);
      if (next.length >= WATCHLIST_LIMIT) return next;
    }
  }
  return next;
}

/**
 * Reads the signed-in user's saved watchlist. Row-level security scopes this to
 * the caller, so no user id needs to be passed or trusted here.
 */
export async function fetchRemoteWatchlist() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('watchlists')
    .select('symbols')
    .maybeSingle();
  if (error) throw error;
  return uniqueTickers(data?.symbols);
}

/** Upserts the signed-in user's watchlist. */
export async function saveRemoteWatchlist(userId, symbols) {
  if (!isSupabaseConfigured || !userId) return;
  const { error } = await supabase
    .from('watchlists')
    .upsert({ user_id: userId, symbols: uniqueTickers(symbols) }, { onConflict: 'user_id' });
  if (error) throw error;
}
