import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, Line, LineChart,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchFx, fetchStock, fetchStockInfo, fetchStockNews, fetchStockOutlook, fetchStockQuotes, searchStocks } from '../lib/api';
import { HelpHint } from '../components/HelpHint';
import { ConditionBoard } from '../components/ConditionBoard';
import { MarketChart } from '../components/MarketChart';
import { OutlookPanel } from '../components/OutlookPanel';
import { LiquidityFlag } from '../components/LiquidityFlag';
import { LiquidityBoard } from '../components/LiquidityBoard';
import { matchesSearch, searchRank } from '../lib/textSearch';
import { assessLiquidity, scoreLiquidityBoard } from '../lib/liquidity';
import { useWatchlist } from '../hooks/useWatchlist';
import { useAuth } from '../lib/auth';
import { useGuide } from '../lib/guide';
import {
  breadthFromChanges,
  conditionFromAvg,
  firstLastPct,
  rebaseAverageSeries,
} from '../lib/marketMath';

function scalePriceFields(series, rate) {
  const keys = ['open', 'high', 'low', 'close', 'ma7', 'sma20', 'ema20', 'bb_upper', 'bb_middle', 'bb_lower', 'macd', 'macd_signal', 'macd_hist'];
  return series.map((row) => {
    const next = { ...row };
    for (const key of keys) {
      if (Number.isFinite(next[key])) next[key] *= rate;
    }
    return next;
  });
}

const OVERVIEW_UNIVERSE = ['AAPL', 'MSFT', 'GOOGL', 'NVDA'];

const STOCK_CATALOG = [
  ['AAPL', 'Apple', 'Tech'],
  ['MSFT', 'Microsoft', 'Tech'],
  ['GOOGL', 'Alphabet', 'Tech'],
  ['AMZN', 'Amazon', 'Tech'],
  ['META', 'Meta Platforms', 'Tech'],
  ['NVDA', 'NVIDIA', 'Tech'],
  ['NFLX', 'Netflix', 'Tech'],
  ['AMD', 'AMD', 'Tech'],
  ['INTC', 'Intel', 'Tech'],
  ['CRM', 'Salesforce', 'Tech'],
  ['ORCL', 'Oracle', 'Tech'],
  ['ADBE', 'Adobe', 'Tech'],
  ['AVGO', 'Broadcom', 'Tech'],
  ['QCOM', 'Qualcomm', 'Tech'],
  ['MU', 'Micron', 'Tech'],
  ['ARM', 'Arm Holdings', 'Tech'],
  ['SMCI', 'Super Micro', 'Tech'],
  ['PLTR', 'Palantir', 'Tech'],
  ['SHOP', 'Shopify', 'Tech'],
  ['UBER', 'Uber', 'Tech'],
  ['SNAP', 'Snap', 'Tech'],
  ['SPOT', 'Spotify', 'Tech'],
  ['NOW', 'ServiceNow', 'Tech'],
  ['PANW', 'Palo Alto Networks', 'Tech'],
  ['CRWD', 'CrowdStrike', 'Tech'],
  ['SNOW', 'Snowflake', 'Tech'],
  ['ASML', 'ASML', 'Tech'],
  ['TSM', 'Taiwan Semi', 'Tech'],
  ['PYPL', 'PayPal', 'Fintech'],
  ['SQ', 'Block', 'Fintech'],
  ['COIN', 'Coinbase', 'Fintech'],
  ['SOFI', 'SoFi', 'Fintech'],
  ['AFRM', 'Affirm', 'Fintech'],
  ['HOOD', 'Robinhood', 'Fintech'],
  ['JPM', 'JPMorgan', 'Finance'],
  ['BAC', 'Bank of America', 'Finance'],
  ['GS', 'Goldman Sachs', 'Finance'],
  ['V', 'Visa', 'Finance'],
  ['MA', 'Mastercard', 'Finance'],
  ['BRK-B', 'Berkshire Hathaway', 'Finance'],
  ['MS', 'Morgan Stanley', 'Finance'],
  ['C', 'Citigroup', 'Finance'],
  ['BLK', 'BlackRock', 'Finance'],
  ['SCHW', 'Charles Schwab', 'Finance'],
  ['WMT', 'Walmart', 'Consumer'],
  ['KO', 'Coca-Cola', 'Consumer'],
  ['PEP', 'PepsiCo', 'Consumer'],
  ['NKE', 'Nike', 'Consumer'],
  ['DIS', 'Disney', 'Consumer'],
  ['HD', 'Home Depot', 'Consumer'],
  ['COST', 'Costco', 'Consumer'],
  ['MCD', 'McDonald\'s', 'Consumer'],
  ['SBUX', 'Starbucks', 'Consumer'],
  ['TGT', 'Target', 'Consumer'],
  ['PG', 'Procter & Gamble', 'Consumer'],
  ['JNJ', 'Johnson & Johnson', 'Health'],
  ['PFE', 'Pfizer', 'Health'],
  ['UNH', 'UnitedHealth', 'Health'],
  ['LLY', 'Eli Lilly', 'Health'],
  ['ABBV', 'AbbVie', 'Health'],
  ['MRK', 'Merck', 'Health'],
  ['NVO', 'Novo Nordisk', 'Health'],
  ['AZN', 'AstraZeneca', 'Health'],
  ['ISRG', 'Intuitive Surgical', 'Health'],
  ['XOM', 'Exxon Mobil', 'Energy'],
  ['CVX', 'Chevron', 'Energy'],
  ['COP', 'ConocoPhillips', 'Energy'],
  ['SLB', 'Schlumberger', 'Energy'],
  ['BP', 'BP', 'Energy'],
  ['SHEL', 'Shell', 'Energy'],
  ['TSLA', 'Tesla', 'Auto'],
  ['RIVN', 'Rivian', 'Auto'],
  ['LCID', 'Lucid', 'Auto'],
  ['GM', 'General Motors', 'Auto'],
  ['F', 'Ford', 'Auto'],
  ['TM', 'Toyota', 'Auto'],
  ['BA', 'Boeing', 'Industrial'],
  ['CAT', 'Caterpillar', 'Industrial'],
  ['GE', 'GE Aerospace', 'Industrial'],
  ['DE', 'Deere', 'Industrial'],
  ['LMT', 'Lockheed Martin', 'Industrial'],
  ['RTX', 'RTX', 'Industrial'],
  ['HON', 'Honeywell', 'Industrial'],
  ['T', 'AT&T', 'Telecom'],
  ['VZ', 'Verizon', 'Telecom'],
  ['TMUS', 'T-Mobile', 'Telecom'],
  ['NEE', 'NextEra Energy', 'Utilities'],
  ['DUK', 'Duke Energy', 'Utilities'],
  ['SO', 'Southern Company', 'Utilities'],
  ['LIN', 'Linde', 'Materials'],
  ['FCX', 'Freeport-McMoRan', 'Materials'],
  ['NEM', 'Newmont', 'Materials'],
  ['RIO', 'Rio Tinto', 'Materials'],
  ['BHP', 'BHP', 'Materials'],
  ['MAR', 'Marriott', 'Travel'],
  ['BKNG', 'Booking Holdings', 'Travel'],
  ['ABNB', 'Airbnb', 'Travel'],
  ['DAL', 'Delta Air Lines', 'Travel'],
  ['CCL', 'Carnival', 'Travel'],
  ['SPY', 'SPDR S&P 500 ETF', 'ETF'],
  ['QQQ', 'Invesco QQQ Trust', 'ETF'],
  ['DIA', 'SPDR Dow Jones ETF', 'ETF'],
  ['IWM', 'iShares Russell 2000 ETF', 'ETF'],
  ['XLF', 'Financial Select Sector SPDR', 'ETF'],
  ['XLK', 'Technology Select Sector SPDR', 'ETF'],
  ['XLE', 'Energy Select Sector SPDR', 'ETF'],
].map(([symbol, name, sector]) => ({ symbol, name, sector }));

const STOCK_CATEGORIES = ['All', ...new Set(STOCK_CATALOG.map((entry) => entry.sector))];

const SECTOR_ALIASES = {
  technology: 'Tech',
  'information technology': 'Tech',
  'financial services': 'Finance',
  financials: 'Finance',
  'consumer cyclical': 'Consumer',
  'consumer defensive': 'Consumer',
  healthcare: 'Health',
  industrials: 'Industrial',
  'communication services': 'Telecom',
  utilities: 'Utilities',
  'basic materials': 'Materials',
  energy: 'Energy',
};

function catalogSector(label) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  const exact = STOCK_CATALOG.find((entry) => entry.sector.toLowerCase() === raw.toLowerCase())?.sector;
  if (exact) return exact;
  return SECTOR_ALIASES[raw.toLowerCase()] || '';
}

const TIMEFRAMES = [
  { id: '24h', label: '24hrs', stockRange: '1d', stockInterval: '5m' },
  { id: '7d', label: '7 days', stockRange: '7d', stockInterval: '30m' },
  { id: '1mo', label: '1 month', stockRange: '1mo', stockInterval: '1h' },
  { id: '2mo', label: '2 month', stockRange: '2mo', stockInterval: '1d' },
  { id: '3mo', label: '3 month', stockRange: '3mo', stockInterval: '1d' },
  { id: '1y', label: '1 yr', stockRange: '1y', stockInterval: '1d' },
  { id: 'max', label: 'max', stockRange: 'max', stockInterval: '1d' },
  { id: 'custom', label: 'custom', stockRange: '1mo', stockInterval: '1d' },
];

