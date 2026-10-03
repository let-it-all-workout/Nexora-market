import { Router } from 'express';
import { buildDataProvenance, fetchStockSeriesWithFallback } from '../services/marketData.js';
import { fetchMergedNews } from '../services/news.js';
import { enrichIndicators, normalizeStockSeries } from '../utils/normalize.js';
import { parseOutlookYears, projectOutlook } from '../utils/forecast.js';

export const stockRouter = Router();

const RESP_CACHE = new Map();
const RESP_TTL = 180_000;

let yfInst = null;
async function getYf() {
  if (yfInst) return yfInst;
  const mod = await import('yahoo-finance2');
  yfInst = new (mod.default)({ suppressNotices: ['yahooSurvey'] });
  return yfInst;
}

const INFO_CACHE = new Map();
const INFO_TTL = 120_000;
const QUOTES_CACHE = new Map();
const QUOTES_TTL = 120_000;
const QUOTE_CHUNK = 20;

const SEARCH_CACHE = new Map();
const SEARCH_TTL = 300_000;

const STOCK_NEWS_CACHE = new Map();
const STOCK_NEWS_TTL = 90_000;

function mapQuote(q) {
  if (!q?.symbol) return null;
  return {
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price: q.regularMarketPrice ?? null,
    change: q.regularMarketChange ?? null,
    changePct: q.regularMarketChangePercent ?? null,
    prevClose: q.regularMarketPreviousClose ?? null,
    marketCap: q.marketCap ?? null,
    volume: q.regularMarketVolume ?? null,
    averageVolume: q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null,
    sharesOutstanding: q.sharesOutstanding ?? null,
    marketState: q.marketState || null,
  };
}

stockRouter.get('/quotes', async (req, res) => {
  try {
    const { symbols = '' } = req.query;
    const list = [...new Set(String(symbols).split(',').map((s) => s.trim()).filter(Boolean))];
    if (!list.length) return res.json({ quotes: [] });

    const cacheKey = [...list].sort().join(',');
    const cached = QUOTES_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < QUOTES_TTL && cached.quotes.length) {
      return res.json({ quotes: cached.quotes });
    }

    const yf = await getYf();
    const quotes = [];
    const chunks = [];
    for (let i = 0; i < list.length; i += QUOTE_CHUNK) {
      chunks.push(list.slice(i, i + QUOTE_CHUNK));
    }
    for (let i = 0; i < chunks.length; i += 2) {
      const pair = chunks.slice(i, i + 2);
      const settled = await Promise.allSettled(pair.map(async (chunk) => {
        const raw = await yf.quote(chunk);
        return (Array.isArray(raw) ? raw : [raw]).map(mapQuote).filter(Boolean);
      }));
      for (const result of settled) {
        if (result.status === 'fulfilled') quotes.push(...result.value);
      }
    }

    if (quotes.length) {
      QUOTES_CACHE.set(cacheKey, { quotes, ts: Date.now() });
      if (QUOTES_CACHE.size > 40) QUOTES_CACHE.delete(QUOTES_CACHE.keys().next().value);
    }
    res.json({ quotes });
  } catch (error) {
    console.error('quotes failed:', error.message);
    const { symbols = '' } = req.query;
    const cacheKey = String(symbols).split(',').map((s) => s.trim()).filter(Boolean).sort().join(',');
    const cached = QUOTES_CACHE.get(cacheKey);
    if (cached?.quotes?.length) return res.json({ quotes: cached.quotes });
    res.json({ quotes: [] });
  }
});

stockRouter.get('/search/query', async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ results: [] });

    const cacheKey = `stock-search:${q.toLowerCase()}`;
    const cached = SEARCH_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < SEARCH_TTL) return res.json(cached.value);

    const yf = await getYf();
    const data = await yf.search(q, { quotesCount: 15, newsCount: 0 }, { validateResult: false });
    const skip = new Set(['OPTION', 'FUTURE', 'FUTURES', 'CURRENCY', 'CRYPTOCURRENCY']);

    const results = (data?.quotes || [])
      .filter((item) => {
        if (!item?.symbol) return false;
        const type = String(item.quoteType || '').toUpperCase();
        return !type || !skip.has(type);
      })
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.shortName || item.longName || item.symbol,
        exchange: item.exchange || '',
        type: item.quoteType || '',
      }));

    const response = { results };
    if (results.length) {
      SEARCH_CACHE.set(cacheKey, { value: response, ts: Date.now() });
      if (SEARCH_CACHE.size > 500) SEARCH_CACHE.delete(SEARCH_CACHE.keys().next().value);
    }
    res.json(response);
  } catch {
    res.json({ results: [] });
  }
});

