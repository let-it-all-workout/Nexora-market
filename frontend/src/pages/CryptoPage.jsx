import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, Line, LineChart,
  PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  fetchCrypto,
  fetchCryptoInfo,
  fetchCryptoMarkets,
  fetchCryptoNews,
  fetchCryptoYahooOverviewQuotes,
  fetchFx,
  searchCrypto,
} from '../lib/api';
import { HelpHint } from '../components/HelpHint';
import { ConditionBoard } from '../components/ConditionBoard';
import { MarketChart } from '../components/MarketChart';
import { matchesSearch, searchRank } from '../lib/textSearch';
import {
  breadthFromChanges,
  conditionFromAvg,
  firstLastPct,
  rebaseAverageSeries,
} from '../lib/marketMath';

const OVERVIEW_UNIVERSE = ['bitcoin', 'ethereum', 'solana', 'ripple', 'dogecoin', 'shiba-inu', 'pepe', 'bonk-1'];
const OVERVIEW_LABELS = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  ripple: 'XRP',
  dogecoin: 'DOGE',
  'shiba-inu': 'SHIB',
  pepe: 'PEPE',
  'bonk-1': 'BONK',
};

const CATEGORY_MAP = {
  bitcoin: 'Layer 1', ethereum: 'Layer 1', solana: 'Layer 1', cardano: 'Layer 1',
  polkadot: 'Layer 1', 'avalanche-2': 'Layer 1', near: 'Layer 1', aptos: 'Layer 1',
  sui: 'Layer 1', cosmos: 'Layer 1', algorand: 'Layer 1', fantom: 'Layer 1',
  'internet-computer': 'Layer 1', tron: 'Layer 1', ton: 'Layer 1', kaspa: 'Layer 1',
  sei: 'Layer 1', injective: 'Layer 1', hedera: 'Layer 1',
  'polygon-ecosystem-token': 'Layer 2', 'matic-network': 'Layer 2', arbitrum: 'Layer 2',
  optimism: 'Layer 2', mantle: 'Layer 2', immutable: 'Layer 2', starknet: 'Layer 2',
  // DeFi = yield farming + lending/borrowing protocols (not DEX/oracles)
  aave: 'DeFi',
  compound: 'DeFi',
  'compound-governance-token': 'DeFi',
  'compound-usd-coin': 'DeFi',
  curve: 'DeFi',
  'curve-dao-token': 'DeFi',
  'curve-dao-token-v2': 'DeFi',
  'convex-finance': 'DeFi',
  balancer: 'DeFi',
  'balancer-v2': 'DeFi',
  yearn: 'DeFi',
  'yearn-finance': 'DeFi',
  'synthetix-network-token': 'DeFi',
  synthetix: 'DeFi',
  'kyber-network': 'DeFi',
  'kyber-network-crystal': 'DeFi',
  'badger-dao': 'DeFi',

  // DEX / infra moved out of DeFi so the sector matches "lend & borrow"
  uniswap: 'Exchange',
  raydium: 'Exchange',
  '1inch': 'Exchange',
  jupiter: 'Exchange',
  sushi: 'Exchange',
  sushiswap: 'Exchange',

  // Oracles / data networks
  chainlink: 'AI',
  'the-graph': 'AI',
  ripple: 'Payments', stellar: 'Payments', litecoin: 'Payments',
  dogecoin: 'Meme', 'shiba-inu': 'Meme', pepe: 'Meme', 'floki-inu': 'Meme',
  'bonk-1': 'Meme', 'dogwifcoin': 'Meme',
  binancecoin: 'Exchange', 'okb': 'Exchange', 'crypto-com-chain': 'Exchange',
  'render-token': 'AI', 'fetch-ai': 'AI', 'singularitynet': 'AI', 'bittensor': 'AI',
  filecoin: 'Storage', arweave: 'Storage',
  tether: 'Stablecoin', 'usd-coin': 'Stablecoin', dai: 'Stablecoin',
  'wrapped-bitcoin': 'Wrapped', 'staked-ether': 'Staking',
};

const CRYPTO_CATEGORIES = ['All', 'Layer 1', 'Layer 2', 'DeFi', 'Payments', 'Meme', 'Exchange', 'AI', 'Storage', 'Stablecoin'];

function getCoinCategory(id) {
  return CATEGORY_MAP[id] || 'Other';
}

const TIMEFRAMES = [
  { id: '24h', label: '24hrs', cryptoDays: 1 },
  { id: '7d', label: '7 days', cryptoDays: 7 },
  { id: '1mo', label: '1 month', cryptoDays: 30 },
  { id: '2mo', label: '2 month', cryptoDays: 60 },
  { id: '3mo', label: '3 month', cryptoDays: 90 },
  { id: '1y', label: '1 yr', cryptoDays: 365 },
  { id: 'max', label: 'max', cryptoDays: 'max' },
  { id: 'custom', label: 'custom', cryptoDays: 30 },
];

const CURRENCY_SYMBOLS = { USD: '$', NGN: '₦' };

