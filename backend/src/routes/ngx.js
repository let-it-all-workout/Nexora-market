import { Router } from 'express';
import {
  buildMarketMetadata,
  fetchNgxAllStocks,
  fetchNgxDividends,
  fetchNgxFundamentals,
  fetchNgxHistory,
  fetchNgxIndexHistory,
  fetchNgxStock,
  fetchNgxMarketOverview,
  fetchNgxMarketStatus,
} from '../services/marketData.js';
import { fetchMergedNews } from '../services/news.js';
import { enrichIndicators } from '../utils/normalize.js';
import { sessionChange as sessionChangePct, breadthFromChanges, pickNum } from '../utils/marketMath.js';
import { attachSellFactors } from '../services/ngxSellFactors.js';
import { parseOutlookYears, projectOutlook } from '../utils/forecast.js';

export const ngxRouter = Router();
const ROUTE_CACHE = new Map();
const CACHE_TTL_MS = 120_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let yfInst = null;
async function getYf() {
  if (yfInst) return yfInst;
  const mod = await import('yahoo-finance2');
  yfInst = new (mod.default)({ suppressNotices: ['yahooSurvey'] });
  return yfInst;
}

const NEWS_CACHE = new Map();
const NEWS_TTL_MS = 90_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function historyOptions(query = {}) {
  const from = typeof query.from === 'string' && ISO_DATE.test(query.from) ? query.from : null;
  const to = typeof query.to === 'string' && ISO_DATE.test(query.to) ? query.to : null;
  if ((from && !to) || (!from && to) || (from && to && from > to)) {
    throw new Error('from and to must be a valid ordered date range.');
  }
  if (from && to) return { from, to };
  const days = Number(query.days || 30);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new Error('days must be an integer between 1 and 3650.');
  }
  return { days };
}

function getCached(key) {
  const hit = ROUTE_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.time > CACHE_TTL_MS) return null;
  return hit.value;
}

function setCached(key, value) {
  ROUTE_CACHE.set(key, { time: Date.now(), value });
}

function getStale(key) {
  const hit = ROUTE_CACHE.get(key);
  return hit?.value || null;
}

function deriveOverviewFromStocks(stocks = []) {
  const changes = stocks.map((stock) => sessionChangePct(stock)).filter((change) => change != null);
  const { advances: advancers, declines: decliners, unchanged, avg: avgPct, sampleSize } = breadthFromChanges(changes);
  const priced = stocks.filter((stock) => Number.isFinite(stock?.current_price));
  const marketCap = priced.reduce((acc, stock) => acc + (stock.market_cap || 0), 0);
  const volume = priced.reduce((acc, stock) => acc + (stock.volume || 0), 0);
  return {
    asi: null,
    pct_change: avgPct,
    market_cap: marketCap || null,
    volume: volume || null,
    advancers,
    decliners,
    unchanged,
    deals: null,
    sample_size: sampleSize,
  };
}

function normalizeMarketOverview(raw = {}) {
  const src = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? raw.data : raw;
  return {
    ...src,
    asi: pickNum(src.asi, src.ASI, src.all_share_index, src.allShareIndex, src.index_value, src.index),
    pct_change: pickNum(
      src.pct_change,
      src.percent_change,
      src.change_percent,
      src.asi_change,
      src.changePercent,
      src.percentage_change,
    ),
    market_cap: pickNum(src.market_cap, src.marketCap, src.capitalization, src.total_market_cap),
    volume: pickNum(src.volume, src.total_volume, src.totalVolume, src.turnover),
    advancers: pickNum(src.advancers, src.advancing, src.gainers, src.advances),
    decliners: pickNum(src.decliners, src.declining, src.losers, src.declines),
    unchanged: pickNum(src.unchanged, src.unchanged_count),
    deals: pickNum(src.deals, src.trades, src.number_of_deals),
  };
}

function mergeDerivedCounts(official, stocks) {
  const derived = deriveOverviewFromStocks(stocks);
  return {
    ...official,
    advancers: official.advancers ?? derived.advancers,
    decliners: official.decliners ?? derived.decliners,
    unchanged: official.unchanged ?? derived.unchanged,
    pct_change: official.pct_change ?? derived.pct_change,
    market_cap: official.market_cap ?? derived.market_cap,
    volume: official.volume ?? derived.volume,
    sample_size: derived.sample_size,
  };
}