async function yahooStockNewsMapped(symbol) {
  const yf = await getYf();
  return fetchMergedNews({
    yahooSearch: () => yf.search(symbol, { newsCount: 12, quotesCount: 0 }).then((data) => data?.news || []),
    queryVariants: [symbol, `${symbol} stock market`],
    limit: 12,
  });
}

function pickNum(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    if (typeof value === 'object' && 'raw' in value) {
      if (value.raw == null || value.raw === '') continue;
      const n = Number(value.raw);
      if (Number.isFinite(n)) return n;
      continue;
    }
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

stockRouter.get('/info/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const ticker = String(symbol || '').trim().toUpperCase();
    const cacheKey = `info:v4:${ticker}`;
    const hit = INFO_CACHE.get(cacheKey);
    if (hit && Date.now() - hit.ts < INFO_TTL) return res.json(hit.value);

    const yf = await getYf();
    const [summary, quote, news] = await Promise.all([
      yf.quoteSummary(ticker, {
        modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'summaryProfile', 'assetProfile', 'majorHoldersBreakdown'],
      }).catch(() => null),
      yf.quote(ticker).catch(() => null),
      yahooStockNewsMapped(ticker).catch(() => []),
    ]);

    const q = quote && !Array.isArray(quote) ? quote : (Array.isArray(quote) ? quote[0] : {}) || {};
    const p = summary?.price || {};
    const s = summary?.summaryDetail || {};
    const f = summary?.financialData || {};
    const k = summary?.defaultKeyStatistics || {};
    const h = summary?.majorHoldersBreakdown || {};
    const a = summary?.assetProfile || summary?.summaryProfile || {};

    const result = {
      symbol: ticker,
      name: pickText(p.shortName, p.longName, q.shortName, q.longName, ticker),
      exchange: pickText(p.exchangeName, q.fullExchangeName, q.exchange),
      currency: pickText(p.currency, q.currency, 'USD'),
      sector: pickText(a.sector),
      industry: pickText(a.industry),
      website: pickText(a.website),
      country: pickText(a.country),
      city: pickText(a.city),
      employees: pickNum(a.fullTimeEmployees),
      summary: pickText(a.longBusinessSummary),
      price: pickNum(p.regularMarketPrice, q.regularMarketPrice),
      prevClose: pickNum(p.regularMarketPreviousClose, q.regularMarketPreviousClose),
      open: pickNum(p.regularMarketOpen, q.regularMarketOpen),
      dayHigh: pickNum(p.regularMarketDayHigh, q.regularMarketDayHigh),
      dayLow: pickNum(p.regularMarketDayLow, q.regularMarketDayLow),
      volume: pickNum(p.regularMarketVolume, q.regularMarketVolume, s.volume),
      averageVolume: pickNum(s.averageVolume, q.averageDailyVolume3Month),
      bid: pickNum(q.bid, s.bid),
      ask: pickNum(q.ask, s.ask),
      marketState: pickText(q.marketState),
      marketCap: pickNum(p.marketCap, q.marketCap, s.marketCap),
      enterpriseValue: pickNum(k.enterpriseValue),
      sharesOutstanding: pickNum(k.sharesOutstanding, q.sharesOutstanding),
      floatShares: pickNum(k.floatShares),
      insiderPct: pickNum(k.heldPercentInsiders, h.insidersPercentHeld),
      institutionPct: pickNum(k.heldPercentInstitutions, h.institutionsPercentHeld),
      pe: pickNum(s.trailingPE, q.trailingPE, k.trailingPE),
      forwardPe: pickNum(s.forwardPE, k.forwardPE),
      eps: pickNum(k.trailingEps, q.epsTrailingTwelveMonths),
      bookValue: pickNum(k.bookValue),
      priceToBook: pickNum(k.priceToBook),
      dividendYield: pickNum(s.dividendYield, q.trailingAnnualDividendYield),
      payoutRatio: pickNum(s.payoutRatio),
      fiftyTwoWeekHigh: pickNum(s.fiftyTwoWeekHigh, q.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: pickNum(s.fiftyTwoWeekLow, q.fiftyTwoWeekLow),
      beta: pickNum(k.beta),
      revenue: pickNum(f.totalRevenue),
      revenueGrowth: pickNum(f.revenueGrowth),
      grossMargin: pickNum(f.grossMargins),
      profitMargin: pickNum(f.profitMargins, k.profitMargins),
      operatingMargin: pickNum(f.operatingMargins),
      ebitda: pickNum(f.ebitda),
      roe: pickNum(f.returnOnEquity),
      debtToEquity: pickNum(f.debtToEquity),
      news,
    };

    INFO_CACHE.set(cacheKey, { value: result, ts: Date.now() });
    if (INFO_CACHE.size > 200) INFO_CACHE.delete(INFO_CACHE.keys().next().value);
    res.json(result);
  } catch {
    res.json({ symbol: String(req.params.symbol || '').toUpperCase(), news: [], error: 'Unable to load details' });
  }
});

