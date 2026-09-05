import { Router } from 'express';
import axios from 'axios';
import { buildDataProvenance, fetchCryptoSeriesWithFallback, geckoIdFromYahooCryptoSymbol } from '../services/marketData.js';
import { fetchMergedNews } from '../services/news.js';
import { enrichIndicators, normalizeCryptoSeries } from '../utils/normalize.js';

export const cryptoRouter = Router();

let yfInst = null;
async function getYf() {
  if (yfInst) return yfInst;
  const mod = await import('yahoo-finance2');
  yfInst = new (mod.default)({ suppressNotices: ['yahooSurvey'] });
  return yfInst;
}

const NEWS_CACHE = new Map();
const NEWS_TTL = 180_000;

const RESP_CACHE = new Map();
const RESP_TTL = 180_000;
const SEARCH_CACHE = new Map();
const SEARCH_TTL = 300_000;
const INFO_CACHE = new Map();
const INFO_TTL = 120_000;
const MARKET_CACHE = new Map();
const MARKET_TTL = 180_000;

/** Matches frontend OVERVIEW_UNIVERSE — Yahoo when CoinGecko markets/chart are blocked */
const YAHOO_OVERVIEW_MAP = [
  { id: 'bitcoin', yahoo: 'BTC-USD' },
  { id: 'ethereum', yahoo: 'ETH-USD' },
  { id: 'solana', yahoo: 'SOL-USD' },
  { id: 'ripple', yahoo: 'XRP-USD' },
  { id: 'dogecoin', yahoo: 'DOGE-USD' },
  { id: 'shiba-inu', yahoo: 'SHIB-USD' },
  { id: 'pepe', yahoo: 'PEPE-USD' },
  { id: 'bonk-1', yahoo: 'BONK-USD' },
];
const YAHOO_OVERVIEW_CACHE = { data: null, ts: 0 };
const YAHOO_OVERVIEW_TTL = 60_000;

const YAHOO_SYMBOL_MAP = Object.fromEntries(YAHOO_OVERVIEW_MAP.map((row) => [row.id, row.yahoo]));

const YAHOO_COIN_META = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
  ethereum: { symbol: 'ETH', name: 'Ethereum' },
  solana: { symbol: 'SOL', name: 'Solana' },
  ripple: { symbol: 'XRP', name: 'XRP' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin' },
  'shiba-inu': { symbol: 'SHIB', name: 'Shiba Inu' },
  pepe: { symbol: 'PEPE', name: 'Pepe' },
  'bonk-1': { symbol: 'BONK', name: 'Bonk' },
};

async function loadYahooOverviewQuotes() {
  if (YAHOO_OVERVIEW_CACHE.data?.quotes?.length && Date.now() - YAHOO_OVERVIEW_CACHE.ts < YAHOO_OVERVIEW_TTL) {
    return YAHOO_OVERVIEW_CACHE.data.quotes;
  }
  const yf = await getYf();
  const symbols = YAHOO_OVERVIEW_MAP.map((x) => x.yahoo);
  const raw = await yf.quote(symbols);
  const rows = Array.isArray(raw) ? raw : [raw];
  const bySym = new Map(rows.map((q) => [q.symbol, q]));
  const quotes = YAHOO_OVERVIEW_MAP.map(({ id, yahoo }) => {
    const q = bySym.get(yahoo);
    if (!q || q.regularMarketPrice == null) return null;
    return {
      id,
      price: q.regularMarketPrice,
      changePct: q.regularMarketChangePercent ?? 0,
    };
  }).filter(Boolean);
  if (quotes.length) {
    YAHOO_OVERVIEW_CACHE.data = { quotes };
    YAHOO_OVERVIEW_CACHE.ts = Date.now();
  }
  return quotes;
}

function quotesToMarketCoins(quotes) {
  return quotes.map((q) => {
    const meta = YAHOO_COIN_META[q.id] || { symbol: String(q.id).toUpperCase(), name: q.id };
    return {
      id: q.id,
      symbol: meta.symbol,
      name: meta.name,
      image: null,
      price: q.price,
      marketCap: null,
      volume24h: null,
      change24h: q.changePct,
      change7d: null,
      rank: null,
      high24h: null,
      low24h: null,
    };
  });
}

async function mergedCryptoNews(queryVariants = []) {
  const yf = await getYf();
  const primary = queryVariants.find(Boolean) || 'crypto market';
  return fetchMergedNews({
    yahooSearch: () => yf.search(primary, { newsCount: 10, quotesCount: 0 }).then((data) => data?.news || []),
    queryVariants,
    limit: 10,
  });
}