async function withRateLimitRetry(fetcher) {
  try {
    return await fetcher();
  } catch (error) {
    const status = error?.response?.status;
    const retryAfter = Number(error?.response?.headers?.['retry-after'] || 2);
    if (status === 429) {
      await sleep(Math.max(1, Math.min(retryAfter, 5)) * 1000);
      return fetcher();
    }
    throw error;
  }
}

ngxRouter.get('/stocks', async (_req, res) => {
  try {
    const cached = getCached('stocks');
    if (cached) return res.json(cached);
    const stocks = await withRateLimitRetry(() => fetchNgxAllStocks());
    const enriched = await attachSellFactors(stocks);
    const payload = {
      stocks: enriched.stocks,
      sellFactors: enriched.sellFactors,
      provider: 'ngx-pulse',
      metadata: buildMarketMetadata({ provider: 'ngx-pulse', dataKind: 'snapshot' }),
    };
    setCached('stocks', payload);
    res.json(payload);
  } catch (error) {
    const stale = getStale('stocks');
    if (stale) return res.json({
      ...stale,
      stale: true,
      warning: 'Serving cached NGX stocks due to provider limit',
      metadata: { ...stale.metadata, stale: true },
    });
    return res.json({
      stocks: [],
      provider: 'ngx-pulse',
      warning: `NGX provider temporarily unavailable (${error.message})`,
    });
  }
});

ngxRouter.get('/market', async (_req, res) => {
  try {
    const cached = getCached('market');
    if (cached) return res.json(cached);
    const [overview, status, stocks] = await Promise.all([
      withRateLimitRetry(() => fetchNgxMarketOverview()),
      fetchNgxMarketStatus().catch(() => null),
      fetchNgxAllStocks().catch(() => []),
    ]);
    const payload = {
      ...mergeDerivedCounts(normalizeMarketOverview(overview), stocks),
      market_status: status?.status || status?.raw_status || null,
      is_open: status?.is_open ?? null,
      provider: 'ngx-pulse',
      metadata: buildMarketMetadata({ provider: 'ngx-pulse', dataKind: 'snapshot' }),
    };
    setCached('market', payload);
    res.json(payload);
  } catch (error) {
    const stale = getStale('market');
    if (stale) return res.json({
      ...stale,
      stale: true,
      warning: 'Serving cached NGX market due to provider limit',
      metadata: { ...stale.metadata, stale: true },
    });
    try {
      const stocks = await fetchNgxAllStocks();
      const status = await fetchNgxMarketStatus().catch(() => null);
      const derived = {
        ...deriveOverviewFromStocks(stocks),
        market_status: status?.status || status?.raw_status || null,
        is_open: status?.is_open ?? null,
        provider: 'ngx-derived',
        metadata: buildMarketMetadata({
          provider: 'ngx-pulse',
          dataKind: 'snapshot',
          derived: true,
          fallbackUsed: true,
          fallbackReason: 'market-overview-unavailable',
        }),
      };
      setCached('market', derived);
      return res.json(derived);
    } catch {
      return res.json({
        ...deriveOverviewFromStocks([]),
        market_status: null,
        is_open: null,
        provider: 'ngx-fallback',
        warning: `NGX provider temporarily unavailable (${error.message})`,
        metadata: buildMarketMetadata({
          provider: 'ngx-pulse',
          dataKind: 'snapshot',
          stale: true,
          fallbackUsed: true,
          fallbackReason: 'provider-unavailable',
        }),
      });
    }
  }
});

function dayChangePct(stock) {
  if (Number.isFinite(stock?.change_percent)) return { pct: stock.change_percent, derived: false };
  const price = Number(stock?.current_price);
  const prev = Number(stock?.previous_close);
  if (Number.isFinite(price) && Number.isFinite(prev) && prev !== 0) {
    return { pct: ((price - prev) / prev) * 100, derived: true };
  }
  return { pct: null, derived: false };
}

function summariseDividends(dividends, price) {
  if (!dividends?.length) return { trailing: null, yieldPct: null, latest: null };
  const cutoff = new Date(Date.now() - 366 * 86400000).toISOString().slice(0, 10);
  const trailingRows = dividends.filter((row) => row.exDate >= cutoff);
  const trailing = trailingRows.length
    ? trailingRows.reduce((total, row) => total + row.perShare, 0)
    : null;
  const yieldPct = trailing && Number.isFinite(price) && price > 0 ? (trailing / price) * 100 : null;
  return { trailing, yieldPct, latest: dividends[0] };
}

