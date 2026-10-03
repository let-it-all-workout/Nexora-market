import axios from 'axios';
import { normalizeNgxStockRow, sliceDatedSeries } from '../utils/marketMath.js';

let yfInstance = null;
const yfReady = import('yahoo-finance2').then((mod) => {
  yfInstance = new (mod.default)();
  return yfInstance;
});
async function getYf() {
  if (yfInstance) return yfInstance;
  return yfReady;
}

const CRYPTO_COINGECKO = 'https://api.coingecko.com/api/v3/coins';
const FX_PRIMARY = 'https://open.er-api.com/v6/latest/USD';
const FX_FALLBACK = 'https://api.exchangerate.host/latest?base=USD&symbols=NGN';

const HTTP_TIMEOUT = 8000;
const CACHE_TTL_MS = 180_000;

const CRYPTO_YAHOO_MAP = {
  bitcoin: 'BTC-USD',
  ethereum: 'ETH-USD',
  solana: 'SOL-USD',
  ripple: 'XRP-USD',
  dogecoin: 'DOGE-USD',
  'shiba-inu': 'SHIB-USD',
  pepe: 'PEPE-USD',
  'bonk-1': 'BONK-USD',
  cardano: 'ADA-USD',
  polkadot: 'DOT-USD',
  'avalanche-2': 'AVAX-USD',
  near: 'NEAR-USD',
  aptos: 'APT-USD',
  sui: 'SUI-USD',
  cosmos: 'ATOM-USD',
  algorand: 'ALGO-USD',
  fantom: 'FTM-USD',
  'internet-computer': 'ICP-USD',
  tron: 'TRX-USD',
  ton: 'TON-USD',
  kaspa: 'KAS-USD',
  sei: 'SEI-USD',
  injective: 'INJ-USD',
  hedera: 'HBAR-USD',
  'polygon-ecosystem-token': 'POL-USD',
  'matic-network': 'MATIC-USD',
  arbitrum: 'ARB-USD',
  optimism: 'OP-USD',
  mantle: 'MNT-USD',
  immutable: 'IMX-USD',
  starknet: 'STRK-USD',
  aave: 'AAVE-USD',
  uniswap: 'UNI-USD',
  chainlink: 'LINK-USD',
  litecoin: 'LTC-USD',
  stellar: 'XLM-USD',
  binancecoin: 'BNB-USD',
  tether: 'USDT-USD',
  'usd-coin': 'USDC-USD',
  dai: 'DAI-USD',
  'wrapped-bitcoin': 'WBTC-USD',
  filecoin: 'FIL-USD',
  'render-token': 'RENDER-USD',
  'fetch-ai': 'FET-USD',
  bittensor: 'TAO-USD',
  monero: 'XMR-USD',
  'bitcoin-cash': 'BCH-USD',
  'ethereum-classic': 'ETC-USD',
};