cryptoRouter.get('/search/query', async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ results: [] });

    const cacheKey = `crypto-search:${q.toLowerCase()}`;
    const cached = SEARCH_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < SEARCH_TTL) return res.json(cached.value);

    let results = [];
    try {
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
      const { data } = await axios.get(url, { timeout: 4000 });
      results = (data?.coins || []).slice(0, 15).map((coin) => ({
        id: coin.id,
        name: coin.name,
        ticker: coin.symbol?.toUpperCase() || '',
        thumb: coin.thumb || '',
        marketCapRank: coin.market_cap_rank || null,
      }));
    } catch {
      results = [];
    }

    if (!results.length) {
      try {
        const yf = await getYf();
        const data = await yf.search(q, { quotesCount: 15, newsCount: 0 }, { validateResult: false });
        results = (data?.quotes || [])
          .filter((item) => {
            const type = String(item.quoteType || '').toUpperCase();
            const symbol = String(item.symbol || '');
            return type.includes('CRYPTO') || /-[A-Z]{3}$/.test(symbol);
          })
          .map((item) => {
            const ticker = String(item.symbol || '').replace(/-USD$/i, '').toUpperCase();
            return {
              id: geckoIdFromYahooCryptoSymbol(item.symbol) || ticker.toLowerCase(),
              name: item.shortname || item.longname || item.shortName || item.longName || ticker,
              ticker,
              thumb: '',
              marketCapRank: null,
            };
          })
          .filter((row) => row.id);
      } catch {
        results = [];
      }
    }

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

function marketCacheKey(query = {}) {
  const rawPages = Number(query.pages);
  const rawPerPage = Number(query.perPage);
  const pages = Number.isFinite(rawPages) ? Math.max(1, Math.min(6, Math.round(rawPages))) : 1;
  const perPage = Number.isFinite(rawPerPage) ? Math.max(50, Math.min(250, Math.round(rawPerPage))) : 250;
  return { pages, perPage, cacheKey: `${pages}:${perPage}` };
}

function mapMarketCoins(rows) {
  const seen = new Set();
  return rows
    .filter((c) => c?.id && !seen.has(c.id) && seen.add(c.id))
    .map((c) => ({
      id: c.id,
      symbol: c.symbol?.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      marketCap: c.market_cap,
      volume24h: c.total_volume,
      change24h: c.price_change_percentage_24h,
      change7d: c.price_change_percentage_7d_in_currency,
      rank: c.market_cap_rank,
      high24h: c.high_24h,
      low24h: c.low_24h,
    }));
}

async function fetchGeckoMarketPage(page, perPage) {
  const { data } = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
    timeout: 12000,
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: perPage,
      page,
      sparkline: false,
      price_change_percentage: '24h,7d',
    },
  });
  return Array.isArray(data) ? data : [];
}

cryptoRouter.get('/markets', async (req, res) => {
  const { pages, perPage, cacheKey } = marketCacheKey(req.query);
  try {
    const cached = MARKET_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < MARKET_TTL && (cached.result?.coins?.length || 0) >= 50) {
      return res.json(cached.result);
    }

    const pageResults = await Promise.allSettled(
      Array.from({ length: pages }, (_, idx) => fetchGeckoMarketPage(idx + 1, perPage)),
    );

    let merged = [];
    pageResults.forEach((result) => {
      if (result.status === 'fulfilled') merged.push(...result.value);
    });

    if (!merged.length) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        merged = await fetchGeckoMarketPage(1, perPage);
      } catch {
        merged = [];
      }
    }

    const coins = mapMarketCoins(merged);
    const result = { coins, updatedAt: new Date().toISOString() };
    if (!coins.length) {
      try {
        const quotes = await loadYahooOverviewQuotes();
        if (quotes.length) {
          result.coins = quotesToMarketCoins(quotes);
          result.source = 'yahoo-finance';
        }
      } catch {
        // Keep the empty CoinGecko result; the client can still use Yahoo overview quotes.
      }
    }
    if (result.coins.length >= 50) {
      MARKET_CACHE.set(cacheKey, { result, ts: Date.now() });
      if (MARKET_CACHE.size > 20) MARKET_CACHE.delete(MARKET_CACHE.keys().next().value);
    }
    res.json(result);
  } catch {
    const cached = MARKET_CACHE.get(cacheKey);
    if ((cached?.result?.coins?.length || 0) >= 50) return res.json(cached.result);
    try {
      const quotes = await loadYahooOverviewQuotes();
      if (quotes.length) {
        return res.json({
          coins: quotesToMarketCoins(quotes),
          updatedAt: new Date().toISOString(),
          source: 'yahoo-finance',
        });
      }
    } catch {
      // Fall through to the empty error response.
    }
    res.status(502).json({ error: 'Failed to fetch crypto markets', coins: [] });
  }
});