ngxRouter.get('/company/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return res.status(400).json({ error: 'symbol must be an NGX ticker.', code: 'INVALID_SYMBOL' });
  }

  const cacheKey = `company:${symbol}`;
  const cachedPayload = getCached(cacheKey);
  if (cachedPayload) return res.json(cachedPayload);

  try {
    const [stocks, dividendData, fundamentalData] = await Promise.all([
      withRateLimitRetry(() => fetchNgxAllStocks()).catch(() => []),
      fetchNgxDividends(symbol).catch(() => null),
      fetchNgxFundamentals(symbol).catch(() => null),
    ]);

    const listed = stocks.find((stock) => String(stock.symbol || '').toUpperCase() === symbol) || null;
    const snapshot = listed || await fetchNgxStock(symbol).catch(() => null);
    if (!snapshot && !dividendData?.dividends?.length) {
      return res.status(404).json({ error: `NGX Pulse has no record for ${symbol}`, code: 'NOT_FOUND' });
    }

    const price = Number(snapshot?.current_price);
    const reportedPe = Number(fundamentalData?.fundamentals?.peRatio);
    const reportedEps = Number(fundamentalData?.fundamentals?.eps);
    const pe = Number.isFinite(Number(snapshot?.pe_ratio)) ? Number(snapshot.pe_ratio) : reportedPe;
    const change = dayChangePct(snapshot);
    const dividends = dividendData?.dividends || [];
    const dividendSummary = summariseDividends(dividends, price);
    const epsImplied = Number.isFinite(price) && Number.isFinite(pe) && pe > 0 ? price / pe : null;

    const payload = {
      symbol,
      name: snapshot?.name || null,
      sector: snapshot?.sector || null,
      board: snapshot?.market || null,
      tradeDate: snapshot?.trade_date || null,
      currency: 'NGN',
      price: Number.isFinite(price) ? price : null,
      previousClose: Number.isFinite(Number(snapshot?.previous_close)) ? Number(snapshot.previous_close) : null,
      changePct: change.pct,
      changePctDerived: change.derived,
      pctChange7d: Number.isFinite(Number(snapshot?.pct_change_7d)) ? Number(snapshot.pct_change_7d) : null,
      volume: Number.isFinite(Number(snapshot?.volume)) ? Number(snapshot.volume) : null,
      marketCap: Number.isFinite(Number(snapshot?.market_cap)) ? Number(snapshot.market_cap) : null,
      sharesOutstanding: Number.isFinite(Number(snapshot?.shares_outstanding)) ? Number(snapshot.shares_outstanding) : null,
      peRatio: Number.isFinite(pe) ? pe : null,
      eps: Number.isFinite(reportedEps) ? reportedEps : null,
      epsImplied: Number.isFinite(reportedEps) ? null : epsImplied,
      earnings: {
        dividends,
        dividendCount: dividends.length,
        latestExDate: dividendSummary.latest?.exDate || null,
        latestPerShare: dividendSummary.latest?.perShare ?? null,
        trailingDividend: dividendSummary.trailing,
        dividendYieldPct: dividendSummary.yieldPct,
        source: dividendData?.source || null,
        sourceUrl: dividendData?.sourceUrl || null,
        dividendsUnavailable: !dividendData,
        fundamentals: fundamentalData?.fundamentals || null,
        fundamentalsPlanLimited: Boolean(fundamentalData?.planLimited),
        fundamentalsNote: fundamentalData?.planLimited
          ? 'Income statements sit behind a paid NGX Pulse tier, so this build shows dividend records only.'
          : null,
      },
      provider: 'ngx-pulse',
      metadata: buildMarketMetadata({
        provider: 'ngx-pulse',
        dataKind: 'snapshot',
        asOf: snapshot?.trade_date ? new Date(snapshot.trade_date).toISOString() : new Date().toISOString(),
        derived: Boolean(change.derived || epsImplied || dividendSummary.yieldPct),
      }),
    };

    setCached(cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    const stale = getStale(cacheKey);
    if (stale) {
      return res.json({ ...stale, stale: true, warning: 'Serving cached NGX company details due to provider limit' });
    }
    return res.status(502).json({ error: error.message, provider: 'ngx-pulse' });
  }
});