function tickerToYahoo(ticker) {
  const t = String(ticker || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (t.length < 2 || t.length > 10) return null;
  return `${t}-USD`;
}

/** Map CoinGecko ids / tickers to Yahoo crypto symbols. Never invent CARDANO-USD from a name. */
export function yahooSymbolForCryptoId(id, hintTicker) {
  const key = String(id || '').toLowerCase();
  if (CRYPTO_YAHOO_MAP[key]) return CRYPTO_YAHOO_MAP[key];
  const fromHint = tickerToYahoo(hintTicker);
  if (fromHint) return fromHint;
  if (/^[a-z0-9]{2,5}$/i.test(key)) return `${key.toUpperCase()}-USD`;
  return null;
}

export function geckoIdFromYahooCryptoSymbol(symbol) {
  const upper = String(symbol || '').toUpperCase();
  for (const [id, yahoo] of Object.entries(CRYPTO_YAHOO_MAP)) {
    if (yahoo === upper) return id;
  }
  if (upper.endsWith('-USD')) return upper.slice(0, -4).toLowerCase();
  return null;
}

async function resolveYahooCryptoSymbol(id, hintTicker) {
  const mapped = yahooSymbolForCryptoId(id, hintTicker);
  if (mapped) return mapped;
  try {
    const yf = await getYf();
    const query = String(id || '').toLowerCase().replace(/-\d+$/, '').replace(/-/g, ' ');
    const data = await yf.search(query, { quotesCount: 8, newsCount: 0 }, { validateResult: false });
    const quotes = data?.quotes || [];
    const hit = quotes.find((q) => {
      const symbol = String(q.symbol || '');
      const type = String(q.quoteType || '').toUpperCase();
      return type.includes('CRYPTO') || /-[A-Z]{3}$/.test(symbol);
    });
    if (hit?.symbol) return hit.symbol;
  } catch {
    /* Yahoo search is optional; mapped tickers still work. */
  }
  throw new Error(`No Yahoo symbol for ${id}`);
}

const providerHealth = new Map();
const responseCache = new Map();
const inflightRequests = new Map();

export function buildMarketMetadata({
  provider,
  dataKind,
  asOf = new Date().toISOString(),
  rangeStart = null,
  rangeEnd = null,
  derived = false,
  stale = false,
  fallbackUsed = false,
  fallbackReason = null,
} = {}) {
  if (!provider || !['snapshot', 'historical'].includes(dataKind)) {
    throw new Error('Market metadata requires a provider and valid dataKind.');
  }
  return {
    provider,
    dataKind,
    asOf,
    rangeStart,
    rangeEnd,
    derived: Boolean(derived),
    stale: Boolean(stale),
    fallbackUsed: Boolean(fallbackUsed),
    fallbackReason,
  };
}

function cached(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.value;
}

function staleCached(key) {
  return responseCache.get(key)?.value || null;
}

function cache(key, value) {
  responseCache.set(key, { value, ts: Date.now() });
  if (responseCache.size > 300) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
}

function dedupe(key, fetchFn) {
  const existing = inflightRequests.get(key);
  if (existing) return existing;
  const promise = fetchFn().finally(() => inflightRequests.delete(key));
  inflightRequests.set(key, promise);
  return promise;
}

function setProviderHealth(name, status) {
  providerHealth.set(name, { ...status, updatedAt: new Date().toISOString() });
}

function seriesFreshnessScore(series) {
  const latestTs = series?.at(-1)?.timestamp;
  if (!latestTs) return 0;
  const ageHours = (Date.now() - latestTs) / (1000 * 60 * 60);
  if (ageHours <= 2) return 1;
  if (ageHours <= 12) return 0.8;
  if (ageHours <= 24) return 0.6;
  if (ageHours <= 72) return 0.4;
  return 0.2;
}

function completenessScore(series) {
  if (!series?.length) return 0;
  const valid = series.filter((p) => Number.isFinite(p.close)).length;
  return valid / series.length;
}

function scoreToLabel(score) {
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

function buildQuality(series, provider, fallbackUsed = false) {
  const freshness = seriesFreshnessScore(series);
  const completeness = completenessScore(series);
  const confidence = Math.max(0, Math.min(1, freshness * 0.45 + completeness * 0.45 + (fallbackUsed ? 0.05 : 0.1)));
  return { provider, fallbackUsed, freshness, completeness, confidence, confidenceLabel: scoreToLabel(confidence) };
}

export function getProviderHealth() {
  return Object.fromEntries(providerHealth.entries());
}

export async function fetchStockSeriesWithFallback(symbol, range = '3mo', interval = '1d', period1, period2) {
  const cacheKey = `stock:${symbol}:${range}:${interval}:${period1 || ''}:${period2 || ''}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const yf = await getYf();

    const opts = { interval };
    if (period1 && period2) {
      opts.period1 = new Date(Number(period1) * 1000);
      opts.period2 = new Date(Number(period2) * 1000);
    } else {
      const rangeMap = { '1d': 2, '7d': 7, '1mo': 30, '2mo': 60, '3mo': 90, '1y': 365, '10y': 3650, 'max': 3650 };
      const days = rangeMap[range] || 90;
      opts.period1 = new Date(Date.now() - days * 24 * 3600 * 1000);
    }

    const result = await yf.chart(symbol, opts);

    if (!result?.quotes?.length) {
      throw new Error(`Yahoo returned no data for ${symbol}`);
    }

    const raw = {
      chart: {
        result: [{
          meta: {
            currency: result.meta?.currency || 'USD',
            symbol: result.meta?.symbol || symbol,
            regularMarketPrice: result.meta?.regularMarketPrice,
          },
          timestamp: result.quotes.map((q) => Math.floor(new Date(q.date).getTime() / 1000)),
          indicators: {
            quote: [{
              open: result.quotes.map((q) => q.open),
              high: result.quotes.map((q) => q.high),
              low: result.quotes.map((q) => q.low),
              close: result.quotes.map((q) => q.close),
              volume: result.quotes.map((q) => q.volume),
            }],
          },
        }],
      },
    };

    setProviderHealth('yahoo-finance', { ok: true, errorRate: 0, latencyHint: 'normal' });
    const out = {
      raw,
      metadata: buildMarketMetadata({
        provider: 'yahoo-finance',
        dataKind: 'historical',
        rangeStart: result.quotes[0]?.date?.toISOString?.() || result.quotes[0]?.date || null,
        rangeEnd: result.quotes.at(-1)?.date?.toISOString?.() || result.quotes.at(-1)?.date || null,
      }),
    };
    cache(cacheKey, out);
    return out;
  });
}

async function fetchCoinGeckoSeries(id, days) {
  const url = `${CRYPTO_COINGECKO}/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;
  const { data } = await axios.get(url, { timeout: HTTP_TIMEOUT });
  if (!data?.prices?.length) throw new Error(`CoinGecko returned empty data for ${id}`);
  return data;
}

async function fetchYahooCryptoSeries(id, days, hintTicker) {
  const symbol = await resolveYahooCryptoSymbol(id, hintTicker);
  const yf = await getYf();
  const n = days === 'max' ? 3650 : Math.max(1, Number(days) || 90);
  const intervals = n <= 1 ? ['5m', '15m', '1h'] : n <= 7 ? ['30m', '1h', '1d'] : n <= 90 ? ['1h', '1d'] : ['1d'];
  const lookbackDays = n <= 1 ? 2 : n;
  let lastError = new Error(`Yahoo returned no data for ${symbol}`);
  for (const interval of intervals) {
    try {
      const result = await yf.chart(symbol, {
        interval,
        period1: new Date(Date.now() - lookbackDays * 24 * 3600 * 1000),
      });
      const quotes = (result?.quotes || []).filter((q) => q && Number.isFinite(q.close));
      if (quotes.length) {
        return {
          prices: quotes.map((q) => [new Date(q.date).getTime(), q.close]),
          total_volumes: quotes.map((q) => [new Date(q.date).getTime(), q.volume ?? 0]),
        };
      }
      lastError = new Error(`Yahoo returned no data for ${symbol} (${interval})`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function fetchCryptoSeriesWithFallback(id, days = 90, options = {}) {
  const hintTicker = options.symbol || '';
  const dayCount = days === 'max' ? 3650 : Number(days);
  const skipGecko = Boolean(options.preferYahoo) || (Number.isFinite(dayCount) && dayCount > 365);
  const cacheKey = `crypto:${id}:${days}:${String(hintTicker).toUpperCase()}:${skipGecko ? 'y' : 'g'}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const loadYahoo = async (reason) => {
      const data = await fetchYahooCryptoSeries(id, days, hintTicker);
      setProviderHealth('yahoo-finance', { ok: true, errorRate: 0, latencyHint: 'normal' });
      const out = {
        raw: data,
        metadata: buildMarketMetadata({
          provider: 'yahoo-finance',
          dataKind: 'historical',
          fallbackUsed: Boolean(reason),
          fallbackReason: reason || null,
          rangeStart: data.prices?.[0]?.[0] ? new Date(data.prices[0][0]).toISOString() : null,
          rangeEnd: data.prices?.at(-1)?.[0] ? new Date(data.prices.at(-1)[0]).toISOString() : null,
        }),
      };
      cache(cacheKey, out);
      return out;
    };

    if (skipGecko) {
      try {
        return await loadYahoo('coingecko-public-365-day-cap');
      } catch {
        try {
          const data = await fetchCoinGeckoSeries(id, 365);
          setProviderHealth('coingecko', { ok: true, errorRate: 0, latencyHint: 'normal' });
          const out = {
            raw: data,
            metadata: buildMarketMetadata({
              provider: 'coingecko',
              dataKind: 'historical',
              fallbackUsed: true,
              fallbackReason: 'yahoo-unavailable-gecko-365',
              rangeStart: data.prices?.[0]?.[0] ? new Date(data.prices[0][0]).toISOString() : null,
              rangeEnd: data.prices?.at(-1)?.[0] ? new Date(data.prices.at(-1)[0]).toISOString() : null,
            }),
          };
          cache(cacheKey, out);
          return out;
        } catch (error) {
          const wrapped = new Error(`Chart history is unavailable for ${id}`);
          wrapped.code = 'HISTORY_UNAVAILABLE';
          wrapped.cause = error;
          throw wrapped;
        }
      }
    }

    try {
      const data = await fetchCoinGeckoSeries(id, days);
      setProviderHealth('coingecko', { ok: true, errorRate: 0, latencyHint: 'normal' });
      const out = {
        raw: data,
        metadata: buildMarketMetadata({
          provider: 'coingecko',
          dataKind: 'historical',
          rangeStart: data.prices?.[0]?.[0] ? new Date(data.prices[0][0]).toISOString() : null,
          rangeEnd: data.prices?.at(-1)?.[0] ? new Date(data.prices.at(-1)[0]).toISOString() : null,
        }),
      };
      cache(cacheKey, out);
      return out;
    } catch (primaryError) {
      setProviderHealth('coingecko', {
        ok: false,
        errorRate: 1,
        latencyHint: 'degraded',
        message: primaryError.message,
      });
      try {
        const data = await fetchYahooCryptoSeries(id, days, hintTicker);
        setProviderHealth('yahoo-finance', { ok: true, errorRate: 0, latencyHint: 'normal' });
        const out = {
          raw: data,
          metadata: buildMarketMetadata({
            provider: 'yahoo-finance',
            dataKind: 'historical',
            fallbackUsed: true,
            fallbackReason: primaryError.message,
            rangeStart: data.prices?.[0]?.[0] ? new Date(data.prices[0][0]).toISOString() : null,
            rangeEnd: data.prices?.at(-1)?.[0] ? new Date(data.prices.at(-1)[0]).toISOString() : null,
          }),
        };
        cache(cacheKey, out);
        return out;
      } catch (fallbackError) {
        const error = new Error(`Chart history is unavailable for ${id}`);
        error.code = 'HISTORY_UNAVAILABLE';
        error.cause = fallbackError;
        throw error;
      }
    }
  });
}

async function fetchFxPrimary() {
  const { data } = await axios.get(FX_PRIMARY, { timeout: HTTP_TIMEOUT });
  return data?.rates?.NGN;
}

async function fetchFxFallback() {
  const { data } = await axios.get(FX_FALLBACK, { timeout: HTTP_TIMEOUT });
  return data?.rates?.NGN;
}

export async function fetchUsdNgnWithFallback() {
  const cacheKey = 'fx:usd-ngn';
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    try {
      const rate = await fetchFxPrimary();
      if (Number.isFinite(rate)) {
        setProviderHealth('open-er-api', { ok: true, errorRate: 0, latencyHint: 'normal' });
        const out = { rate, metadata: { provider: 'open-er-api', fallbackUsed: false } };
        cache(cacheKey, out);
        return out;
      }
    } catch (error) {
      setProviderHealth('open-er-api', { ok: false, errorRate: 1, latencyHint: 'degraded', message: error.message });
    }

    try {
      const fallbackRate = await fetchFxFallback();
      if (Number.isFinite(fallbackRate)) {
        setProviderHealth('exchangerate-host', { ok: true, errorRate: 0, latencyHint: 'normal' });
        const out = { rate: fallbackRate, metadata: { provider: 'exchangerate-host', fallbackUsed: true } };
        cache(cacheKey, out);
        return out;
      }
    } catch (error) {
      setProviderHealth('exchangerate-host', { ok: false, errorRate: 1, latencyHint: 'degraded', message: error.message });
    }

    throw new Error('All FX providers failed — cannot determine live NGN rate');
  });
}

const NGX_BASE = 'https://ngxpulse.ng/api/ngxdata';

function getNgxApiKey() {
  return process.env.NGX_PULSE_API_KEY || '';
}

async function fetchNgxEndpoint(url, key, params = {}) {
  try {
    return await axios.get(url, {
      timeout: 15000,
      headers: { 'X-API-Key': key },
      params,
      maxRedirects: 5,
    });
  } catch (error) {
    if (error?.response?.status !== 429) throw error;
    const retryAfter = Math.max(1, Math.min(Number(error.response.headers?.['retry-after'] || 2), 8));
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return axios.get(url, {
      timeout: 15000,
      headers: { 'X-API-Key': key },
      params,
      maxRedirects: 5,
    });
  }
}

export async function fetchNgxAllStocks() {
  const cacheKey = 'ngx:all-stocks';
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) throw new Error('NGX_PULSE_API_KEY not configured — get a free key at https://www.ngxpulse.ng/api');

    const { data } = await fetchNgxEndpoint(`${NGX_BASE}/stocks`, key);

    const raw = Array.isArray(data) ? data : data?.stocks || data?.data || [];
    const stocks = raw.map(normalizeNgxStockRow).filter((stock) => stock.symbol);
    if (!stocks.length) throw new Error('NGX Pulse returned empty stock list');

    setProviderHealth('ngx-pulse', { ok: true, errorRate: 0, latencyHint: 'normal' });
    cache(cacheKey, stocks);
    return stocks;
  });
}

export async function fetchNgxStock(symbol) {
  const cacheKey = `ngx:price:${symbol}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) throw new Error('NGX_PULSE_API_KEY not configured — get a free key at https://www.ngxpulse.ng/api');

    const { data } = await axios.get(`${NGX_BASE}/prices/${encodeURIComponent(symbol)}`, {
      timeout: HTTP_TIMEOUT,
      headers: { 'X-API-Key': key },
      maxRedirects: 5,
    });

    const stock = normalizeNgxStockRow(data?.data || data);
    if (!stock.symbol && stock.current_price == null) throw new Error(`NGX Pulse returned no data for ${symbol}`);

    setProviderHealth('ngx-pulse', { ok: true, errorRate: 0, latencyHint: 'normal' });
    cache(cacheKey, stock);
    return stock;
  });
}

export function normalizeNgxDividendRows(payload) {
  const rows = Array.isArray(payload?.history)
    ? payload.history
    : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return rows
    .map((row) => ({
      exDate: String(row.ex_dividend_date || '').slice(0, 10),
      recordDate: String(row.record_date || '').slice(0, 10) || null,
      payDate: String(row.pay_date || '').slice(0, 10) || null,
      perShare: row.dividend_per_share == null ? NaN : Number(row.dividend_per_share),
      currency: row.currency || 'NGN',
      sourceName: row.source_name || null,
      sourceUrl: row.source_url || null,
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.exDate) && Number.isFinite(row.perShare) && row.perShare > 0)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}

export async function fetchNgxDividends(symbol) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const cacheKey = `ngx:dividends:${normalizedSymbol}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) throw new Error('NGX_PULSE_API_KEY not configured — get a free key at https://www.ngxpulse.ng/api');

    const { data } = await fetchNgxEndpoint(`${NGX_BASE}/dividends/${encodeURIComponent(normalizedSymbol)}`, key);
    const dividends = normalizeNgxDividendRows(data);
    // Pulse answers `source: "empty"` when it holds nothing, which is a status, not an attribution.
    const label = dividends.length ? dividends[0].sourceName || data?.source : null;
    const out = {
      symbol: normalizedSymbol,
      dividends,
      source: label && !/^(empty|none|unknown)$/i.test(label) ? label : null,
      sourceUrl: dividends[0]?.sourceUrl || null,
    };
    setProviderHealth('ngx-pulse', { ok: true, errorRate: 0, latencyHint: 'normal' });
    cache(cacheKey, out);
    return out;
  });
}

/**
 * NGX Pulse serves company fundamentals on its paid tiers. On a free key this
 * answers 403, which callers surface as "not on this plan" instead of guessing.
 */
export async function fetchNgxFundamentals(symbol) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const cacheKey = `ngx:fundamentals:${normalizedSymbol}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const key = getNgxApiKey();
  if (!key) throw new Error('NGX_PULSE_API_KEY not configured — get a free key at https://www.ngxpulse.ng/api');

  return dedupe(cacheKey, async () => {
    try {
      const { data } = await fetchNgxEndpoint(`${NGX_BASE}/fundamentals/${encodeURIComponent(normalizedSymbol)}`, key);
      const body = data?.data ?? data ?? {};
      const row = body?.fundamentals && typeof body.fundamentals === 'object' ? body.fundamentals : body;
      const pick = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      };
      const out = {
        symbol: normalizedSymbol,
        fundamentals: {
          peRatio: pick(row.pe_ratio ?? row.peRatio),
          eps: pick(row.eps),
          dividendPerShare: pick(row.dividend_per_share ?? row.dividendPerShare),
          dividendYield: pick(row.dividend_yield ?? row.dividendYield),
        },
        planLimited: false,
      };
      cache(cacheKey, out);
      return out;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 402 || status === 403) {
        const out = {
          symbol: normalizedSymbol,
          fundamentals: null,
          planLimited: true,
          message: error?.response?.data?.message || 'NGX Pulse serves fundamentals on a paid tier.',
        };
        cache(cacheKey, out);
        return out;
      }
      throw error;
    }
  });
}

export function normalizeNgxHistoryRows(payload) {
  const body = payload?.data ?? payload;
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(body?.prices) ? body.prices : Array.isArray(body?.history) ? body.history : [];
  return rows
    .map((row) => ({
      date: String(row.trade_date || row.date || '').slice(0, 10),
      open: Number(row.open_price ?? row.open),
      high: Number(row.high_price ?? row.high),
      low: Number(row.low_price ?? row.low),
      close: Number(row.close_price ?? row.close ?? row.current_price),
      volume: Number(row.volume ?? 0),
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchNgxHistory(symbol, { days, from, to } = {}) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const cacheKey = `ngx:history:${normalizedSymbol}:${days || ''}:${from || ''}:${to || ''}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) throw new Error('NGX_PULSE_API_KEY not configured');
    const params = from && to ? { from, to } : { days: days || 30 };
    const span = from && to
      ? Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) || 1)
      : (days || 30);

    const loadSeries = async (query) => {
      const { data } = await fetchNgxEndpoint(
        `${NGX_BASE}/prices/${encodeURIComponent(normalizedSymbol)}`,
        key,
        query,
      );
      const series = normalizeNgxHistoryRows(data);
      if (!series.length) throw new Error(`NGX Pulse returned no historical prices for ${normalizedSymbol}`);
      return series;
    };

    try {
      const series = await loadSeries(params);
      const result = {
        symbol: normalizedSymbol,
        series,
        metadata: buildMarketMetadata({
          provider: 'ngx-pulse',
          dataKind: 'historical',
          asOf: `${series.at(-1).date}T23:59:59.000Z`,
          rangeStart: series[0].date,
          rangeEnd: series.at(-1).date,
        }),
      };
      cache(cacheKey, result);
      return result;
    } catch (error) {
      const stale = staleCached(cacheKey);
      if (stale?.series?.length) {
        return {
          ...stale,
          metadata: {
            ...stale.metadata,
            stale: true,
            fallbackUsed: true,
            fallbackReason: 'provider-unavailable',
          },
        };
      }
      if (span > 7) {
        try {
          const series = await loadSeries({ days: 7 });
          const result = {
            symbol: normalizedSymbol,
            series,
            warning: 'NGX Pulse returned the last 7 trading days. Longer official history is not available on this API key.',
            metadata: buildMarketMetadata({
              provider: 'ngx-pulse',
              dataKind: 'historical',
              fallbackUsed: true,
              fallbackReason: 'ngx-pulse-7-day-window',
              asOf: `${series.at(-1).date}T23:59:59.000Z`,
              rangeStart: series[0].date,
              rangeEnd: series.at(-1).date,
            }),
          };
          cache(cacheKey, result);
          return result;
        } catch {
          throw error;
        }
      }
      throw error;
    }
  });
}

export function normalizeNgxIndexRows(payload) {
  const body = payload?.data ?? payload;
  const rows = Array.isArray(body)
    ? body
    : Array.isArray(body?.history) ? body.history : [];
  return rows
    .map((row) => ({
      date: String(row.date || row.trade_date || '').slice(0, 10),
      value: Number(row.value ?? row.close ?? row.index_value),
    }))
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchNgxIndexHistory(code = 'ASI', { from, to } = {}) {
  const normalizedCode = String(code || 'ASI').trim().toUpperCase();
  const cacheKey = `ngx:index-history:${normalizedCode}:${from || ''}:${to || ''}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) throw new Error('NGX_PULSE_API_KEY not configured');
    let data;
    try {
      ({ data } = await fetchNgxEndpoint(
        `${NGX_BASE}/indices/${encodeURIComponent(normalizedCode)}/history`,
        key,
        from && to ? { from, to } : {},
      ));
    } catch (error) {
      const stale = staleCached(cacheKey);
      if (stale) {
        return {
          ...stale,
          metadata: {
            ...stale.metadata,
            stale: true,
            fallbackUsed: true,
            fallbackReason: 'provider-unavailable',
          },
        };
      }
      throw error;
    }
    const series = sliceDatedSeries(normalizeNgxIndexRows(data), from, to);
    if (!series.length) throw new Error(`NGX Pulse returned no history for index ${normalizedCode}`);
    const result = {
      code: normalizedCode,
      series,
      metadata: buildMarketMetadata({
        provider: 'ngx-pulse',
        dataKind: 'historical',
        asOf: `${series.at(-1).date}T23:59:59.000Z`,
        rangeStart: series[0].date,
        rangeEnd: series.at(-1).date,
      }),
    };
    cache(cacheKey, result);
    return result;
  });
}

export async function fetchNgxMarketOverview() {
  const cacheKey = 'ngx:market-overview';
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) throw new Error('NGX_PULSE_API_KEY not configured');

    const { data } = await axios.get(`${NGX_BASE}/market`, {
      timeout: HTTP_TIMEOUT,
      headers: { 'X-API-Key': key },
      maxRedirects: 5,
    });

    const market = data?.data || data;
    setProviderHealth('ngx-pulse', { ok: true, errorRate: 0, latencyHint: 'normal' });
    cache(cacheKey, market);
    return market;
  });
}

export async function fetchNgxMarketStatus() {
  const cacheKey = 'ngx:market-status';
  const hit = cached(cacheKey);
  if (hit) return hit;

  return dedupe(cacheKey, async () => {
    const key = getNgxApiKey();
    if (!key) return { status: 'unknown', is_open: false };

    const { data } = await axios.get(`${NGX_BASE}/market-status`, {
      timeout: HTTP_TIMEOUT,
      headers: { 'X-API-Key': key },
      maxRedirects: 5,
    });

    const result = data?.data || data;
    cache(cacheKey, result);
    return result;
  });
}

export function buildDataProvenance(series, metadata) {
  return {
    source: metadata.provider,
    dataKind: metadata.dataKind,
    asOf: metadata.asOf,
    rangeStart: metadata.rangeStart,
    rangeEnd: metadata.rangeEnd,
    derived: metadata.derived,
    stale: metadata.stale,
    fallbackUsed: metadata.fallbackUsed,
    quality: buildQuality(series, metadata.provider, metadata.fallbackUsed),
    providers: getProviderHealth(),
  };
}