const CURRENCY_SYMBOLS = { USD: '$', NGN: '₦' };

function formatMoney(value, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${sym}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatUsdCap(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatShares(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatCompactCount(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatRatio(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits);
}

function formatPercentStat(value) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function newsDateSuffix(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return ` · ${new Date(t).toLocaleDateString()}`;
}

function computeChange(series) {
  const pct = firstLastPct(series);
  if (pct == null) return { pct: 0, isPositive: true };
  return { pct, isPositive: pct >= 0 };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values) {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function quoteSymbolKey(symbol) {
  return String(symbol || '').toUpperCase().replace(/\./g, '-');
}

function mergeQuoteMap(prev, quotes) {
  const next = new Map(prev);
  for (const quote of quotes || []) {
    if (!quote?.symbol) continue;
    next.set(quoteSymbolKey(quote.symbol), quote);
  }
  return next;
}

function lastBarChangePct(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const prev = Number(rows.at(-2)?.close);
  const curr = Number(rows.at(-1)?.close);
  if (!Number.isFinite(prev) || prev === 0 || !Number.isFinite(curr)) return null;
  return (curr / prev - 1) * 100;
}

/** Typical size of recent bar-to-bar % moves (1σ). Not a trade signal. */
function recentMoveSpread(rows) {
  const closes = (rows || []).map((row) => Number(row?.close)).filter(Number.isFinite);
  if (closes.length < 8) {
    return { stdPct: null, label: 'N/A', barCount: 0, intraday: false };
  }
  const window = closes.slice(-21);
  const returns = [];
  for (let i = 1; i < window.length; i += 1) {
    const prev = window[i - 1];
    if (prev) returns.push((window[i] / prev - 1) * 100);
  }
  if (returns.length < 5) {
    return { stdPct: null, label: 'N/A', barCount: returns.length, intraday: false };
  }
  const stdPct = sampleStd(returns);
  const intraday = (rows || []).some((row) => String(row?.date || '').includes('T'));
  const highCut = intraday ? 0.7 : 2.2;
  const elevatedCut = intraday ? 0.35 : 1.2;
  const label = stdPct > highCut ? 'High' : stdPct > elevatedCut ? 'Elevated' : 'Calm';
  return { stdPct, label, barCount: returns.length, intraday };
}

function buildComparisonSeries(primarySeries, secondarySeries, primarySymbol, secondarySymbol) {
  if (!primarySeries?.length || !secondarySeries?.length) return [];

  const secondaryByDate = new Map(
    secondarySeries
      .filter((point) => Number.isFinite(point?.close))
      .map((point) => [point.date, point.close]),
  );

  const primaryBase = primarySeries.find((point) => Number.isFinite(point?.close))?.close;
  const secondaryBase = secondarySeries.find((point) => Number.isFinite(point?.close))?.close;
  if (!Number.isFinite(primaryBase) || !Number.isFinite(secondaryBase) || primaryBase <= 0 || secondaryBase <= 0) {
    return [];
  }

  return primarySeries
    .filter((point) => secondaryByDate.has(point.date) && Number.isFinite(point.close))
    .map((point) => ({
      date: point.date,
      [primarySymbol]: Number((((point.close / primaryBase) - 1) * 100).toFixed(2)),
      [secondarySymbol]: Number((((secondaryByDate.get(point.date) / secondaryBase) - 1) * 100).toFixed(2)),
    }));
}

function buildOverviewSnapshotMetrics(quotes) {
  const bySymbol = new Map((quotes || []).map((quote) => [quote.symbol, quote]));
  const items = OVERVIEW_UNIVERSE.map((symbol) => {
    const q = bySymbol.get(symbol);
    if (!q || q.price == null) return null;
    const changePct = Number.isFinite(Number(q.changePct)) ? Number(q.changePct) : null;
    if (changePct == null) return null;
    return { asset: symbol, price: Number(q.price), previousClose: q.prevClose, changePct };
  }).filter(Boolean);

  if (!items.length) return null;

  const movers = [...items].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const { advances, declines, avg: avgChange } = breadthFromChanges(movers.map((m) => m.changePct));

  return {
    summary: {
      avgChange,
      advances,
      declines,
      condition: conditionFromAvg(avgChange, { bullThreshold: 1, bearThreshold: -1 }),
    },
    movers,
    conditionSeries: [],
    snapshotFallback: true,
  };
}

function stockOverviewPayloadFromSeriesItems(items, snapshotFallback) {
  const movers = items
    .map((item) => {
      const changePct = firstLastPct(item.series);
      return changePct == null ? null : { ...item, changePct };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const { advances, declines, avg: avgChange } = breadthFromChanges(movers.map((m) => m.changePct));

  return {
    summary: {
      avgChange,
      advances,
      declines,
      condition: conditionFromAvg(avgChange, { bullThreshold: 1, bearThreshold: -1 }),
    },
    movers,
    conditionSeries: rebaseAverageSeries(movers),
    snapshotFallback,
  };
}

export function StockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlSymbol = useRef(null);
  const { isSignedIn, accountsEnabled, openAuth } = useAuth();
  const { watchlist, toggleWatchlist } = useWatchlist();
  const { active: tourActive, current: tourStep } = useGuide();
  const [symbol, setSymbol] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('7d');
  const [customStart, setCustomStart] = useState('2024-01-01');
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [showNgn, setShowNgn] = useState(false);
  const [series, setSeries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [fxRate, setFxRate] = useState(null);
  const [overview, setOverview] = useState({ summary: null, movers: [], conditionSeries: [] });
  const [stockInfo, setStockInfo] = useState(null);
  const [stockInfoLoading, setStockInfoLoading] = useState(false);
  const [allQuotes, setAllQuotes] = useState(new Map());
  const [quotesReady, setQuotesReady] = useState(false);
  const [stockFilter, setStockFilter] = useState('All');
  const [stockCapFilter, setStockCapFilter] = useState('all');
  const [stockSort, setStockSort] = useState('market_cap');
  const [breadthView, setBreadthView] = useState('all');
  const [vizTab, setVizTab] = useState('performance');
  const [error, setError] = useState('');
  const [overviewError, setOverviewError] = useState('');
  const [overviewRetryKey, setOverviewRetryKey] = useState(0);
  const [stockNews, setStockNews] = useState([]);
  const [stockNewsLoaded, setStockNewsLoaded] = useState(false);
  const [compareSymbol, setCompareSymbol] = useState('');
  const [compareSeries, setCompareSeries] = useState([]);
  const assetCacheRef = useRef(new Map());
  const overviewCacheRef = useRef(new Map());
  const searchRef = useRef(null);
  const selectedPanelRef = useRef(null);
  const sectorContextRef = useRef(null);
  const outlookRef = useRef(null);
  const compareRef = useRef(null);
  const [sectorContextOn, setSectorContextOn] = useState(false);
  const [outlookYears, setOutlookYears] = useState(3);
  const [outlook, setOutlook] = useState(null);
  const [outlookError, setOutlookError] = useState('');
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [fromLiquidity, setFromLiquidity] = useState(false);
  const [liquidityListKey, setLiquidityListKey] = useState(0);
  const scrollAfterClose = useRef(null);
  const liquidityRef = useRef(null);
  const browseRef = useRef(null);
  const breadthRef = useRef(null);
  const vizRef = useRef(null);
  const conditionRef = useRef(null);

  const tf = TIMEFRAMES.find((item) => item.id === timeframe) || TIMEFRAMES[1];

  const stockRequest = useMemo(() => {
    if (timeframe !== 'custom') return { range: tf.stockRange, interval: tf.stockInterval };
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const safeEnd = end > start ? end : new Date(start.getTime() + 24 * 3600 * 1000);
    const diffDays = Math.max(1, Math.round((safeEnd - start) / (24 * 3600 * 1000)));
    return {
      interval: diffDays <= 7 ? '30m' : diffDays <= 31 ? '1h' : '1d',
      period1: Math.floor(start.getTime() / 1000),
      period2: Math.floor(safeEnd.getTime() / 1000),
    };
  }, [timeframe, tf.stockRange, tf.stockInterval, customStart, customEnd]);

  const overviewRequest = useMemo(() => {
    if (timeframe !== 'custom') return { range: tf.stockRange, interval: tf.stockInterval };
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const safeEnd = end > start ? end : new Date(start.getTime() + 24 * 3600 * 1000);
    const diffDays = Math.max(1, Math.round((safeEnd - start) / (24 * 3600 * 1000)));
    return {
      interval: diffDays <= 7 ? '30m' : diffDays <= 31 ? '1h' : '1d',
      period1: Math.floor(start.getTime() / 1000),
      period2: Math.floor(safeEnd.getTime() / 1000),
    };
  }, [timeframe, tf.stockRange, tf.stockInterval, customStart, customEnd]);

  useEffect(() => {
    const cacheKey = `overview:${JSON.stringify(overviewRequest)}`;
    const loadOverview = async () => {
      const cached = overviewCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.at < 180_000) {
        setOverview(cached.data);
        setOverviewError('');
        return;
      }
      try {
        setOverviewError('');
        let payload = null;

        const quotes = await fetchStockQuotes(OVERVIEW_UNIVERSE);
        const quoteSnapshot = buildOverviewSnapshotMetrics(quotes.quotes);
        if (quoteSnapshot) {
          setOverview(quoteSnapshot);
        }

        const stockSet = await Promise.allSettled(
          OVERVIEW_UNIVERSE.map((ticker) => fetchStock(ticker, overviewRequest)),
        );
        const items = stockSet
          .map((result, idx) => {
            if (result.status !== 'fulfilled') return null;
            return { asset: OVERVIEW_UNIVERSE[idx], series: result.value?.series || [] };
          })
          .filter((item) => item && item.series.length >= 2);
        if (items.length) payload = stockOverviewPayloadFromSeriesItems(items, false);

        if (!payload) payload = quoteSnapshot;
        if (!payload) throw new Error('No stock overview data is available right now.');

        overviewCacheRef.current.set(cacheKey, { data: payload, at: Date.now() });
        setOverview(payload);
      } catch (err) {
        setOverview({ summary: null, movers: [], conditionSeries: [] });
        setOverviewError(err?.message || 'Market overview could not be loaded. Check that the API is running.');
      }
    };
    loadOverview();
  }, [overviewRequest, overviewRetryKey, timeframe]);

  useEffect(() => {
    let cancelled = false;
    const symbols = STOCK_CATALOG.map((s) => s.symbol);
    fetchStockQuotes(symbols)
      .then((d) => {
        if (cancelled) return;
        setAllQuotes((prev) => mergeQuoteMap(prev, d.quotes));
      })
      .finally(() => {
        if (!cancelled) setQuotesReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!symbol) return;
    const key = `${symbol}-${JSON.stringify(stockRequest)}`;
    const cached = assetCacheRef.current.get(key);
    if (cached && Date.now() - cached.at < 180_000) {
      const c = cached.data;
      setSeries(c.series); setMeta(c.meta); setCurrency(c.currency);
    } else {
      setSeries([]);
      setMeta(null);
    }
    let cancelled = false;
    (async () => {
      try {
        setError('');
        fetchFx()
          .then((fx) => {
            if (!cancelled && Number.isFinite(Number(fx?.rate))) setFxRate(Number(fx.rate));
          })
          .catch(() => {});
        const stockRes = await fetchStock(symbol, stockRequest);
        if (cancelled) return;
        setSeries(stockRes.series || []);
        setMeta(stockRes.provenance || null);
        setCurrency(stockRes.currency || 'USD');
        assetCacheRef.current.set(key, {
          data: {
            series: stockRes.series || [],
            meta: stockRes.provenance || null,
            currency: stockRes.currency || 'USD',
          },
          at: Date.now(),
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load stock data');
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, stockRequest]);

  useEffect(() => {
    if (!symbol) {
      setOutlook(null);
      setOutlookError('');
      setOutlookLoading(false);
      return undefined;
    }
    let cancelled = false;
    setOutlook(null);
    setOutlookLoading(true);
    setOutlookError('');
    fetchStockOutlook(symbol, outlookYears)
      .then((data) => {
        if (cancelled) return;
        setOutlook(data);
        setOutlookLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setOutlook(null);
        setOutlookError(err.message || 'Outlook unavailable');
        setOutlookLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol, outlookYears]);

  useEffect(() => {
    const incoming = String(searchParams.get('symbol') || '').trim().toUpperCase();
    if (urlSymbol.current === incoming) return;
    const previous = urlSymbol.current;
    urlSymbol.current = incoming;
    setSymbol(incoming);
    setSymbolInput(incoming);
    if (!incoming) {
      setStockInfo(null);
      setSearchOpen(false);
      if (previous && !scrollAfterClose.current) scrollAfterClose.current = browseRef;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!location.state?.board) return;
    setShowLiquidity(false);
    setFromLiquidity(false);
    setStockFilter('All');
    setStockCapFilter('all');
    urlSymbol.current = '';
    setSymbol('');
    setSymbolInput('');
    setStockInfo(null);
    setSearchOpen(false);
  }, [location.state]);

  useEffect(() => {
    if (!symbol) {
      setCompareSymbol('');
      setCompareSeries([]);
      return;
    }

    const defaultPeer = STOCK_CATALOG.find(
      (entry) => entry.symbol !== symbol && entry.sector === STOCK_CATALOG.find((item) => item.symbol === symbol)?.sector,
    )?.symbol || 'SPY';
    setCompareSymbol((current) => (current && current !== symbol ? current : defaultPeer));
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !compareSymbol || compareSymbol === symbol) {
      setCompareSeries([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const compareRes = await fetchStock(compareSymbol, stockRequest);
        if (!cancelled) setCompareSeries(compareRes.series || []);
      } catch {
        if (!cancelled) setCompareSeries([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, compareSymbol, stockRequest]);

  useEffect(() => {
    if (!symbol) {
      setStockInfo(null);
      setStockInfoLoading(false);
      return undefined;
    }
    let cancelled = false;
    setStockInfo(null);
    setStockInfoLoading(true);
    fetchStockInfo(symbol)
      .then((info) => {
        if (!cancelled) setStockInfo(info);
      })
      .catch(() => {
        if (!cancelled) setStockInfo(null);
      })
      .finally(() => {
        if (!cancelled) setStockInfoLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  useEffect(() => {
    const newsSymbol = symbol || 'SPY';
    let cancelled = false;
    setStockNewsLoaded(false);
    setStockNews([]);
    fetchStockNews(newsSymbol)
      .then((d) => { if (!cancelled) setStockNews(d?.news || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStockNewsLoaded(true); });
    return () => { cancelled = true; };
  }, [symbol]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!tourActive) return;
    if (tourStep?.route !== '/stocks') return;
    if (symbol) return;
    setSymbol('AAPL');
    setSymbolInput('AAPL');
  }, [tourActive, tourStep, symbol]);

  useEffect(() => {
    if (!symbol || !selectedPanelRef.current) return;
    if (tourActive) return;
    selectedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [symbol, tourActive]);

  useEffect(() => {
    if (symbol) return undefined;
    const target = scrollAfterClose.current;
    if (!target) return undefined;
    const timer = window.setTimeout(() => {
      scrollAfterClose.current = null;
      target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [symbol, showLiquidity]);

  const displaySeries = useMemo(() => {
    if (!showNgn || currency !== 'USD' || !Number.isFinite(fxRate)) return series;
    return scalePriceFields(series, fxRate);
  }, [series, showNgn, currency, fxRate]);

  const unit = showNgn && currency === 'USD' && Number.isFinite(fxRate) ? 'NGN' : currency;
  const symbolPrefix = CURRENCY_SYMBOLS[unit] || `${unit} `;
  const latest = displaySeries.at(-1)?.close || 0;
  const change = computeChange(displaySeries);
  const selectedStockMeta = useMemo(
    () => STOCK_CATALOG.find((entry) => entry.symbol === symbol) || null,
    [symbol],
  );
  const examineSector = catalogSector(selectedStockMeta?.sector || stockInfo?.sector);
  const comparisonChartData = useMemo(
    () => buildComparisonSeries(series, compareSeries, symbol, compareSymbol),
    [series, compareSeries, symbol, compareSymbol],
  );
  const currentQuote = symbol ? (allQuotes.get(quoteSymbolKey(symbol)) || allQuotes.get(symbol) || null) : null;
  const marketOpenKnown = useMemo(() => {
    const state = stockInfo?.marketState || [...allQuotes.values()].find((quote) => quote?.marketState)?.marketState;
    if (!state) return null;
    return state === 'REGULAR';
  }, [allQuotes, stockInfo]);
  const liquidityBoard = useMemo(() => scoreLiquidityBoard(
    STOCK_CATALOG.map((entry) => {
      const quote = allQuotes.get(quoteSymbolKey(entry.symbol)) || allQuotes.get(entry.symbol);
      return {
        venue: 'us',
        symbol: entry.symbol,
        name: entry.name,
        sector: entry.sector,
        volume: quote?.volume,
        averageVolume: quote?.averageVolume,
        sharesOutstanding: quote?.sharesOutstanding,
        price: quote?.price,
        marketCap: quote?.marketCap,
      };
    }),
    'us',
    { marketOpen: marketOpenKnown },
  ), [allQuotes, marketOpenKnown]);
  const liquidityBySymbol = useMemo(() => {
    const map = new Map();
    liquidityBoard.forEach((row) => map.set(row.symbol, row));
    return map;
  }, [liquidityBoard]);
  const liquidityReading = useMemo(() => {
    if (!symbol) return null;
    return assessLiquidity({
      venue: 'us',
      volume: stockInfo?.volume ?? currentQuote?.volume,
      averageVolume: stockInfo?.averageVolume ?? currentQuote?.averageVolume,
      sharesOutstanding: stockInfo?.sharesOutstanding ?? currentQuote?.sharesOutstanding,
      floatShares: stockInfo?.floatShares,
      insiderPct: stockInfo?.insiderPct,
      bid: stockInfo?.bid,
      ask: stockInfo?.ask,
      price: stockInfo?.price ?? currentQuote?.price,
      marketCap: stockInfo?.marketCap ?? currentQuote?.marketCap,
    }, {
      venue: 'us',
      peerTurnovers: liquidityBoard.map((row) => row.turnover),
      peerCaps: liquidityBoard.map((row) => row.marketCap),
      marketOpen: marketOpenKnown,
    });
  }, [symbol, stockInfo, currentQuote, liquidityBoard, marketOpenKnown]);
  const sectorPeers = useMemo(
    () => STOCK_CATALOG.filter((entry) => entry.sector === selectedStockMeta?.sector && entry.symbol !== symbol),
    [selectedStockMeta, symbol],
  );

  useEffect(() => {
    setSectorContextOn(false);
  }, [symbol]);

  useEffect(() => {
    if (!examineSector) return undefined;
    let cancelled = false;
    const peers = STOCK_CATALOG
      .filter((entry) => entry.sector === examineSector)
      .map((entry) => entry.symbol);
    fetchStockQuotes(peers).then((d) => {
      if (cancelled) return;
      setAllQuotes((prev) => mergeQuoteMap(prev, d.quotes));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [examineSector]);
  const topHeadlineRows = useMemo(
    () => ((stockInfo?.news?.length ? stockInfo.news : stockNews) || []).slice(0, 3),
    [stockInfo, stockNews],
  );
  const allMajorNewsRows = useMemo(
    () => (stockInfo?.news?.length ? stockInfo.news : stockNews) || [],
    [stockInfo, stockNews],
  );
  const topHeadlineLabel = symbol || 'US market';
  const recentSpread = useMemo(() => recentMoveSpread(series), [series]);
  const sectorAverageChange = useMemo(() => {
    if (!selectedStockMeta) return null;
    const peers = STOCK_CATALOG
      .filter((entry) => entry.sector === selectedStockMeta.sector)
      .map((entry) => {
        const quote = allQuotes.get(quoteSymbolKey(entry.symbol)) || allQuotes.get(entry.symbol);
        return quote?.changePct;
      })
      .filter((value) => Number.isFinite(value));
    return peers.length ? average(peers) : null;
  }, [selectedStockMeta, allQuotes]);
  const selectedChangePct = Number.isFinite(currentQuote?.changePct)
    ? currentQuote.changePct
    : lastBarChangePct(series);
  const insightCards = useMemo(() => {
    if (!symbol) return [];
    const relativeLeader = sectorAverageChange == null || !Number.isFinite(selectedChangePct)
      ? null
      : selectedChangePct - sectorAverageChange;
    const spreadValue = recentSpread.stdPct == null
      ? 'N/A'
      : `${recentSpread.label} · ±${recentSpread.stdPct.toFixed(1)}%`;
    const spreadUnit = recentSpread.intraday ? 'recent bars' : 'recent daily closes';
    let sectorDetail = `${symbol} versus ${selectedStockMeta?.sector} peers on today’s quote change — a snapshot, not advice.`;
    if (relativeLeader == null) {
      if (!selectedStockMeta) {
        sectorDetail = `${symbol} is not in this page’s sector list, so there is no peer average.`;
      } else if (!quotesReady) {
        sectorDetail = 'Sector-relative change is waiting on peer quotes.';
      } else {
        sectorDetail = `Peer quotes for ${selectedStockMeta.sector} did not load, so this comparison is left blank.`;
      }
    }
    return [
      {
        title: 'Range change',
        value: `${change.isPositive ? '+' : ''}${change.pct.toFixed(2)}%`,
        tone: change.isPositive ? 'positive' : 'negative',
        detail: `Close-to-close change for ${symbol} over the selected dates. This is not a forecast.`,
      },
      {
        title: 'Recent spread',
        value: spreadValue,
        tone: recentSpread.label === 'High' ? 'negative' : recentSpread.label === 'Elevated' ? 'warning' : 'neutral',
        detail: recentSpread.stdPct == null
          ? 'Need more price history before recent moves can be measured.'
          : `Typical size of ${spreadUnit} (1σ of those % changes) is ±${recentSpread.stdPct.toFixed(1)}%. Calm / Elevated / High is only versus usual stock-move sizes, not a trade signal.`,
      },
      {
        title: 'Sector relative',
        value: relativeLeader == null ? 'N/A' : `${relativeLeader >= 0 ? '+' : ''}${relativeLeader.toFixed(2)}%`,
        tone: relativeLeader == null ? 'neutral' : relativeLeader >= 0 ? 'positive' : 'negative',
        detail: sectorDetail,
      },
    ];
  }, [symbol, selectedStockMeta, change, selectedChangePct, sectorAverageChange, recentSpread, quotesReady]);

  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const searchSeq = useRef(0);

  const doSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const results = await searchStocks(q);
        if (seq === searchSeq.current) setSearchResults(results);
      } catch {
        if (seq === searchSeq.current) setSearchResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 80);
  }, []);

  const liveMap = useMemo(() => {
    const m = new Map();
    for (const mover of overview.movers) m.set(mover.asset, mover);
    return m;
  }, [overview.movers]);

  const SECTOR_COLORS = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

  const sectorBreakdown = useMemo(() => {
    const map = new Map();
    STOCK_CATALOG.forEach((s) => {
      const q = allQuotes.get(s.symbol);
      if (!map.has(s.sector)) map.set(s.sector, { sector: s.sector, count: 0, totalCap: 0, changes: [] });
      const entry = map.get(s.sector);
      entry.count += 1;
      entry.totalCap += q?.marketCap || 0;
      if (q?.changePct != null) entry.changes.push(q.changePct);
    });
    return [...map.values()]
      .sort((a, b) => b.totalCap - a.totalCap)
      .map((s) => ({ ...s, avgChange: s.changes.length ? +(s.changes.reduce((a, v) => a + v, 0) / s.changes.length).toFixed(2) : 0 }));
  }, [allQuotes]);

  const sectorChartData = useMemo(() =>
    sectorBreakdown.filter((s) => s.changes.length > 0).map((s) => ({ sector: s.sector, avgChange: s.avgChange, stocks: s.count })),
  [sectorBreakdown]);

  const breadthData = useMemo(() => {
    let adv = 0, dec = 0, unch = 0;
    allQuotes.forEach((q) => {
      if ((q.changePct || 0) > 0) adv++; else if ((q.changePct || 0) < 0) dec++; else unch++;
    });
    return [
      { label: 'Advancing', value: adv, fill: '#22c55e' },
      { label: 'Declining', value: dec, fill: '#ef4444' },
      { label: 'Unchanged', value: unch, fill: '#94a3b8' },
    ];
  }, [allQuotes]);

  const breadthRows = useMemo(() => {
    const rows = STOCK_CATALOG.map((s) => {
      const q = allQuotes.get(s.symbol);
      const chg = q?.changePct ?? 0;
      return {
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        price: q?.price ?? null,
        changePct: chg,
      };
    });
    if (breadthView === 'advancing') return rows.filter((r) => r.changePct > 0);
    if (breadthView === 'declining') return rows.filter((r) => r.changePct < 0);
    if (breadthView === 'unchanged') return rows.filter((r) => r.changePct === 0);
    return rows;
  }, [allQuotes, breadthView]);

  const topByMarketCap = useMemo(() =>
    STOCK_CATALOG
      .map((s) => { const q = allQuotes.get(s.symbol); return { ...s, marketCap: q?.marketCap || 0, price: q?.price || 0, chg: q?.changePct || 0 }; })
      .filter((s) => s.marketCap > 0)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 15),
  [allQuotes]);

  const performanceData = useMemo(() =>
    topByMarketCap.map((s) => ({ symbol: s.symbol, change: +s.chg.toFixed(2) })),
  [topByMarketCap]);

  const selectedPeers = useMemo(() => {
    if (!symbol || !examineSector) return [];
    return STOCK_CATALOG
      .filter((s) => s.sector === examineSector)
      .map((s) => {
        const q = allQuotes.get(quoteSymbolKey(s.symbol)) || allQuotes.get(s.symbol);
        return {
          symbol: s.symbol,
          name: s.name,
          price: q?.price || 0,
          change: +(q?.changePct || 0).toFixed(2),
          isCurrent: s.symbol === symbol,
        };
      })
      .sort((a, b) => b.price - a.price)
      .slice(0, 10);
  }, [symbol, examineSector, allQuotes]);

  const comparisonOptions = useMemo(() => {
    if (!selectedStockMeta) return ['SPY', 'QQQ'];
    return [...new Set(['SPY', 'QQQ', ...watchlist, ...sectorPeers.map((entry) => entry.symbol)])].filter((entry) => entry !== symbol).slice(0, 10);
  }, [selectedStockMeta, sectorPeers, symbol, watchlist]);

  const suggestions = searchResults.map((r) => {
    const live = liveMap.get(r.symbol);
    return {
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange || '',
      type: r.type || '',
      price: live?.series?.at(-1)?.close ?? null,
      changePct: live?.changePct ?? null,
    };
  });

  const mergedSuggestions = useMemo(() => {
    const query = symbolInput.trim();
    const seen = new Set();
    const remote = suggestions.map((item) => {
      seen.add(String(item.symbol || '').toUpperCase());
      return { ...item, source: 'remote' };
    });
    if (!query) return remote;

    const localMatches = STOCK_CATALOG
      .filter((stock) => matchesSearch(query, stock.symbol, stock.name, stock.sector))
      .sort((a, b) => searchRank(query, a) - searchRank(query, b) || a.symbol.localeCompare(b.symbol))
      .filter((stock) => !seen.has(stock.symbol))
      .slice(0, 12)
      .map((stock) => {
        const live = liveMap.get(stock.symbol)
          || allQuotes.get(quoteSymbolKey(stock.symbol))
          || allQuotes.get(stock.symbol);
        return {
          symbol: stock.symbol,
          name: stock.name,
          exchange: '',
          type: stock.sector || 'EQUITY',
          price: live?.series?.at(-1)?.close ?? live?.price ?? null,
          changePct: live?.changePct ?? null,
          source: 'local',
        };
      });

    return [...localMatches, ...remote].sort((a, b) => (
      searchRank(query, a) - searchRank(query, b)
    )).slice(0, 15);
  }, [suggestions, symbolInput, liveMap, allQuotes]);

  const showDropdown = searchOpen && symbolInput.trim().length > 0;

  function clearSymbolParam() {
    const params = new URLSearchParams(searchParams);
    if (!params.get('symbol')) return;
    params.delete('symbol');
    setSearchParams(params, { replace: true });
  }

  function pickSymbol(s, source = '') {
    const next = String(s || '').trim().toUpperCase();
    if (!next) return;
    setFromLiquidity(source === 'liquidity');
    urlSymbol.current = next;
    setSymbol(next);
    setSymbolInput(next);
    setSearchOpen(false);
    setSearchResults([]);
    const params = new URLSearchParams(searchParams);
    if (params.get('symbol') === next) return;
    params.set('symbol', next);
    setSearchParams(params);
  }

  function focusSection(ref) {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function chooseTimeframe(id) {
    setTimeframe(id);
    focusSection(symbol ? selectedPanelRef : conditionRef);
  }

  function leaveOpenName(ref) {
    scrollAfterClose.current = ref;
    if (!symbol) {
      focusSection(ref);
      return;
    }
    urlSymbol.current = '';
    setFromLiquidity(false);
    setSymbol('');
    setSymbolInput('');
    setStockInfo(null);
    setSearchOpen(false);
    clearSymbolParam();
  }

  function chooseBreadth(view) {
    setBreadthView(view);
    leaveOpenName(breadthRef);
  }

  function chooseViz(tab) {
    setVizTab(tab);
    leaveOpenName(vizRef);
  }

  function openLiquidity() {
    setStockFilter('All');
    setStockCapFilter('all');
    setShowLiquidity(true);
    setLiquidityListKey((key) => key + 1);
    setFromLiquidity(false);
    setSearchOpen(false);
    scrollAfterClose.current = liquidityRef;
    if (symbol) {
      urlSymbol.current = '';
      setSymbol('');
      setSymbolInput('');
      setStockInfo(null);
      clearSymbolParam();
      return;
    }
    window.setTimeout(() => {
      liquidityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function closeSymbol() {
    scrollAfterClose.current = fromLiquidity ? liquidityRef : browseRef;
    if (fromLiquidity) setShowLiquidity(true);
    setFromLiquidity(false);
    urlSymbol.current = '';
    setSymbol('');
    setSymbolInput('');
    setStockInfo(null);
    setSearchOpen(false);
    clearSymbolParam();
  }

  function handleSearchKey(e) {
    if (e.key === 'Enter' && symbolInput.trim()) {
      pickSymbol(symbolInput.trim().toUpperCase());
    }
    if (e.key === 'Escape') setSearchOpen(false);
  }

  return (
    <main className="layout">
      <section className="panel controlsV2">
        <div className="controlsTopRow">
          <div>
            <h2 className="workspaceTitle">
              Stocks{' '}
              <HelpHint
                label="What is the Stocks page?"
                text="Look up a listing, read history, overlays, a comparison, and unusual-day marks from a named source. Place orders at a licensed broker — see Learn."
              />
            </h2>
            <p className="subtle">Search a ticker, plot history, overlay tested indicators, and compare two stocks.</p>
          </div>
          <div className="controlsActions">
            <label className="togglePill">
              <input
                type="checkbox"
                checked={showNgn}
                disabled={currency !== 'USD' || !Number.isFinite(fxRate)}
                onChange={(e) => setShowNgn(e.target.checked)}
              />
              <span className="toggleTrack"><span className="toggleThumb" /></span>
              <span className="toggleLabel">{showNgn ? '₦ NGN' : `${CURRENCY_SYMBOLS[currency] || ''} ${currency}`}</span>
            </label>
            <HelpHint
              label="What does the naira toggle do?"
              text="Shows the same US-dollar prices converted with a live USD to NGN rate. The original data is still in dollars."
            />
            <button
              type="button"
              className={showLiquidity && !symbol ? 'liquidityBtn isActive' : 'liquidityBtn'}
              onClick={openLiquidity}
            >
              Liquidity
            </button>
          </div>
        </div>

        <div className="searchTimeRow">
          <div className="searchWrap" ref={searchRef} data-guide="stock-search">
            <input
              className="searchInput"
              value={symbolInput}
              onChange={(e) => { setSymbolInput(e.target.value); setSearchOpen(true); doSearch(e.target.value); }}
              onFocus={() => { setSearchOpen(true); if (symbolInput) doSearch(symbolInput); }}
              onKeyDown={handleSearchKey}
              placeholder="Search any stock globally — symbol, name, exchange..."
              aria-label="Search stocks"
            />
            {symbolInput && (
              <button type="button" className="searchClear" onClick={closeSymbol}>✕</button>
            )}
            {showDropdown && (
              <ul className="suggestionList">
                {searching && mergedSuggestions.length === 0 && (
                  <li className="sugStatus">Searching markets...</li>
                )}
                {!searching && mergedSuggestions.length === 0 && (
                  <li className="sugStatus">No results for &quot;{symbolInput.trim()}&quot;</li>
                )}
                {mergedSuggestions.map((s) => {
                  const hasLive = s.price != null;
                  const up = (s.changePct ?? 0) >= 0;
                  return (
                    <li key={s.symbol}>
                      <button type="button" className="suggestionItem" onClick={() => pickSymbol(s.symbol)}>
                        <div className="sugLeft">
                          <span className="sugSymbol">{s.symbol}</span>
                          <span className="sugName">{s.name}{s.exchange ? ` · ${s.exchange}` : ''}</span>
                        </div>
                        <span className="sugPrice monoNum">{hasLive ? formatMoney(s.price, 'USD') : ''}</span>
                        {hasLive && s.changePct != null ? (
                          <span className={`sugChange ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{s.changePct.toFixed(2)}%</span>
                        ) : (
                          <span className="sugBadge">{s.type || 'EQUITY'}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {symbolInput.trim() && !searching && (
                  <li className="sugDivider">
                    <button type="button" className="suggestionItem sugCustom" onClick={() => pickSymbol(symbolInput.trim().toUpperCase())}>
                      <span className="sugSymbol">⏎ Open &quot;{symbolInput.trim().toUpperCase()}&quot;</span>
                      <span className="sugName">Load any ticker directly</span>
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
          <HelpHint
            label="How does search work?"
            text="Type a company name or ticker such as AAPL or Microsoft, then click a result. That loads price history from Yahoo Finance."
          />

          <div className="timeframeBar">
            {TIMEFRAMES.map((item) => (
              <button key={item.id} type="button" className={item.id === timeframe ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseTimeframe(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <HelpHint
            label="What do the time ranges do?"
            text="How far back the chart goes. Short ranges can show hours. Longer ranges use one close per trading day. Custom lets you pick dates."
          />
        </div>

        {timeframe === 'custom' && (
          <div className="customRangeRow">
            <label>From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label>
            <label>To<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label>
          </div>
        )}

        {isSignedIn && watchlist.length > 0 && (
          <div className="watchlistRow">
            <span className="watchlistLabel">
              Watchlist{' '}
              <HelpHint
                label="What is the watchlist?"
                text="Tickers you save are stored on your account, so the same list is there on another device."
              />
            </span>
            {watchlist.map((ticker) => (
              <button
                key={ticker}
                type="button"
                className={ticker === symbol ? 'watchChip active' : 'watchChip'}
                onClick={() => pickSymbol(ticker)}
              >
                {ticker}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel topNewsPanel">
        <div className="sectionHead">
          <div>
            <h3>Top Headlines</h3>
            <p className="subtle">News tied to {topHeadlineLabel}, surfaced early so new investors can connect price moves with current events.</p>
          </div>
          <span className="tag muted">{symbol ? 'Selected stock' : 'Market context'}</span>
        </div>
        {topHeadlineRows.length > 0 ? (
          <div className="newsGrid newsGrid--top">
            {topHeadlineRows.map((n, idx) => (
              <a key={idx} href={n.link} target="_blank" rel="noopener noreferrer" className="newsCard newsCard--top">
                {n.thumbnail && <img src={n.thumbnail} alt="" className="newsThumb" />}
                <div className="newsBody">
                  <strong>{n.title}</strong>
                  <span>{n.publisher}{newsDateSuffix(n.date)}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="subtle">No headlines available right now.</p>
        )}
      </section>

      <section className="panel conditionPanel" ref={conditionRef}>
        <ConditionBoard
          hint="A sample of four US names: AAPL, MSFT, GOOGL, and NVDA. Bullish means most of those closed higher. It is not the whole market."
          rangeLabel={overview.snapshotFallback ? 'Today’s quotes' : tf.label}
          sampleLine={
            overview.snapshotFallback
              ? 'AAPL, MSFT, GOOGL, and NVDA — today’s quote changes. Not the whole market.'
              : `AAPL, MSFT, GOOGL, and NVDA over ${tf.label}. Each path starts at 100 so you compare the move, not the share price.`
          }
          summary={overview.summary}
          names={(overview.movers?.length
            ? overview.movers
            : OVERVIEW_UNIVERSE.map((asset) => ({ asset, changePct: null }))
          ).map((item) => ({
            id: item.asset,
            label: item.asset,
            changePct: item.changePct,
          }))}
          onPick={pickSymbol}
          fallbackNote={
            overview.snapshotFallback
              ? (timeframe === '24h'
                ? 'Intraday bars for this board did not load (often when the US market is closed), so these figures use today’s quotes.'
                : 'History for this range did not load, so these figures use today’s quotes.')
              : ''
          }
          error={overviewError}
          onRetry={() => {
            overviewCacheRef.current.delete(`overview:${JSON.stringify(overviewRequest)}`);
            setOverviewRetryKey((k) => k + 1);
          }}
        >
          {overview.conditionSeries.length > 0 && (
            <div className="chartWrap conditionBoardChart" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={overview.conditionSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={24} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="marketIndex" stroke="#2563eb" dot={false} strokeWidth={2} name="Sample index (start = 100)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ConditionBoard>
      </section>

      {sectorChartData.length > 0 && (
        <section className="panel" ref={breadthRef}>
          <div className="sectionHead">
            <h3>Sector Performance & Breadth</h3>
            <span className="tag muted">Daily quote changes</span>
          </div>
          <div className="splitBoard">
            <div className="chartWrap splitBoardChart" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={sectorChartData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="sector" width={88} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(v) => [`${v >= 0 ? '+' : ''}${v}%`, 'Avg change']} />
                  <Bar dataKey="avgChange" name="Avg change" radius={[0, 4, 4, 0]}>
                    {sectorChartData.map((e, idx) => <Cell key={idx} fill={e.avgChange >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="breadthSide">
              <h4 className="breadthPanelTitle">Market breadth</h4>
              <div className="chartWrap chartWrap--pie" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie data={breadthData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={3} label={false}>
                      {breadthData.map((e, idx) => <Cell key={idx} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} stocks`, name]} />
                    <Legend verticalAlign="bottom" height={28} iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="breadthQuickGrid">
                <button type="button" className={breadthView === 'advancing' ? 'breadthQuickCard breadthQuickCard--up active' : 'breadthQuickCard breadthQuickCard--up'} onClick={() => chooseBreadth('advancing')}><div className="breadthQuickLabel">Advancing</div><div className="monoNum breadthQuickValue">{breadthData[0].value}</div></button>
                <button type="button" className={breadthView === 'declining' ? 'breadthQuickCard breadthQuickCard--down active' : 'breadthQuickCard breadthQuickCard--down'} onClick={() => chooseBreadth('declining')}><div className="breadthQuickLabel">Declining</div><div className="monoNum breadthQuickValue">{breadthData[1].value}</div></button>
                <button type="button" className={breadthView === 'unchanged' ? 'breadthQuickCard breadthQuickCard--flat active' : 'breadthQuickCard breadthQuickCard--flat'} onClick={() => chooseBreadth('unchanged')}><div className="breadthQuickLabel">Unchanged</div><div className="monoNum breadthQuickValue">{breadthData[2].value}</div></button>
              </div>
              <button type="button" className="breadthShowAll" onClick={() => chooseBreadth('all')}>Show all</button>
            </div>
          </div>
          <div className="ngxTable" style={{ marginTop: '0.8rem', maxHeight: 260, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Symbol</th><th>Name</th><th>Sector</th><th>Price</th><th>Change</th></tr></thead>
              <tbody>
                {breadthRows.map((r) => {
                  const up = r.changePct >= 0;
                  return (
                    <tr
                      key={r.symbol}
                      className="ngxRow"
                      tabIndex={0}
                      onClick={() => pickSymbol(r.symbol)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') pickSymbol(r.symbol);
                      }}
                    >
                      <td className="monoNum" style={{ fontWeight: 700 }}>{r.symbol}</td>
                      <td>{r.name}</td>
                      <td><span className="sugBadge">{r.sector}</span></td>
                      <td className="monoNum">{r.price != null ? formatMoney(r.price, 'USD') : '—'}</td>
                      <td><span className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{r.changePct.toFixed(2)}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="sectionHead">
          <h3>Top Movers</h3>
        </div>
        {overview.movers.length === 0 ? (
          <p className="subtle" style={{ padding: '0.5rem 0' }}>No mover data yet. {overviewError ? 'Use Retry above if the overview request failed.' : ''}</p>
        ) : (
          <div className="moverGrid">
            {overview.movers.map((m) => {
              const last = m.series?.at(-1)?.close;
              const up = m.changePct >= 0;
              return (
                <button key={m.asset} className={`moverCard ${up ? 'cardUp' : 'cardDown'}`} type="button" onClick={() => pickSymbol(m.asset)}>
                  <span>{m.asset}</span>
                  {last != null && <span className="moverPrice">{formatMoney(last, 'USD')}</span>}
                  <strong className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{m.changePct.toFixed(2)}%</strong>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {allQuotes.size > 0 && (
        <section className="panel" ref={vizRef}>
          <div className="sectionHead">
            <h3>Visualizer</h3>
            <div className="timeframeBar">
              <button type="button" className={vizTab === 'performance' ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseViz('performance')}>Performance</button>
              <button type="button" className={vizTab === 'marketcap' ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseViz('marketcap')}>Market Cap</button>
              <button type="button" className={vizTab === 'sectors' ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseViz('sectors')}>Sectors</button>
            </div>
          </div>
          {vizTab === 'performance' && (
            performanceData.length > 0 ? (
              <div className="chartWrap" style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={performanceData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="symbol" width={56} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <Tooltip formatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                    <Bar dataKey="change" name="Change %">{performanceData.map((e, idx) => <Cell key={idx} fill={e.change >= 0 ? '#22c55e' : '#ef4444'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="subtle" style={{ padding: '1rem' }}>No performance chart yet — quotes loaded but market cap / change data is missing.</p>
            )
          )}
          {vizTab === 'marketcap' && (
            topByMarketCap.length > 0 ? (
              <div className="chartWrap" style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={topByMarketCap.map((s) => ({ symbol: s.symbol, cap: s.marketCap }))} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatUsdCap(v)} />
                    <YAxis type="category" dataKey="symbol" width={55} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <Tooltip formatter={(v) => formatUsdCap(Number(v))} />
                    <Bar dataKey="cap" name="Market Cap" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="subtle" style={{ padding: '1rem' }}>No market-cap chart yet — waiting for quote data with market cap.</p>
            )
          )}
          {vizTab === 'sectors' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
              <div className="chartWrap chartWrap--pie" style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
                    <Pie data={sectorBreakdown} dataKey="totalCap" nameKey="sector" cx="50%" cy="50%" outerRadius={86}
                      label={({ sector, percent }) => `${sector.slice(0, 10)} ${(percent * 100).toFixed(0)}%`} labelLine fontSize={10}>
                      {sectorBreakdown.map((_, idx) => <Cell key={idx} fill={SECTOR_COLORS[idx % SECTOR_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatUsdCap(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ngxTable" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table>
                  <thead><tr><th>Sector</th><th>Stocks</th><th>Cap</th><th>Avg Chg</th></tr></thead>
                  <tbody>
                    {sectorBreakdown.map((s, idx) => (
                      <tr key={s.sector}>
                        <td><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: SECTOR_COLORS[idx % SECTOR_COLORS.length], marginRight: 6 }} />{s.sector}</td>
                        <td className="monoNum">{s.count}</td>
                        <td className="monoNum">{formatUsdCap(s.totalCap)}</td>
                        <td>{s.avgChange !== 0 ? <span className={s.avgChange >= 0 ? 'marketUp' : 'marketDown'}>{s.avgChange >= 0 ? '+' : ''}{s.avgChange}%</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {symbol && (
        <section className="panel" ref={selectedPanelRef}>
          <div className="sectionHead" data-guide="ticker-examine">
            <h3>{symbol}</h3>
            <div className="vizPriceRow">
              <span className={`priceTag ${change.isPositive ? 'up' : 'down'}`}>{formatMoney(latest, unit)}</span>
              <span className={`pctBadge ${change.isPositive ? 'up' : 'down'}`}>
                {change.isPositive ? '▲' : '▼'} {change.isPositive ? '+' : ''}{change.pct.toFixed(2)}%
              </span>
              <button type="button" className={fromLiquidity ? 'liquidityBack' : 'expandBtn'} onClick={closeSymbol}>
                {fromLiquidity ? '← Back to liquidity' : '← Back'}
              </button>
            </div>
          </div>
          <div className="stockHeroSummary">
            <div className="stockHeroSummaryMain">
              <div className="stockHeroBadgeRow">
                {(stockInfo?.name || selectedStockMeta?.name) && (
                  <span className="tag muted">{stockInfo?.name || selectedStockMeta?.name}</span>
                )}
                {(stockInfo?.sector || selectedStockMeta?.sector) && (
                  <span className="tag muted">{stockInfo?.sector || selectedStockMeta?.sector}</span>
                )}
                {stockInfo?.industry && <span className="tag muted">{stockInfo.industry}</span>}
                {stockInfo?.exchange && <span className="tag muted">{stockInfo.exchange}</span>}
                {(stockInfo?.marketCap ?? currentQuote?.marketCap) != null && (
                  <span className="tag muted">{formatUsdCap(stockInfo?.marketCap ?? currentQuote?.marketCap)}</span>
                )}
                {liquidityReading?.tone && liquidityReading.tone !== 'unknown' && (
                  <span className={`tag liquidityTag liquidityTag--${liquidityReading.tone}`}>{liquidityReading.label}</span>
                )}
              </div>
              <p className="stockHeroSummaryText">
                {symbol} changed {change.isPositive ? '+' : ''}{change.pct.toFixed(2)}% over the selected range.
                {recentSpread.stdPct == null
                  ? ' Recent move size needs more history.'
                  : ` Typical recent ${recentSpread.intraday ? 'bar' : 'daily'} moves are about ±${recentSpread.stdPct.toFixed(1)}% (${recentSpread.label.toLowerCase()}).`}
              </p>
            </div>
            <div className="stockHeroActionRow">
              <button
                type="button"
                className="actionPrimary"
                onClick={() => {
                  if (!isSignedIn) {
                    if (accountsEnabled) openAuth('signup');
                    return;
                  }
                  toggleWatchlist(symbol);
                }}
              >
                {watchlist.includes(symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
              </button>
              <button
                type="button"
                className="actionGhost"
                onClick={() => {
                  setSectorContextOn(true);
                  window.requestAnimationFrame(() => {
                    sectorContextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  });
                }}
              >
                See sector context
              </button>
              <button
                type="button"
                className="actionGhost"
                onClick={() => {
                  window.requestAnimationFrame(() => {
                    outlookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
              >
                Forecast this stock
              </button>
              <button
                type="button"
                className="liquidityBtn"
                onClick={openLiquidity}
              >
                Liquidity
              </button>
            </div>
          </div>

          <div className="tickerOutlook">
            <LiquidityFlag reading={liquidityReading} name={symbol} />
          </div>

          <div className="stockProfile">
            <div className="sectionHead">
              <div>
                <h4>Company snapshot</h4>
                <p className="subtle">Yahoo Finance figures for this ticker. Missing values stay blank on purpose. This is not a buy or sell recommendation.</p>
              </div>
            </div>
            {stockInfoLoading && <p className="subtle">Loading company details…</p>}
            {!stockInfoLoading && stockInfo?.error && !stockInfo?.marketCap && (
              <p className="subtle">Company details did not load from Yahoo. Price on the chart is still from the named history source.</p>
            )}
            {stockInfo?.summary && (
              <p className="stockProfileBlurb">
                {stockInfo.summary.length > 520 ? `${stockInfo.summary.slice(0, 520).trim()}…` : stockInfo.summary}
              </p>
            )}
            {(stockInfo?.website || stockInfo?.city || Number.isFinite(stockInfo?.employees)) && (
              <p className="stockProfileMeta">
                {stockInfo.city && stockInfo.country ? `${stockInfo.city}, ${stockInfo.country}` : (stockInfo.country || stockInfo.city || '')}
                {Number.isFinite(stockInfo.employees) ? ` · ${formatCompactCount(stockInfo.employees)} employees` : ''}
                {stockInfo.website ? (
                  <>
                    {' · '}
                    <a href={stockInfo.website} target="_blank" rel="noopener noreferrer">{stockInfo.website.replace(/^https?:\/\//, '')}</a>
                  </>
                ) : null}
              </p>
            )}
            <div className="stockFactGrid">
              {[
                { label: 'Price', value: formatMoney(Number.isFinite(stockInfo?.price) ? stockInfo.price : latest, unit) },
                { label: 'Previous close', value: Number.isFinite(stockInfo?.prevClose) ? formatMoney(stockInfo.prevClose, stockInfo.currency || 'USD') : '—' },
                { label: 'Day range', value: Number.isFinite(stockInfo?.dayLow) && Number.isFinite(stockInfo?.dayHigh)
                  ? `${formatMoney(stockInfo.dayLow, stockInfo.currency || 'USD')} – ${formatMoney(stockInfo.dayHigh, stockInfo.currency || 'USD')}`
                  : '—' },
                { label: 'Market cap', value: formatUsdCap(stockInfo?.marketCap ?? currentQuote?.marketCap) },
                { label: 'Shares outstanding', value: formatShares(stockInfo?.sharesOutstanding) },
                { label: 'Float', value: formatShares(stockInfo?.floatShares) },
                { label: 'Enterprise value', value: formatUsdCap(stockInfo?.enterpriseValue) },
                { label: 'Volume', value: formatCompactCount(stockInfo?.volume ?? currentQuote?.volume) },
                { label: 'Avg volume', value: formatCompactCount(stockInfo?.averageVolume) },
                { label: 'EPS (TTM)', value: Number.isFinite(stockInfo?.eps) ? formatMoney(stockInfo.eps, stockInfo.currency || 'USD') : '—' },
                { label: 'P/E (TTM)', value: formatRatio(stockInfo?.pe, 1) },
                { label: 'Forward P/E', value: formatRatio(stockInfo?.forwardPe, 1) },
                { label: 'Book value / share', value: Number.isFinite(stockInfo?.bookValue) ? formatMoney(stockInfo.bookValue, stockInfo.currency || 'USD') : '—' },
                { label: 'Price / book', value: formatRatio(stockInfo?.priceToBook, 2) },
                { label: 'Revenue', value: formatUsdCap(stockInfo?.revenue) },
                { label: 'Revenue growth', value: formatPercentStat(stockInfo?.revenueGrowth) },
                { label: 'Gross margin', value: formatPercentStat(stockInfo?.grossMargin) },
                { label: 'Operating margin', value: formatPercentStat(stockInfo?.operatingMargin) },
                { label: 'Profit margin', value: formatPercentStat(stockInfo?.profitMargin) },
                { label: 'EBITDA', value: formatUsdCap(stockInfo?.ebitda) },
                { label: 'Return on equity', value: formatPercentStat(stockInfo?.roe) },
                { label: 'Debt / equity', value: formatRatio(stockInfo?.debtToEquity, 1) },
                { label: 'Dividend yield', value: formatPercentStat(stockInfo?.dividendYield) },
                { label: 'Payout ratio', value: formatPercentStat(stockInfo?.payoutRatio) },
                { label: '52-week range', value: Number.isFinite(stockInfo?.fiftyTwoWeekLow) && Number.isFinite(stockInfo?.fiftyTwoWeekHigh)
                  ? `${formatMoney(stockInfo.fiftyTwoWeekLow, stockInfo.currency || 'USD')} – ${formatMoney(stockInfo.fiftyTwoWeekHigh, stockInfo.currency || 'USD')}`
                  : '—' },
                { label: 'Beta', value: formatRatio(stockInfo?.beta, 2) },
              ].map((fact) => (
                <article key={fact.label} className="metricCard">
                  <span>{fact.label}</span>
                  <strong className="monoNum">{fact.value}</strong>
                </article>
              ))}
            </div>
          </div>
          <div className="sectionHead" style={{ marginTop: '1rem' }}>
            <div>
              <h4>Analysis Horizon</h4>
              <p className="subtle">Switch the stock timeframe from inside the active analysis card.</p>
            </div>
          </div>
          <div className="timeframeBar">
            {TIMEFRAMES.map((item) => (
              <button key={`detail-${item.id}`} type="button" className={item.id === timeframe ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseTimeframe(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {timeframe === 'custom' && (
            <div className="customRangeRow">
              <label>From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label>
              <label>To<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label>
            </div>
          )}
          <div className="stockInsightGrid">
            {insightCards.map((card) => (
              <article key={card.title} className={`stockInsightCard ${card.tone}`}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>
          <MarketChart title={`Stock: ${symbol}`} data={displaySeries} provenance={meta} isPositive={change.isPositive} currencySymbol={symbolPrefix} changePct={change.pct} />
          <div className="tickerOutlook" ref={outlookRef}>
            <OutlookPanel
              title={`${symbol} over the next ${outlookYears} year${outlookYears === 1 ? '' : 's'}`}
              hint="Weaker, typical, and stronger are three pictures from this ticker’s own daily prices. The year buttons are how long you might hold it. Forecast in the top menu is the same picture for any name."
              years={outlookYears}
              onYears={setOutlookYears}
              data={outlook ? { ...outlook, fxScale: showNgn && currency === 'USD' && Number.isFinite(fxRate) ? fxRate : 1 } : null}
              error={outlookError}
              loading={outlookLoading}
              formatPrice={(n) => formatMoney(n, unit)}
            />
            <p className="subtle outlookPageLink">
              <Link to={`/forecast?market=stocks&symbol=${encodeURIComponent(symbol)}&years=${outlookYears}`}>Open this range on Forecast</Link>
              {' '}to pick another name without leaving the forecast tool.
            </p>
          </div>
          {error && <p className="warn">{error}</p>}

          <div className="sectionHead" style={{ marginTop: '1rem' }} ref={compareRef}>
            <div>
              <h4>
                Relative performance{' '}
                <HelpHint
                  label="What does relative performance mean?"
                  text="Both stocks start at 0% at the beginning of the range. You are comparing return, not which share price is higher in dollars."
                />
              </h4>
              <p className="subtle">Both lines start at 0% so you compare return, not share price.</p>
            </div>
            <div className="stockCompareToolbar">
              <label className="stockCompareField">
                Compare against
                <select value={compareSymbol} onChange={(e) => setCompareSymbol(e.target.value)}>
                  {comparisonOptions.map((entry) => (
                    <option key={entry} value={entry}>{entry}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="actionGhost" onClick={() => { setCompareSymbol('SPY'); focusSection(compareRef); }}>Use SPY</button>
            </div>
          </div>
          <div className="chartWrap" style={{ height: 300 }}>
            {comparisonChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" minTickGap={24} />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey={symbol} stroke="#2563eb" dot={false} strokeWidth={2.4} />
                  <Line type="monotone" dataKey={compareSymbol} stroke="#f59e0b" dot={false} strokeWidth={2.2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="subtle" style={{ padding: '1rem 0.2rem' }}>
                Comparison data is not available for the selected pair and timeframe yet.
              </p>
            )}
          </div>

          <div
            ref={sectorContextRef}
            className={sectorContextOn ? 'sectorContext isRevealed' : 'sectorContext'}
          >
            <div className="sectionHead" style={{ marginTop: '1rem' }}>
              <div>
                <h4>Sector context{examineSector ? `: ${examineSector}` : ''}</h4>
                <p className="subtle">
                  {examineSector
                    ? `${symbol} against other ${examineSector} names in this catalog. Today’s quotes — a snapshot, not a ranking.`
                    : 'This listing has no catalog sector yet, so there is no peer set to show.'}
                </p>
              </div>
            </div>
            {selectedPeers.length > 1 ? (
              <div className="sectorContextGrid">
                <div className="chartWrap" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedPeers} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                      <YAxis type="category" dataKey="symbol" width={55} tick={{ fontSize: 12, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => formatMoney(v, 'USD')} />
                      <Bar dataKey="price" name="Price" radius={[0, 4, 4, 0]}>
                        {selectedPeers.map((e, idx) => <Cell key={idx} fill={e.isCurrent ? '#2563eb' : '#94a3b8'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chartWrap" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedPeers} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="symbol" width={55} tick={{ fontSize: 12, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                      <Bar dataKey="change" name="Change %" radius={[0, 4, 4, 0]}>
                        {selectedPeers.map((e, idx) => <Cell key={idx} fill={e.isCurrent ? '#2563eb' : (e.change >= 0 ? '#22c55e' : '#ef4444')} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : examineSector ? (
              <p className="subtle">Peer quotes for {examineSector} have not loaded yet, or this sector has only one name in the catalog.</p>
            ) : null}
          </div>

        </section>
      )}

      <section className="panel">
        <div className="sectionHead">
          <div>
            <h3>All Major News</h3>
            <p className="subtle">Broader headline feed for deeper follow-up after the top stories above.</p>
          </div>
          <span className="tag muted">{symbol ? 'Selected stock feed' : 'Market feed'}</span>
        </div>
        {allMajorNewsRows.length > 0 ? (
          <div className="newsGrid">
            {allMajorNewsRows.map((n, idx) => (
              <a key={idx} href={n.link} target="_blank" rel="noopener noreferrer" className="newsCard">
                {n.thumbnail && <img src={n.thumbnail} alt="" className="newsThumb" />}
                <div className="newsBody"><strong>{n.title}</strong><span>{n.publisher}{newsDateSuffix(n.date)}</span></div>
              </a>
            ))}
          </div>
        ) : (
          stockNewsLoaded ? <p className="subtle">News not available right now.</p> : <p className="subtle">Loading broader market headlines...</p>
        )}
      </section>


      {!symbol && showLiquidity && (
        <section className="panel" ref={liquidityRef}>
          <div className="sectionHead">
            <div>
              <h3>Liquidity</h3>
              <p className="subtle">Red means a normal $2,000 sale would be a big part of the day’s trading, nothing traded, or insiders hold about 80% of the shares. Open a row to see it in plain words.</p>
            </div>
            <button type="button" className="expandBtn" onClick={() => setShowLiquidity(false)}>Close</button>
          </div>
          <LiquidityBoard listKey={liquidityListKey} rows={liquidityBoard} onPick={(row) => pickSymbol(row.symbol, 'liquidity')} />
        </section>
      )}

      {!symbol && (
        <section className="panel" ref={browseRef}>
          <div className="sectionHead">
            <h3>Browse by Sector</h3>
            <span className="tag muted">{STOCK_CATALOG.filter((s) => stockFilter === 'All' || s.sector === stockFilter).length} stocks in view</span>
          </div>
          <div className="ngxFilters">
            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Sector</label>
              <div className="timeframeBar" style={{ flexWrap: 'wrap' }}>
                {STOCK_CATEGORIES.map((cat) => (
                  <button key={cat} type="button" className={stockFilter === cat ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockFilter(cat); focusSection(browseRef); }}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Market Cap</label>
              <div className="timeframeBar">
                <button type="button" className={stockCapFilter === 'all' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockCapFilter('all'); focusSection(browseRef); }}>All</button>
                <button type="button" className={stockCapFilter === 'mega' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockCapFilter('mega'); focusSection(browseRef); }}>Mega ($1T+)</button>
                <button type="button" className={stockCapFilter === 'large' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockCapFilter('large'); focusSection(browseRef); }}>Large ($100B–1T)</button>
                <button type="button" className={stockCapFilter === 'mid' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockCapFilter('mid'); focusSection(browseRef); }}>Mid (&lt;$100B)</button>
              </div>
            </div>
            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Sort by</label>
              <div className="timeframeBar">
                <button type="button" className={stockSort === 'market_cap' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockSort('market_cap'); focusSection(browseRef); }}>Market Cap</button>
                <button type="button" className={stockSort === 'price' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockSort('price'); focusSection(browseRef); }}>Price</button>
                <button type="button" className={stockSort === 'change' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockSort('change'); focusSection(browseRef); }}>Change</button>
                <button type="button" className={stockSort === 'volume' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockSort('volume'); focusSection(browseRef); }}>Volume</button>
                <button type="button" className={stockSort === 'name' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setStockSort('name'); focusSection(browseRef); }}>A–Z</button>
              </div>
            </div>
          </div>
          <div className="ngxTable">
            <table>
              <thead>
                <tr><th>Symbol</th><th>Name</th><th>Selling</th><th>Price</th><th>Change</th><th>Volume</th><th>Market Cap</th><th>Sector</th></tr>
              </thead>
              <tbody>
                {STOCK_CATALOG
                  .filter((s) => stockFilter === 'All' || s.sector === stockFilter)
                  .map((s) => { const q = allQuotes.get(s.symbol); return { ...s, price: q?.price ?? null, chg: q?.changePct ?? null, volume: q?.volume ?? null, marketCap: q?.marketCap ?? null }; })
                  .filter((s) => {
                    if (stockCapFilter === 'mega') return (s.marketCap || 0) >= 1e12;
                    if (stockCapFilter === 'large') return (s.marketCap || 0) >= 100e9 && (s.marketCap || 0) < 1e12;
                    if (stockCapFilter === 'mid') return (s.marketCap || 0) < 100e9;
                    return true;
                  })
                  .sort((a, b) => {
                    if (stockSort === 'market_cap') return (b.marketCap ?? 0) - (a.marketCap ?? 0);
                    if (stockSort === 'price') return (b.price ?? 0) - (a.price ?? 0);
                    if (stockSort === 'change') return Math.abs(b.chg ?? 0) - Math.abs(a.chg ?? 0);
                    if (stockSort === 'volume') return (b.volume ?? 0) - (a.volume ?? 0);
                    return a.symbol.localeCompare(b.symbol);
                  })
                  .map((s) => {
                    const up = (s.chg ?? 0) >= 0;
                    const reading = liquidityBySymbol.get(s.symbol);
                    return (
                      <tr
                        key={s.symbol}
                        className="ngxRow"
                        tabIndex={0}
                        onClick={() => pickSymbol(s.symbol)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') pickSymbol(s.symbol);
                        }}
                      >
                        <td className="monoNum" style={{ fontWeight: 700 }}>{s.symbol}</td>
                        <td>{s.name}</td>
                        <td>
                          {reading?.tone && reading.tone !== 'unknown' ? (
                            <span className={`tag liquidityTag liquidityTag--${reading.tone}`}>{reading.label}</span>
                          ) : '—'}
                        </td>
                        <td className="monoNum">{s.price != null ? formatMoney(s.price, 'USD') : '—'}</td>
                        <td>{s.chg != null ? <span className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{s.chg.toFixed(2)}%</span> : <span className="monoNum" style={{ color: '#8a9bb5' }}>—</span>}</td>
                        <td className="monoNum">{s.volume != null ? Number(s.volume).toLocaleString() : '—'}</td>
                        <td className="monoNum">{s.marketCap != null ? formatUsdCap(s.marketCap) : '—'}</td>
                        <td><span className="sugBadge">{s.sector}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!symbol && (
        <section className="panel emptyState">
          <h3>Select a stock to visualize</h3>
          <p>Search a ticker, click a mover, or pick from the table. You will get a price chart, optional indicators, a comparison line, unusual-day flags, and this ticker’s possible-performance range. Forecast is also its own button in the top menu.</p>
        </section>
      )}
    </main>
  );
}
