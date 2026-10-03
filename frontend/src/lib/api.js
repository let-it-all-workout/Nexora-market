// Dev: use same-origin `/api` so Vite can proxy to the backend (see vite.config.js).
// Prod: set VITE_API_BASE at build time, or run a reverse proxy that serves /api -> backend.
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 12000;
const responseCache = new Map();
const inFlightRequests = new Map();

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const relayAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', relayAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // No cookies are sent to this API: identity lives in Supabase, and the
    // market-data routes are public reads.
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(
        `That request took longer than ${timeoutMs / 1000}s. Confirm the backend is running on port 4000.`,
      );
    }
    const msg = err?.message || '';
    if (err instanceof TypeError || /failed to fetch/i.test(msg)) {
      throw new Error(
        'Cannot reach the API. Start the backend on port 4000 (npm run dev in the backend folder). With npm run dev in the frontend, calls use /api and the Vite proxy forwards to the backend.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', relayAbort);
  }
}

async function getJson(url, {
  timeoutMs = REQUEST_TIMEOUT_MS,
  ttlMs = 60_000,
  cacheIf,
} = {}) {
  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.at < ttlMs) return cached.data;
  if (inFlightRequests.has(url)) return inFlightRequests.get(url);

  const request = (async () => {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    if (!cacheIf || cacheIf(data)) {
      responseCache.set(url, { data, at: Date.now() });
      if (responseCache.size > 250) {
        responseCache.delete(responseCache.keys().next().value);
      }
    }
    return data;
  })();

  inFlightRequests.set(url, request);
  try {
    return await request;
  } finally {
    inFlightRequests.delete(url);
  }
}

export async function fetchStock(symbol, options = {}) {
  const {
    range = '3mo',
    interval = '1d',
    period1,
    period2,
  } = options;
  const params = new URLSearchParams();
  if (period1 && period2) {
    params.set('interval', interval);
    params.set('period1', String(period1));
    params.set('period2', String(period2));
  } else {
    params.set('range', range);
    params.set('interval', interval);
  }
  return getJson(`${API_BASE}/stocks/${symbol}?${params.toString()}`, {
    ttlMs: 90_000,
    timeoutMs: 20000,
    cacheIf: (data) => Array.isArray(data?.series) && data.series.length > 0,
  });
}

export async function fetchCrypto(id, days = 90, options = {}) {
  const params = new URLSearchParams({ days: String(days) });
  if (options.symbol) params.set('symbol', String(options.symbol));
  return getJson(`${API_BASE}/crypto/${encodeURIComponent(id)}?${params.toString()}`, {
    ttlMs: 90_000,
    timeoutMs: 28000,
    cacheIf: (data) => Array.isArray(data?.series) && data.series.length > 0,
  });
}

export async function fetchStockQuotes(symbols) {
  return getJson(
    `${API_BASE}/stocks/quotes?symbols=${encodeURIComponent(symbols.join(','))}`,
    {
      timeoutMs: 25000,
      ttlMs: 30_000,
      cacheIf: (data) => Array.isArray(data?.quotes) && data.quotes.length > 0,
    },
  ).catch(() => ({ quotes: [] }));
}

export async function fetchStockInfo(symbol) {
  return getJson(`${API_BASE}/stocks/info/${encodeURIComponent(symbol)}`, { ttlMs: 300_000 })
    .catch(() => null);
}

export async function fetchStockNews(symbol) {
  const q = encodeURIComponent(symbol);
  return getJson(`${API_BASE}/stocks/news?symbol=${q}`, { timeoutMs: 8000, ttlMs: 120_000 })
    .catch(() => ({ news: [] }));
}

export async function searchStocks(q) {
  if (!q.trim()) return [];
  const response = await fetchWithTimeout(`${API_BASE}/stocks/search/query?q=${encodeURIComponent(q)}`, {}, 8000);
  if (!response.ok) return [];
  const data = await response.json();
  return data.results || [];
}

export async function fetchCryptoMarkets(options = {}) {
  const params = new URLSearchParams();
  if (options.pages) params.set('pages', String(options.pages));
  if (options.perPage) params.set('perPage', String(options.perPage));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return getJson(`${API_BASE}/crypto/markets${suffix}`, {
    timeoutMs: 20000,
    ttlMs: 30_000,
    cacheIf: (data) => Array.isArray(data?.coins) && data.coins.length >= 50,
  }).catch(() => ({ coins: [] }));
}

/** Yahoo batch quotes for overview coins when CoinGecko is empty or rate-limited */
export async function fetchCryptoYahooOverviewQuotes() {
  return getJson(`${API_BASE}/crypto/yahoo-overview-quotes`, {
    timeoutMs: 12000,
    ttlMs: 30_000,
    cacheIf: (data) => Array.isArray(data?.quotes) && data.quotes.length > 0,
  }).catch(() => ({ quotes: [] }));
}