ngxRouter.get('/outlook/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return res.status(400).json({ error: 'symbol must be an NGX ticker.', code: 'INVALID_SYMBOL' });
  }
  const years = parseOutlookYears(req.query.years ?? 3);
  if (years == null) {
    return res.status(400).json({ error: 'years must be 1, 2, 3, or 5.', code: 'INVALID_HORIZON' });
  }

  const cacheKey = `outlook:${symbol}:${years}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const result = await fetchNgxHistory(symbol, { days: 3650 });
    const series = result.series || [];
    const projected = projectOutlook(series, {
      horizonYears: years,
      periodsPerYear: 252,
      minBars: 252,
    });
    if (!projected.ok || result.metadata?.fallbackReason === 'ngx-pulse-7-day-window') {
      return res.status(422).json({
        ...projected,
        ok: false,
        error: projected.reason || 'This name does not have a year of daily prices yet.',
        code: projected.code || 'INSUFFICIENT_HISTORY',
      });
    }
    const body = {
      ...projected,
      symbol,
      currency: 'NGN',
      provider: 'ngx-pulse',
      sampleLimited: false,
    };
    setCached(cacheKey, body);
    return res.json(body);
  } catch (error) {
    return res.status(502).json({
      error: `Outlook history is unavailable for ${symbol}.`,
      code: 'HISTORY_UNAVAILABLE',
      provider: 'ngx-pulse',
    });
  }
});

ngxRouter.get('/prices/:symbol', async (req, res) => {
  try {
    const data = await fetchNgxStock(req.params.symbol);
    res.json({
      ...data,
      provider: 'ngx-pulse',
      metadata: buildMarketMetadata({ provider: 'ngx-pulse', dataKind: 'snapshot' }),
    });
  } catch (error) {
    res.status(502).json({ error: error.message, provider: 'ngx-pulse' });
  }
});

ngxRouter.get('/history/:symbol', async (req, res) => {
  try {
    const options = historyOptions(req.query);
    const result = await fetchNgxHistory(req.params.symbol, options);
    return res.json({
      ...result,
      series: enrichIndicators(result.series || []),
    });
  } catch (error) {
    if (/from and to|days must/i.test(error.message || '')) {
      return res.status(400).json({ error: error.message, code: 'INVALID_RANGE' });
    }
    const snapshot = await fetchNgxStock(req.params.symbol).catch(() => null);
    return res.json({
      symbol: String(req.params.symbol || '').toUpperCase(),
      series: [],
      snapshot,
      historyUnavailable: true,
      warning: error.message || 'Verified NGX history is unavailable.',
      metadata: buildMarketMetadata({
        provider: 'ngx-pulse',
        dataKind: 'snapshot',
        fallbackUsed: true,
        fallbackReason: 'history-unavailable',
      }),
    });
  }
});

ngxRouter.get('/indices/:code/history', async (req, res) => {
  try {
    const options = historyOptions(req.query);
    const range = options.from ? options : {
      from: new Date(Date.now() - options.days * 86400000).toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
    };
    const result = await fetchNgxIndexHistory(req.params.code, range);
    return res.json(result);
  } catch (error) {
    if (/from and to|days must/i.test(error.message || '')) {
      return res.status(400).json({ error: error.message, code: 'INVALID_RANGE' });
    }
    return res.json({
      code: String(req.params.code || '').toUpperCase(),
      series: [],
      historyUnavailable: true,
      warning: error.message || 'Verified NGX index history is unavailable.',
      metadata: buildMarketMetadata({
        provider: 'ngx-pulse',
        dataKind: 'snapshot',
        fallbackUsed: true,
        fallbackReason: 'history-unavailable',
      }),
    });
  }
});

ngxRouter.get('/news', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const query = q.trim();
    if (!query) return res.json({ news: [] });

    const cacheKey = `ngx-news:v2:${query.toLowerCase()}`;
    const cached = NEWS_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < NEWS_TTL_MS) return res.json({ news: cached.value });

    const yf = await getYf();
    const news = await fetchMergedNews({
      yahooSearch: () => yf.search(query, { newsCount: 10, quotesCount: 0 }).then((data) => data?.news || []),
      queryVariants: [query, `${query} Nigerian stock market`, `${query} NGX`],
      limit: 10,
    });

    NEWS_CACHE.set(cacheKey, { value: news, ts: Date.now() });
    if (NEWS_CACHE.size > 200) NEWS_CACHE.delete(NEWS_CACHE.keys().next().value);

    res.json({ news });
  } catch {
    res.json({ news: [] });
  }
});

ngxRouter.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const allStocks = await fetchNgxAllStocks();
    const query = q.trim().toLowerCase();
    const results = query
      ? allStocks.filter((s) =>
        (s.symbol || '').toLowerCase().includes(query) || (s.name || '').toLowerCase().includes(query),
      ).slice(0, 15)
      : allStocks.slice(0, 20);
    res.json({ results, provider: 'ngx-pulse' });
  } catch (error) {
    res.status(502).json({ error: error.message, results: [], provider: 'ngx-pulse' });
  }
});