function formatMoney(value, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${sym}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatUsdCap(value) {
  if (value == null) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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

function buildOverviewSnapshotMetrics(coins) {
  const byId = new Map((coins || []).map((c) => [c.id, c]));
  const items = OVERVIEW_UNIVERSE.map((id) => {
    const c = byId.get(id);
    if (!c || c.price == null) return null;
    const changePct = Number.isFinite(Number(c.change24h)) ? Number(c.change24h) : null;
    if (changePct == null) return null;
    return { asset: id, price: Number(c.price), changePct };
  }).filter(Boolean);

  if (!items.length) return null;

  const movers = [...items].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const { advances, declines, avg: avgChange } = breadthFromChanges(movers.map((m) => m.changePct));

  return {
    summary: {
      avgChange,
      advances,
      declines,
      condition: conditionFromAvg(avgChange, { bullThreshold: 2, bearThreshold: -2 }),
    },
    movers,
    conditionSeries: [],
    snapshotFallback: true,
    yahooFallback: false,
  };
}

function buildYahooSnapshotMetrics(quotes) {
  const byId = new Map((quotes || []).map((q) => [q.id, q]));

  const items = OVERVIEW_UNIVERSE.map((id) => {
    const q = byId.get(id);
    if (!q || q.price == null) return null;
    const changePct = Number.isFinite(Number(q.changePct)) ? Number(q.changePct) : null;
    if (changePct == null) return null;
    return { asset: id, price: Number(q.price), changePct };
  }).filter(Boolean);

  if (!items.length) return null;

  const movers = [...items].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const { advances, declines, avg: avgChange } = breadthFromChanges(movers.map((m) => m.changePct));

  return {
    summary: {
      avgChange,
      advances,
      declines,
      condition: conditionFromAvg(avgChange, { bullThreshold: 2, bearThreshold: -2 }),
    },
    movers,
    conditionSeries: [],
    snapshotFallback: true,
    yahooFallback: true,
  };
}

function buildOverviewFromCryptoSeries(items) {
  const movers = items
    .map((item) => {
      const changePct = firstLastPct(item.series);
      return changePct == null ? null : { ...item, changePct };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  const { advances, declines, avg: avgChange } = breadthFromChanges(movers.map((item) => item.changePct));
  return {
    summary: {
      avgChange,
      advances,
      declines,
      condition: conditionFromAvg(avgChange, { bullThreshold: 2, bearThreshold: -2 }),
    },
    movers,
    conditionSeries: rebaseAverageSeries(movers),
    snapshotFallback: false,
    yahooFallback: false,
  };
}

export function CryptoPage() {
  const [asset, setAsset] = useState('');
  const [pickedTicker, setPickedTicker] = useState('');
  const [assetInput, setAssetInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('7d');
  const [customStart, setCustomStart] = useState('2024-01-01');
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [showNgn, setShowNgn] = useState(false);
  const [series, setSeries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [fxRate, setFxRate] = useState(null);
  const [overview, setOverview] = useState({ summary: null, movers: [], conditionSeries: [] });
  const [coinInfo, setCoinInfo] = useState(null);
  const [cryptoNews, setCryptoNews] = useState([]);
  const [cryptoNewsLoaded, setCryptoNewsLoaded] = useState(false);
  const [allCoins, setAllCoins] = useState([]);
  const [cryptoFilter, setCryptoFilter] = useState('All');
  const [cryptoSort, setCryptoSort] = useState('market_cap');
  const [breadthView, setBreadthView] = useState('all');
  const [vizTab, setVizTab] = useState('performance');
  const [error, setError] = useState('');
  const [overviewError, setOverviewError] = useState('');
  const [overviewNote, setOverviewNote] = useState('');
  const [overviewRetryKey, setOverviewRetryKey] = useState(0);
  const assetCacheRef = useRef(new Map());
  const overviewCacheRef = useRef(new Map());
  const searchRef = useRef(null);
  const selectedPanelRef = useRef(null);

  const tf = TIMEFRAMES.find((item) => item.id === timeframe) || TIMEFRAMES[1];

  const cryptoDays = useMemo(() => {
    if (timeframe !== 'custom') return tf.cryptoDays;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const safeEnd = end > start ? end : new Date(start.getTime() + 24 * 3600 * 1000);
    return Math.max(1, Math.round((safeEnd - start) / (24 * 3600 * 1000)));
  }, [timeframe, tf.cryptoDays, customStart, customEnd]);

  useEffect(() => {
    const cacheKey = `overview:${cryptoDays}`;
    const loadOverview = async () => {
      const cacheEntry = overviewCacheRef.current.get(cacheKey);
      if (cacheEntry && Date.now() - cacheEntry.at < 180_000) {
        const cached = cacheEntry.data;
        setOverview(cached);
        setOverviewError('');
        setOverviewNote(
          cached?.yahooFallback
            ? 'Overview uses Yahoo Finance quotes (CoinGecko was unavailable).'
            : '',
        );
        return;
      }
      try {
        setOverviewError('');
        setOverviewNote('');
        const [mk, yq] = await Promise.all([
          fetchCryptoMarkets({ pages: 1, perPage: 250 }),
          fetchCryptoYahooOverviewQuotes(),
        ]);
        if (mk.coins?.length) setAllCoins(mk.coins);

        let payload = buildOverviewSnapshotMetrics(mk.coins)
          || buildYahooSnapshotMetrics(yq.quotes);
        if (payload) {
          setOverview(payload);
          setOverviewNote(
            payload.yahooFallback
              ? 'Overview uses Yahoo Finance quotes while full history loads.'
              : '',
          );
        }

        const historyResults = await Promise.allSettled(
          OVERVIEW_UNIVERSE.map((id) => fetchCrypto(id, cryptoDays)),
        );
        const historyItems = historyResults
          .map((result, index) => result.status === 'fulfilled'
            ? { asset: OVERVIEW_UNIVERSE[index], series: result.value?.series || [] }
            : null)
          .filter((item) => item && item.series.length >= 2);
        if (historyItems.length >= 2) payload = buildOverviewFromCryptoSeries(historyItems);

        if (!payload) {
          throw new Error(
            'No crypto overview data. Keep the backend running; CoinGecko/Yahoo may be rate-limiting.',
          );
        }
        overviewCacheRef.current.set(cacheKey, { data: payload, at: Date.now() });
        setOverview(payload);
        setOverviewNote(
          payload.yahooFallback
            ? 'Overview uses Yahoo Finance quotes (CoinGecko snapshot was thin).'
            : '',
        );
      } catch (err) {
        setOverview({ summary: null, movers: [], conditionSeries: [] });
        setOverviewNote('');
        setOverviewError(err?.message || 'Crypto overview could not be loaded. Check that the API is running.');
      }
    };
    loadOverview();
  }, [cryptoDays, overviewRetryKey, tf.label]);

  useEffect(() => {
    fetchCryptoMarkets({ pages: 1, perPage: 250 }).then((d) => { if (d.coins?.length) setAllCoins(d.coins); }).catch(() => {});
  }, []);

  const assetTicker = String(
    pickedTicker
    || allCoins.find((coin) => coin.id === asset)?.symbol
    || coinInfo?.symbol
    || ''
  ).toUpperCase();

  useEffect(() => {
    if (!asset) return;
    const key = `${asset}-${cryptoDays}`;
    const cached = assetCacheRef.current.get(key);
    if (cached && Date.now() - cached.at < 180_000) {
      const c = cached.data;
      setSeries(c.series);
      setMeta(c.meta);
      setError('');
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
        const res = await fetchCrypto(asset, cryptoDays, { symbol: assetTicker });
        if (cancelled) return;
        const nextSeries = res.series || [];
        setSeries(nextSeries);
        setMeta(res.provenance || null);
        if (nextSeries.length) {
          assetCacheRef.current.set(key, {
            data: { series: nextSeries, meta: res.provenance || null },
            at: Date.now(),
          });
        } else {
          setError('No price history came back for this coin and timeframe.');
        }
      } catch (err) {
        if (cancelled) return;
        if (!assetCacheRef.current.get(key)?.data?.series?.length) {
          setSeries([]);
          setMeta(null);
        }
        setError(err?.message || 'Could not load crypto chart history.');
      }
    })();
    return () => { cancelled = true; };
  }, [asset, cryptoDays, assetTicker]);

  useEffect(() => {
    if (!asset) return;
    setCoinInfo(null);
    fetchCryptoInfo(asset).then((info) => { if (info && !info.error) setCoinInfo(info); }).catch(() => {});
  }, [asset]);

  useEffect(() => {
    const newsAsset = asset || 'bitcoin';

    let cancelled = false;
    setCryptoNewsLoaded(false);
    setCryptoNews([]);

    fetchCryptoNews(newsAsset)
      .then((d) => { if (!cancelled) setCryptoNews(d?.news || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCryptoNewsLoaded(true); });

    return () => { cancelled = true; };
  }, [asset]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!asset || !selectedPanelRef.current) return;
    selectedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [asset]);

  const displaySeries = useMemo(() => {
    if (!showNgn || !Number.isFinite(fxRate)) return series;
    const keys = ['open', 'high', 'low', 'close', 'ma7', 'sma20', 'ema20', 'bb_upper', 'bb_middle', 'bb_lower', 'macd', 'macd_signal', 'macd_hist'];
    return series.map((row) => {
      const next = { ...row };
      for (const key of keys) {
        if (Number.isFinite(next[key])) next[key] *= fxRate;
      }
      return next;
    });
  }, [series, showNgn, fxRate]);

  const unit = showNgn && Number.isFinite(fxRate) ? 'NGN' : 'USD';
  const selectedSnapshot = allCoins.find((coin) => coin.id === asset) || null;
  const latestUsd = series.at(-1)?.close ?? selectedSnapshot?.price ?? 0;
  const latest = unit === 'NGN' ? latestUsd * fxRate : latestUsd;
  const change = computeChange(displaySeries);
  const topHeadlineRows = useMemo(
    () => ((coinInfo?.news?.length ? coinInfo.news : cryptoNews) || []).slice(0, 3),
    [coinInfo, cryptoNews],
  );
  const allMajorNewsRows = useMemo(
    () => (coinInfo?.news?.length ? coinInfo.news : cryptoNews) || [],
    [coinInfo, cryptoNews],
  );
  const topHeadlineLabel = asset ? (coinInfo?.name || asset) : 'crypto market';

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
        const results = await searchCrypto(q);
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

  const CAT_COLORS = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

  const categoryBreakdown = useMemo(() => {
    const map = new Map();
    allCoins.forEach((c) => {
      const cat = getCoinCategory(c.id);
      if (!map.has(cat)) map.set(cat, { category: cat, count: 0, totalCap: 0, changes: [] });
      const entry = map.get(cat);
      entry.count += 1;
      entry.totalCap += c.marketCap || 0;
      if (c.change24h != null) entry.changes.push(c.change24h);
    });
    return [...map.values()]
      .sort((a, b) => b.totalCap - a.totalCap)
      .map((s) => ({ ...s, avgChange: s.changes.length ? +(s.changes.reduce((a, v) => a + v, 0) / s.changes.length).toFixed(2) : 0 }));
  }, [allCoins]);

  const catChartData = useMemo(() =>
    categoryBreakdown.filter((s) => s.changes.length > 0 && s.category !== 'Other').map((s) => ({ category: s.category, avgChange: s.avgChange })),
  [categoryBreakdown]);

  const cryptoBreadth = useMemo(() => {
    let adv = 0, dec = 0, unch = 0;
    allCoins.forEach((c) => { if ((c.change24h || 0) > 0) adv++; else if ((c.change24h || 0) < 0) dec++; else unch++; });
    return [
      { label: 'Advancing', value: adv, fill: '#22c55e' },
      { label: 'Declining', value: dec, fill: '#ef4444' },
      { label: 'Unchanged', value: unch, fill: '#94a3b8' },
    ];
  }, [allCoins]);

  const breadthRows = useMemo(() => {
    const rows = allCoins.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      category: getCoinCategory(c.id),
      price: c.price ?? null,
      change24h: c.change24h ?? 0,
    }));
    if (breadthView === 'advancing') return rows.filter((r) => r.change24h > 0);
    if (breadthView === 'declining') return rows.filter((r) => r.change24h < 0);
    if (breadthView === 'unchanged') return rows.filter((r) => r.change24h === 0);
    return rows;
  }, [allCoins, breadthView]);

  const topByCap = useMemo(() =>
    allCoins.filter((c) => c.marketCap > 0).sort((a, b) => b.marketCap - a.marketCap).slice(0, 15)
      .map((c) => ({ symbol: c.symbol, name: c.name, marketCap: c.marketCap, change: +(c.change24h || 0).toFixed(2) })),
  [allCoins]);

  const selectedCatPeers = useMemo(() => {
    if (!asset) return [];
    const cat = getCoinCategory(asset);
    return allCoins
      .filter((c) => getCoinCategory(c.id) === cat)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 10)
      .map((c) => ({ id: c.id, symbol: c.symbol, price: c.price || 0, change: +(c.change24h || 0).toFixed(2), isCurrent: c.id === asset }));
  }, [asset, allCoins]);

  const suggestions = searchResults.map((r) => {
    const live = liveMap.get(r.id);
    return {
      id: r.id,
      name: r.name,
      ticker: r.ticker || '',
      thumb: r.thumb || '',
      rank: r.marketCapRank,
      price: live?.series?.at(-1)?.close ?? null,
      changePct: live?.changePct ?? null,
    };
  });

  const mergedSuggestions = useMemo(() => {
    const query = assetInput.trim().toLowerCase();
    const seen = new Set();
    const remote = suggestions.map((item) => ({ ...item, source: 'remote' }));
    remote.forEach((item) => seen.add(item.id));

    if (!query) return remote;

    const localMatches = allCoins
      .filter((coin) => matchesSearch(query, coin.name, coin.symbol, coin.id))
      .sort((a, b) => searchRank(query, { symbol: a.symbol, name: a.name, id: a.id })
        - searchRank(query, { symbol: b.symbol, name: b.name, id: b.id })
        || (a.rank || Number.MAX_SAFE_INTEGER) - (b.rank || Number.MAX_SAFE_INTEGER))
      .filter((coin) => !seen.has(coin.id))
      .slice(0, 12)
      .map((coin) => ({
        id: coin.id,
        name: coin.name,
        ticker: coin.symbol || '',
        thumb: coin.image || '',
        rank: coin.rank,
        price: coin.price ?? null,
        changePct: coin.change24h ?? null,
        source: 'local',
      }));

    return [...remote, ...localMatches]
      .sort((a, b) => searchRank(query, { symbol: a.ticker || a.id, name: a.name, id: a.id })
        - searchRank(query, { symbol: b.ticker || b.id, name: b.name, id: b.id }))
      .slice(0, 15);
  }, [suggestions, allCoins, assetInput]);

  const showDropdown = searchOpen && assetInput.trim().length > 0;

  function pickAsset(id, label = id, ticker = '') {
    setAssetInput(label);
    setAsset(id);
    setPickedTicker(String(ticker || '').toUpperCase());
    setSearchOpen(false);
    setSearchResults([]);
  }

  function handleSearchKey(e) {
    if (e.key === 'Enter' && assetInput.trim()) {
      const query = assetInput.trim().toLowerCase();
      const exactMatch = mergedSuggestions.find((item) =>
        item.id.toLowerCase() === query
        || item.name.toLowerCase() === query
        || String(item.ticker || '').toLowerCase() === query,
      );
      if (exactMatch) pickAsset(exactMatch.id, exactMatch.name, exactMatch.ticker);
      else pickAsset(query, assetInput.trim());
    }
    if (e.key === 'Escape') setSearchOpen(false);
  }

  return (
    <main className="layout">
      <section className="panel controlsV2">
        <div className="controlsTopRow">
          <div>
            <h2 className="workspaceTitle">
              Crypto{' '}
              <HelpHint
                label="What is the Crypto page?"
                text="Look up a coin, read history, overlays, and unusual-day marks. Crypto venues are separate from the equity brokers listed on Learn."
              />
            </h2>
            <p className="subtle">Search a coin, plot history, overlay tested indicators, and flag unusual days.</p>
          </div>
          <div className="controlsActions">
            <label className="togglePill">
              <input
                type="checkbox"
                checked={showNgn}
                disabled={!Number.isFinite(fxRate)}
                onChange={(e) => setShowNgn(e.target.checked)}
              />
              <span className="toggleTrack"><span className="toggleThumb" /></span>
              <span className="toggleLabel">{showNgn ? '₦ NGN' : '$ USD'}</span>
            </label>
            <HelpHint
              label="What does the naira toggle do?"
              text="Shows the same US-dollar prices converted with a live USD to NGN rate. The original data is still in dollars."
            />
          </div>
        </div>

        <div className="searchTimeRow">
          <div className="searchWrap" ref={searchRef} data-guide="crypto-search">
            <input
              className="searchInput"
              value={assetInput}
              onChange={(e) => { setAssetInput(e.target.value); setSearchOpen(true); doSearch(e.target.value); }}
              onFocus={() => { setSearchOpen(true); if (assetInput) doSearch(assetInput); }}
              onKeyDown={handleSearchKey}
              placeholder="Search any crypto globally — name, ticker, or coin ID..."
            />
            {assetInput && (
              <button type="button" className="searchClear" onClick={() => { setAssetInput(''); setSearchOpen(false); }}>✕</button>
            )}
            {showDropdown && (
              <ul className="suggestionList">
                {searching && mergedSuggestions.length === 0 && (
                  <li className="sugStatus">Searching markets...</li>
                )}
                {!searching && mergedSuggestions.length === 0 && (
                  <li className="sugStatus">No results for &quot;{assetInput.trim()}&quot;</li>
                )}
                {mergedSuggestions.map((s) => {
                  const hasLive = s.price != null;
                  const up = (s.changePct ?? 0) >= 0;
                  return (
                    <li key={s.id}>
                      <button type="button" className="suggestionItem" onClick={() => pickAsset(s.id, s.name, s.ticker)}>
                        <div className="sugLeft">
                          {s.thumb && <img className="sugThumb" src={s.thumb} alt="" />}
                          <div>
                            <span className="sugSymbol">{s.ticker || s.id}</span>
                            <span className="sugName">{s.name}{s.rank ? ` · #${s.rank}` : ''}</span>
                          </div>
                        </div>
                        <span className="sugPrice monoNum">{hasLive ? formatMoney(s.price, 'USD') : ''}</span>
                        {hasLive && s.changePct != null ? (
                          <span className={`sugChange ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{s.changePct.toFixed(2)}%</span>
                        ) : (
                          <span className="sugBadge">{s.source === 'local' ? 'MARKET' : 'CRYPTO'}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {assetInput.trim() && !searching && (
                  <li className="sugDivider">
                    <button type="button" className="suggestionItem sugCustom" onClick={() => pickAsset(assetInput.trim().toLowerCase(), assetInput.trim())}>
                      <span className="sugSymbol">⏎ Open &quot;{assetInput.trim()}&quot;</span>
                      <span className="sugName">Try direct CoinGecko lookup if the search list missed it</span>
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
          <HelpHint
            label="How does search work?"
            text="Type a coin name or ticker such as bitcoin or BTC, then click a result. That loads price history from CoinGecko, or Yahoo Finance if CoinGecko is unavailable."
          />

          <div className="timeframeBar">
            {TIMEFRAMES.map((item) => (
              <button key={item.id} type="button" className={item.id === timeframe ? 'tfBtn active' : 'tfBtn'} onClick={() => setTimeframe(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <HelpHint
            label="What do the time ranges do?"
            text="How far back the chart goes. Short ranges can show hours. Longer ranges use one close per day. Custom lets you pick dates."
          />
        </div>

        {timeframe === 'custom' && (
          <div className="customRangeRow">
            <label>From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label>
            <label>To<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label>
          </div>
        )}
      </section>

      <section className="panel topNewsPanel">
        <div className="sectionHead">
          <div>
            <h3>Top Headlines</h3>
            <p className="subtle">News tied to {topHeadlineLabel}, surfaced early so beginners can read context before reacting to price swings.</p>
          </div>
          <span className="tag muted">{asset ? 'Selected asset' : 'Market context'}</span>
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

      <section className="panel conditionPanel">
        <ConditionBoard
          hint="A sample of tracked coins (BTC, ETH, SOL, XRP and four others). Bullish means most of those closed higher. It is not the whole crypto market."
          rangeLabel={overview.snapshotFallback ? 'Today’s quotes' : tf.label}
          sampleLine={
            overview.snapshotFallback
              ? 'Tracked coins — today’s quote changes. Not the whole crypto market.'
              : `Tracked coins over ${tf.label}. Each path starts at 100 so you compare the move, not the coin price.`
          }
          summary={overview.summary}
          names={(overview.movers?.length
            ? overview.movers
            : OVERVIEW_UNIVERSE.map((asset) => ({ asset, changePct: null }))
          ).map((item) => ({
            id: item.asset,
            label: OVERVIEW_LABELS[item.asset] || item.asset,
            changePct: item.changePct,
          }))}
          onPick={pickAsset}
          fallbackNote={
            [
              overview.yahooFallback ? 'Overview uses Yahoo Finance quotes (CoinGecko was unavailable).' : '',
              overview.snapshotFallback && !overview.yahooFallback
                ? (timeframe === '24h'
                  ? 'Hourly bars for this board did not load, so these figures use today’s quotes.'
                  : 'History for this range did not load, so these figures use today’s quotes.')
                : '',
              !overview.yahooFallback ? overviewNote : '',
            ].filter(Boolean).join(' ')
          }
          error={overviewError}
          onRetry={() => {
            overviewCacheRef.current.delete(`overview:${cryptoDays}`);
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
                  <Line type="monotone" dataKey="marketIndex" stroke="#0ea5e9" dot={false} strokeWidth={2} name="Sample index (start = 100)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ConditionBoard>
      </section>

      {catChartData.length > 0 && (
        <section className="panel">
          <div className="sectionHead">
            <h3>Category Performance & Breadth</h3>
            <span className="tag muted">Daily quote changes</span>
          </div>
          <div className="splitBoard">
            <div className="chartWrap splitBoardChart" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={catChartData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="category" width={88} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(v) => [`${v >= 0 ? '+' : ''}${v}%`, 'Avg change']} />
                  <Bar dataKey="avgChange" name="Avg change" radius={[0, 4, 4, 0]}>
                    {catChartData.map((e, idx) => <Cell key={idx} fill={e.avgChange >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="breadthSide">
              <h4 className="breadthPanelTitle">Market breadth</h4>
              <div className="chartWrap chartWrap--pie" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie data={cryptoBreadth} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={3} label={false}>
                      {cryptoBreadth.map((e, idx) => <Cell key={idx} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} coins`, name]} />
                    <Legend verticalAlign="bottom" height={28} iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="breadthQuickGrid">
                <button type="button" className={breadthView === 'advancing' ? 'breadthQuickCard breadthQuickCard--up active' : 'breadthQuickCard breadthQuickCard--up'} onClick={() => setBreadthView('advancing')}><div className="breadthQuickLabel">Advancing</div><div className="monoNum breadthQuickValue">{cryptoBreadth[0].value}</div></button>
                <button type="button" className={breadthView === 'declining' ? 'breadthQuickCard breadthQuickCard--down active' : 'breadthQuickCard breadthQuickCard--down'} onClick={() => setBreadthView('declining')}><div className="breadthQuickLabel">Declining</div><div className="monoNum breadthQuickValue">{cryptoBreadth[1].value}</div></button>
                <button type="button" className={breadthView === 'unchanged' ? 'breadthQuickCard breadthQuickCard--flat active' : 'breadthQuickCard breadthQuickCard--flat'} onClick={() => setBreadthView('unchanged')}><div className="breadthQuickLabel">Unchanged</div><div className="monoNum breadthQuickValue">{cryptoBreadth[2].value}</div></button>
              </div>
              <button type="button" className="breadthShowAll" onClick={() => setBreadthView('all')}>Show all</button>
            </div>
          </div>
          <div className="ngxTable" style={{ marginTop: '0.8rem', maxHeight: 260, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Coin</th><th>Name</th><th>Category</th><th>Price</th><th>24h</th></tr></thead>
              <tbody>
                {breadthRows.map((r) => {
                  const up = r.change24h >= 0;
                  return (
                    <tr
                      key={r.id}
                      className="ngxRow"
                      tabIndex={0}
                      onClick={() => pickAsset(r.id, r.name, r.symbol)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') pickAsset(r.id, r.name, r.symbol);
                      }}
                    >
                      <td className="monoNum" style={{ fontWeight: 700 }}>{r.symbol}</td>
                      <td>{r.name}</td>
                      <td><span className="sugBadge">{r.category}</span></td>
                      <td className="monoNum">{r.price != null ? formatMoney(r.price, 'USD') : '—'}</td>
                      <td><span className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{r.change24h.toFixed(2)}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="sectionHead"><h3>Top Movers</h3></div>
        {overview.movers.length === 0 ? (
          <p className="subtle" style={{ padding: '0.5rem 0' }}>No mover data yet. {overviewError ? 'Use Retry above if the overview request failed.' : ''}</p>
        ) : (
          <div className="moverGrid">
            {overview.movers.map((m) => {
              const last = m.series?.at(-1)?.close;
              const up = m.changePct >= 0;
              return (
                <button key={m.asset} className={`moverCard ${up ? 'cardUp' : 'cardDown'}`} type="button" onClick={() => pickAsset(m.asset, m.asset)}>
                  <span>{m.asset}</span>
                  {last != null && <span className="moverPrice">{formatMoney(last, 'USD')}</span>}
                  <strong className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{m.changePct.toFixed(2)}%</strong>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {allCoins.length > 0 && (
        <section className="panel">
          <div className="sectionHead">
            <h3>Visualizer</h3>
            <div className="timeframeBar">
              <button type="button" className={vizTab === 'performance' ? 'tfBtn active' : 'tfBtn'} onClick={() => setVizTab('performance')}>Performance</button>
              <button type="button" className={vizTab === 'marketcap' ? 'tfBtn active' : 'tfBtn'} onClick={() => setVizTab('marketcap')}>Market Cap</button>
              <button type="button" className={vizTab === 'categories' ? 'tfBtn active' : 'tfBtn'} onClick={() => setVizTab('categories')}>Categories</button>
            </div>
          </div>
          {vizTab === 'performance' && (
            topByCap.length > 0 ? (
              <div className="chartWrap" style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={topByCap.map((s) => ({ symbol: s.symbol, change: s.change }))} layout="vertical" margin={{ left: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="symbol" width={50} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip formatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                    <Bar dataKey="change" name="24h Change">{topByCap.map((e, i) => <Cell key={i} fill={e.change >= 0 ? '#22c55e' : '#ef4444'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="subtle" style={{ padding: '1rem' }}>No performance chart yet — market list is empty or missing 24h change.</p>
            )
          )}
          {vizTab === 'marketcap' && (
            topByCap.length > 0 ? (
              <div className="chartWrap" style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={topByCap.map((s) => ({ symbol: s.symbol, cap: s.marketCap }))} layout="vertical" margin={{ left: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatUsdCap(v)} />
                    <YAxis type="category" dataKey="symbol" width={50} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip formatter={(v) => formatUsdCap(Number(v))} />
                    <Bar dataKey="cap" name="Market Cap" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="subtle" style={{ padding: '1rem' }}>No market-cap chart yet — waiting for coins with market cap data.</p>
            )
          )}
          {vizTab === 'categories' && (
            <div className="vizTwoCol">
              <div className="chartWrap chartWrap--pie" style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
                    <Pie data={categoryBreakdown.filter((c) => c.category !== 'Other')} dataKey="totalCap" nameKey="category" cx="50%" cy="50%" outerRadius={86} label={({ category, percent }) => `${category.slice(0, 10)} ${(percent * 100).toFixed(0)}%`} labelLine fontSize={10}>
                      {categoryBreakdown.filter((c) => c.category !== 'Other').map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatUsdCap(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="ngxTable" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table>
                  <thead><tr><th>Category</th><th>Coins</th><th>Cap</th><th>Avg 24h</th></tr></thead>
                  <tbody>{categoryBreakdown.filter((c) => c.category !== 'Other').map((s, i) => (
                    <tr key={s.category}><td><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[i % CAT_COLORS.length], marginRight: 6 }} />{s.category}</td><td className="monoNum">{s.count}</td><td className="monoNum">{formatUsdCap(s.totalCap)}</td><td>{s.avgChange !== 0 ? <span className={s.avgChange >= 0 ? 'marketUp' : 'marketDown'}>{s.avgChange >= 0 ? '+' : ''}{s.avgChange}%</span> : '—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {asset && (
        <section className="panel" ref={selectedPanelRef}>
          <div className="sectionHead">
            <h3>{asset}</h3>
            <div className="vizPriceRow">
              <span className={`priceTag ${change.isPositive ? 'up' : 'down'}`}>{formatMoney(latest, unit)}</span>
              {displaySeries.length >= 2 ? (
                <span className={`pctBadge ${change.isPositive ? 'up' : 'down'}`}>{change.isPositive ? '▲' : '▼'} {change.isPositive ? '+' : ''}{change.pct.toFixed(2)}%</span>
              ) : <span className="tag muted">Current snapshot</span>}
              <button type="button" className="expandBtn" onClick={() => { setAsset(''); setCoinInfo(null); setPickedTicker(''); }}>← Back</button>
            </div>
          </div>
          <div className="sectionHead" style={{ marginTop: '0.5rem' }}>
            <div>
              <h4>Analysis Horizon</h4>
              <p className="subtle">Switch the crypto timeframe from inside the selected asset view.</p>
            </div>
          </div>
          <div className="timeframeBar">
            {TIMEFRAMES.map((item) => (
              <button key={`detail-${item.id}`} type="button" className={item.id === timeframe ? 'tfBtn active' : 'tfBtn'} onClick={() => setTimeframe(item.id)}>
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
          {displaySeries.length > 0 ? (
            <MarketChart title={`Crypto: ${asset}`} data={displaySeries} provenance={meta} isPositive={change.isPositive} currencySymbol={unit === 'NGN' ? '₦' : '$'} changePct={change.pct} />
          ) : (
            <div className="researchEmptyState">
              <strong>No chart history yet</strong>
              <p>The price below is a live snapshot. The chart stays empty until CoinGecko or Yahoo returns history for this coin.</p>
            </div>
          )}
          {error && <p className="warn">{error}</p>}

          {selectedCatPeers.length > 1 && (
            <>
              <div className="sectionHead" style={{ marginTop: '1rem' }}><h4>Category Peers: {getCoinCategory(asset)}</h4></div>
              <div className="vizTwoCol">
                <div className="chartWrap" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedCatPeers} layout="vertical" margin={{ left: 55 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} /><YAxis type="category" dataKey="symbol" width={50} tick={{ fontSize: 11, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} /><Bar dataKey="price" name="Price" radius={[0, 4, 4, 0]}>{selectedCatPeers.map((e, i) => <Cell key={i} fill={e.isCurrent ? '#0ea5e9' : '#94a3b8'} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chartWrap" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={selectedCatPeers} layout="vertical" margin={{ left: 55 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `${v}%`} /><YAxis type="category" dataKey="symbol" width={50} tick={{ fontSize: 11, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} /><Bar dataKey="change" name="24h Change" radius={[0, 4, 4, 0]}>{selectedCatPeers.map((e, i) => <Cell key={i} fill={e.isCurrent ? '#0ea5e9' : (e.change >= 0 ? '#22c55e' : '#ef4444')} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {coinInfo && (
            <>
              <div className="sectionHead" style={{ marginTop: '1rem' }}>
                <h4>{coinInfo.image && <img src={coinInfo.image} alt="" style={{ width: 20, height: 20, borderRadius: 999, verticalAlign: 'middle', marginRight: 6 }} />}{coinInfo.name} ({coinInfo.symbol})</h4>
                {coinInfo.marketCapRank && <span className="tag muted">Rank #{coinInfo.marketCapRank}</span>}
              </div>
              {coinInfo.description && <p className="subtle" style={{ lineHeight: 1.5, marginBottom: '0.6rem' }}>{coinInfo.description}.</p>}

              <div className="metricRow">
                {coinInfo.marketCap != null && <article className="metricCard"><span>Market Cap</span><strong className="monoNum">{formatUsdCap(coinInfo.marketCap)}</strong></article>}
                {coinInfo.totalVolume != null && <article className="metricCard"><span>24h Volume</span><strong className="monoNum">${(coinInfo.totalVolume / 1e9).toFixed(2)}B</strong></article>}
                {coinInfo.high24h != null && <article className="metricCard"><span>24h Range</span><strong className="monoNum">${coinInfo.low24h?.toLocaleString()} — ${coinInfo.high24h?.toLocaleString()}</strong></article>}
                {coinInfo.ath != null && <article className="metricCard"><span>All-Time High</span><strong className="monoNum">${coinInfo.ath.toLocaleString()}</strong></article>}
                {coinInfo.circulatingSupply != null && <article className="metricCard"><span>Supply</span><strong className="monoNum">{(coinInfo.circulatingSupply / 1e6).toFixed(1)}M</strong></article>}
                {coinInfo.priceChange24h != null && <article className="metricCard"><span>24h / 7d / 30d</span><strong className="monoNum"><span className={(coinInfo.priceChange24h || 0) >= 0 ? 'marketUp' : 'marketDown'}>{coinInfo.priceChange24h?.toFixed(1)}%</span> / <span className={(coinInfo.priceChange7d || 0) >= 0 ? 'marketUp' : 'marketDown'}>{coinInfo.priceChange7d?.toFixed(1)}%</span> / <span className={(coinInfo.priceChange30d || 0) >= 0 ? 'marketUp' : 'marketDown'}>{coinInfo.priceChange30d?.toFixed(1)}%</span></strong></article>}
              </div>

              {(coinInfo.links?.homepage || coinInfo.links?.twitter) && (
                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {coinInfo.links.homepage && <a href={coinInfo.links.homepage} target="_blank" rel="noopener noreferrer" className="sugBadge" style={{ textDecoration: 'none' }}>Website</a>}
                  {coinInfo.links.twitter && <a href={coinInfo.links.twitter} target="_blank" rel="noopener noreferrer" className="sugBadge" style={{ textDecoration: 'none' }}>Twitter</a>}
                  {coinInfo.links.reddit && <a href={coinInfo.links.reddit} target="_blank" rel="noopener noreferrer" className="sugBadge" style={{ textDecoration: 'none' }}>Reddit</a>}
                </div>
              )}
            </>
          )}

        </section>
      )}

      <section className="panel">
        <div className="sectionHead">
          <div>
            <h3>All Major News</h3>
            <p className="subtle">Fuller crypto news feed for more detailed follow-up beyond the top stories.</p>
          </div>
          <span className="tag muted">{asset ? 'Selected asset feed' : 'Market feed'}</span>
        </div>
        {allMajorNewsRows.length > 0 ? (
          <div className="newsGrid">
            {allMajorNewsRows.map((n, idx) => (
              <a key={idx} href={n.link} target="_blank" rel="noopener noreferrer" className="newsCard">
                {n.thumbnail && <img src={n.thumbnail} alt="" className="newsThumb" />}
                <div className="newsBody">
                  <strong>{n.title}</strong>
                  <span>{n.publisher}{newsDateSuffix(n.date)}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          cryptoNewsLoaded ? <p className="subtle">News not available right now.</p> : <p className="subtle">Loading broader crypto headlines...</p>
        )}
      </section>


      {!asset && (
        <section className="panel">
          <div className="sectionHead">
            <h3>Browse by Category</h3>
            <span className="tag muted">{allCoins.filter((c) => cryptoFilter === 'All' || getCoinCategory(c.id) === cryptoFilter).length} coins in view</span>
          </div>
          <div className="ngxFilters">
            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">
                Category <HelpHint text="Filter the coin list by type, such as Layer 1 or meme coins. This is a simple grouping, not investment advice." />
              </label>
              <div className="timeframeBar" style={{ flexWrap: 'wrap' }}>{CRYPTO_CATEGORIES.map((cat) => (
                <button key={cat} type="button" className={cryptoFilter === cat ? 'tfBtn active' : 'tfBtn'} onClick={() => setCryptoFilter(cat)}>{cat}</button>
              ))}</div>
            </div>
            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Sort by</label>
              <div className="timeframeBar">
                <button type="button" className={cryptoSort === 'market_cap' ? 'tfBtn active' : 'tfBtn'} onClick={() => setCryptoSort('market_cap')}>Market Cap</button>
                <button type="button" className={cryptoSort === 'volume' ? 'tfBtn active' : 'tfBtn'} onClick={() => setCryptoSort('volume')}>24h Volume</button>
                <button type="button" className={cryptoSort === 'change' ? 'tfBtn active' : 'tfBtn'} onClick={() => setCryptoSort('change')}>24h Change</button>
                <button type="button" className={cryptoSort === 'price' ? 'tfBtn active' : 'tfBtn'} onClick={() => setCryptoSort('price')}>Price</button>
                <button type="button" className={cryptoSort === 'name' ? 'tfBtn active' : 'tfBtn'} onClick={() => setCryptoSort('name')}>A-Z</button>
              </div>
            </div>
          </div>
          <div className="ngxTable">
            <table>
              <thead><tr><th>#</th><th>Coin</th><th>Price</th><th>24h</th><th>7d</th><th>Volume</th><th>Market Cap</th><th>Category</th></tr></thead>
              <tbody>
                {allCoins
                  .filter((c) => cryptoFilter === 'All' || getCoinCategory(c.id) === cryptoFilter)
                  .sort((a, b) => {
                    if (cryptoSort === 'volume') return (b.volume24h || 0) - (a.volume24h || 0);
                    if (cryptoSort === 'change') return Math.abs(b.change24h || 0) - Math.abs(a.change24h || 0);
                    if (cryptoSort === 'price') return (b.price || 0) - (a.price || 0);
                    if (cryptoSort === 'name') return a.name.localeCompare(b.name);
                    return (b.marketCap || 0) - (a.marketCap || 0);
                  })
                  .map((c) => {
                    const up = (c.change24h || 0) >= 0;
                    const up7d = (c.change7d || 0) >= 0;
                    return (
                      <tr
                        key={c.id}
                        className="ngxRow"
                        tabIndex={0}
                        onClick={() => pickAsset(c.id, c.name, c.symbol)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') pickAsset(c.id, c.name, c.symbol);
                        }}
                      >
                        <td className="monoNum">{c.rank || '—'}</td>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{c.image && <img src={c.image} alt="" style={{ width: 20, height: 20, borderRadius: 999 }} />}<div><span style={{ fontWeight: 700 }}>{c.symbol}</span><span className="sugName" style={{ display: 'block' }}>{c.name}</span></div></td>
                        <td className="monoNum">${c.price?.toLocaleString(undefined, { maximumFractionDigits: c.price >= 1 ? 2 : 6 })}</td>
                        <td><span className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {(c.change24h || 0).toFixed(1)}%</span></td>
                        <td>{c.change7d != null ? <span className={`pctBadge ${up7d ? 'up' : 'down'}`}>{up7d ? '▲' : '▼'} {(c.change7d || 0).toFixed(1)}%</span> : '—'}</td>
                        <td className="monoNum">${c.volume24h ? (c.volume24h / 1e9).toFixed(2) + 'B' : '—'}</td>
                        <td className="monoNum">{c.marketCap ? formatUsdCap(c.marketCap) : '—'}</td>
                        <td><span className="sugBadge">{getCoinCategory(c.id)}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!asset && (
        <section className="panel emptyState">
          <h3>Select a coin to visualize</h3>
          <p>Search for any cryptocurrency above, click a top mover, or browse by category. You&apos;ll see price charts with tested indicators when history is available.</p>
        </section>
      )}
    </main>
  );
}