export async function fetchCryptoInfo(id) {
  return getJson(`${API_BASE}/crypto/info/${encodeURIComponent(id)}`, { ttlMs: 300_000 })
    .catch(() => null);
}

export async function fetchCryptoNews(id) {
  return getJson(
    `${API_BASE}/crypto/news/${encodeURIComponent(id)}`,
    { timeoutMs: 8000, ttlMs: 120_000 },
  ).catch(() => ({ news: [] }));
}

export async function searchCrypto(q) {
  if (!q.trim()) return [];
  const response = await fetchWithTimeout(`${API_BASE}/crypto/search/query?q=${encodeURIComponent(q)}`, {}, 8000);
  if (!response.ok) return [];
  const data = await response.json();
  return data.results || [];
}

export async function fetchNgxStocks() {
  return getJson(`${API_BASE}/ngx/stocks`, {
    ttlMs: 30_000,
    timeoutMs: 25000,
    cacheIf: (data) => Array.isArray(data?.stocks) && data.stocks.length > 0,
  });
}

export async function fetchNgxMarket() {
  return getJson(`${API_BASE}/ngx/market`, {
    ttlMs: 30_000,
    timeoutMs: 20000,
    cacheIf: (data) => data && (data.asi != null || Number.isFinite(data.advancers)),
  });
}

export async function fetchNgxPrice(symbol) {
  return getJson(`${API_BASE}/ngx/prices/${encodeURIComponent(symbol)}`, { ttlMs: 30_000 });
}

export async function fetchNgxCompany(symbol) {
  return getJson(`${API_BASE}/ngx/company/${encodeURIComponent(symbol)}`, {
    ttlMs: 300_000,
    timeoutMs: 20000,
  }).catch(() => null);
}

export async function fetchNgxHistory(symbol, options = {}) {
  const params = new URLSearchParams();
  if (options.from && options.to) {
    params.set('from', options.from);
    params.set('to', options.to);
  } else {
    params.set('days', String(options.days || 30));
  }
  return getJson(
    `${API_BASE}/ngx/history/${encodeURIComponent(symbol)}?${params.toString()}`,
    { ttlMs: 90_000, timeoutMs: 20000, cacheIf: (data) => Array.isArray(data?.series) && data.series.length > 0 },
  );
}

export async function fetchNgxIndexHistory(code = 'ASI', options = {}) {
  const params = new URLSearchParams();
  if (options.from && options.to) {
    params.set('from', options.from);
    params.set('to', options.to);
  } else {
    params.set('days', String(options.days || 30));
  }
  return getJson(
    `${API_BASE}/ngx/indices/${encodeURIComponent(code)}/history?${params.toString()}`,
    { ttlMs: 90_000, timeoutMs: 20000, cacheIf: (data) => Array.isArray(data?.series) && data.series.length > 0 },
  );
}

export async function fetchNgxNews(query) {
  return getJson(
    `${API_BASE}/ngx/news?q=${encodeURIComponent(query)}`,
    { timeoutMs: 8000, ttlMs: 120_000 },
  ).catch(() => ({ news: [] }));
}

export async function searchNgx(q) {
  if (!q.trim()) return [];
  const response = await fetchWithTimeout(`${API_BASE}/ngx/search?q=${encodeURIComponent(q)}`, {}, 8000);
  if (!response.ok) return [];
  const data = await response.json();
  return data.results || [];
}

export async function fetchNgxOutlook(symbol, years = 3) {
  return getJson(
    `${API_BASE}/ngx/outlook/${encodeURIComponent(symbol)}?years=${encodeURIComponent(years)}`,
    { ttlMs: 180_000, timeoutMs: 30000 },
  );
}

export async function fetchStockOutlook(symbol, years = 3) {
  return getJson(
    `${API_BASE}/stocks/${encodeURIComponent(symbol)}/outlook?years=${encodeURIComponent(years)}`,
    { ttlMs: 180_000, timeoutMs: 25000 },
  );
}

export async function fetchCryptoOutlook(id, years = 3, options = {}) {
  const params = new URLSearchParams({ years: String(years) });
  if (options.symbol) params.set('symbol', String(options.symbol));
  return getJson(
    `${API_BASE}/crypto/${encodeURIComponent(id)}/outlook?${params.toString()}`,
    { ttlMs: 180_000, timeoutMs: 28000 },
  );
}

export async function fetchFx() {
  return getJson(`${API_BASE}/fx/usd-ngn`, { ttlMs: 300_000 });
}