cryptoRouter.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `cinfo:v2:${id}`;
    const hit = INFO_CACHE.get(cacheKey);
    if (hit && Date.now() - hit.ts < INFO_TTL) return res.json(hit.value);

    const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`, {
      timeout: 8000,
      params: { localization: false, tickers: false, community_data: false, developer_data: false, sparkline: false },
    });

    // Yahoo Finance does not expose "crypto news by CoinGecko id" directly.
    // We try to query Yahoo using a best-effort symbol mapping.
    const yahooQuery = YAHOO_SYMBOL_MAP[data.id] || (data.symbol ? `${data.symbol.toUpperCase()}-USD` : null);

    let news = [];
    try {
      if (yahooQuery) {
        const nKey = `cnews:v3:${yahooQuery}`;
        const cached = NEWS_CACHE.get(nKey);
        if (cached && Date.now() - cached.ts < NEWS_TTL) {
          news = cached.value;
        } else {
          news = await mergedCryptoNews([data.name, `${data.name} crypto`, yahooQuery]);
          NEWS_CACHE.set(nKey, { value: news, ts: Date.now() });
          if (NEWS_CACHE.size > 250) NEWS_CACHE.delete(NEWS_CACHE.keys().next().value);
        }
      }
    } catch {
      news = [];
    }

    const result = {
      id: data.id,
      name: data.name,
      symbol: data.symbol?.toUpperCase(),
      image: data.image?.small || null,
      description: data.description?.en?.split('. ').slice(0, 3).join('. ') || '',
      marketCapRank: data.market_cap_rank || null,
      marketCap: data.market_data?.market_cap?.usd || null,
      totalVolume: data.market_data?.total_volume?.usd || null,
      high24h: data.market_data?.high_24h?.usd || null,
      low24h: data.market_data?.low_24h?.usd || null,
      ath: data.market_data?.ath?.usd || null,
      athDate: data.market_data?.ath_date?.usd || null,
      atl: data.market_data?.atl?.usd || null,
      circulatingSupply: data.market_data?.circulating_supply || null,
      totalSupply: data.market_data?.total_supply || null,
      priceChange24h: data.market_data?.price_change_percentage_24h || null,
      priceChange7d: data.market_data?.price_change_percentage_7d || null,
      priceChange30d: data.market_data?.price_change_percentage_30d || null,
      links: {
        homepage: data.links?.homepage?.[0] || null,
        blockchain: data.links?.blockchain_site?.[0] || null,
        reddit: data.links?.subreddit_url || null,
        twitter: data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : null,
      },
      categories: data.categories || [],
      news,
    };

    INFO_CACHE.set(cacheKey, { value: result, ts: Date.now() });
    if (INFO_CACHE.size > 100) INFO_CACHE.delete(INFO_CACHE.keys().next().value);
    res.json(result);
  } catch {
    res.json({ id: req.params.id, error: 'Unable to load coin details' });
  }
});

cryptoRouter.get('/yahoo-overview-quotes', async (_req, res) => {
  try {
    const quotes = await loadYahooOverviewQuotes();
    res.json({ quotes });
  } catch {
    if (YAHOO_OVERVIEW_CACHE.data?.quotes?.length) return res.json(YAHOO_OVERVIEW_CACHE.data);
    res.json({ quotes: [] });
  }
});

cryptoRouter.get('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Best-effort Yahoo query mapping (so we don't rely on CoinGecko here).
    const yahooQuery = YAHOO_SYMBOL_MAP[id] || `${id}`.toUpperCase();

    const nKey = `cnews:v3:${yahooQuery}`;
    const cached = NEWS_CACHE.get(nKey);
    if (cached && Date.now() - cached.ts < NEWS_TTL) return res.json({ id, news: cached.value });

    const news = await mergedCryptoNews([id, `${id} crypto`, yahooQuery]);

    NEWS_CACHE.set(nKey, { value: news, ts: Date.now() });
    if (NEWS_CACHE.size > 250) NEWS_CACHE.delete(NEWS_CACHE.keys().next().value);

    res.json({ id, news });
  } catch {
    res.json({ id: req.params.id, news: [], error: 'Unable to load crypto news' });
  }
});

cryptoRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 90, symbol = '' } = req.query;
    const ticker = String(symbol).trim().slice(0, 12);
    const rKey = `resp:crypto:${id}:${days}:${ticker.toUpperCase()}`;
    const hit = RESP_CACHE.get(rKey);
    if (hit && Date.now() - hit.ts < RESP_TTL) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(hit.json);
    }

    const { raw, metadata } = await fetchCryptoSeriesWithFallback(id, days, { symbol: ticker });
    const normalized = normalizeCryptoSeries(raw, id);
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
    res.status(status).json({ error: `Failed to fetch live data for ${req.params.id}: ${error.message}`, provider: 'coingecko' });
  }
});