/** Query form avoids proxies/old stacks mishandling `/news/:symbol`; must stay above `/:symbol` */
stockRouter.get('/news', async (req, res) => {
  const symbol = String(req.query.symbol || '').trim();
  if (!symbol) return res.json({ symbol: '', news: [] });
  try {
    const nKey = `snews:v2:${symbol}`;
    const cached = STOCK_NEWS_CACHE.get(nKey);
    if (cached && Date.now() - cached.ts < STOCK_NEWS_TTL) return res.json({ symbol, news: cached.value });
    const news = await yahooStockNewsMapped(symbol);
    STOCK_NEWS_CACHE.set(nKey, { value: news, ts: Date.now() });
    if (STOCK_NEWS_CACHE.size > 250) STOCK_NEWS_CACHE.delete(STOCK_NEWS_CACHE.keys().next().value);
    res.json({ symbol, news });
  } catch {
    res.json({ symbol, news: [] });
  }
});

stockRouter.get('/news/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const nKey = `snews:v2:${symbol}`;
    const cached = STOCK_NEWS_CACHE.get(nKey);
    if (cached && Date.now() - cached.ts < STOCK_NEWS_TTL) return res.json({ symbol, news: cached.value });
    const news = await yahooStockNewsMapped(symbol);
    STOCK_NEWS_CACHE.set(nKey, { value: news, ts: Date.now() });
    if (STOCK_NEWS_CACHE.size > 250) STOCK_NEWS_CACHE.delete(STOCK_NEWS_CACHE.keys().next().value);
    res.json({ symbol, news });
  } catch {
    res.json({ symbol: req.params.symbol, news: [] });
  }
});

stockRouter.get('/:symbol/outlook', async (req, res) => {
  const symbol = String(req.params.symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return res.status(400).json({ error: 'symbol must be a ticker.', code: 'INVALID_SYMBOL' });
  }
  const years = parseOutlookYears(req.query.years ?? 3);
  if (years == null) {
    return res.status(400).json({ error: 'years must be 1, 2, 3, or 5.', code: 'INVALID_HORIZON' });
  }

  const cacheKey = `outlook:${symbol}:${years}`;
  const cached = RESP_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < RESP_TTL) {
    return res.json(cached.body);
  }

  try {
    const { raw, metadata } = await fetchStockSeriesWithFallback(symbol, '10y', '1d');
    const { series, currency } = normalizeStockSeries(raw, symbol);
    const projected = projectOutlook(series, {
      horizonYears: years,
      periodsPerYear: 252,
      minBars: 252,
    });
    if (!projected.ok) {
      const status = projected.code === 'INSUFFICIENT_HISTORY' ? 422 : 400;
      return res.status(status).json({ ...projected, error: projected.reason });
    }
    const body = {
      ...projected,
      symbol,
      currency: currency || 'USD',
      provider: metadata?.provider || 'yahoo-finance',
      sampleLimited: false,
    };
    RESP_CACHE.set(cacheKey, { body, ts: Date.now() });
    return res.json(body);
  } catch (error) {
    const status = error?.response?.status === 429 ? 429 : 502;
    return res.status(status).json({
      error: `Outlook history is unavailable for ${symbol}.`,
      code: 'HISTORY_UNAVAILABLE',
      provider: 'yahoo-finance',
    });
  }
});

stockRouter.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '3mo', interval = '1d', period1, period2 } = req.query;
    const rKey = `resp:stock:${symbol}:${range}:${interval}:${period1 || ''}:${period2 || ''}`;
    const hit = RESP_CACHE.get(rKey);
    if (hit && Date.now() - hit.ts < RESP_TTL) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(hit.json);
    }

    const { raw, metadata } = await fetchStockSeriesWithFallback(symbol, range, interval, period1, period2);
    const normalized = normalizeStockSeries(raw, symbol.toUpperCase());
    const series = enrichIndicators(normalized.series);
    const body = {
      ...normalized,
      series,
      provenance: buildDataProvenance(series, { ...metadata, derived: true }),
    };
    const jsonStr = JSON.stringify(body);

    if (series.length) {
      RESP_CACHE.set(rKey, { json: jsonStr, ts: Date.now() });
      if (RESP_CACHE.size > 200) RESP_CACHE.delete(RESP_CACHE.keys().next().value);
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(jsonStr);
  } catch (error) {
    const status = error?.response?.status === 429 ? 429 : 502;
    res.status(status).json({ error: `Failed to fetch live data for ${req.params.symbol}: ${error.message}`, provider: 'yahoo-finance' });
  }
});
