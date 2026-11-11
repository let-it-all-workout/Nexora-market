import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, CartesianGrid, Cell, Legend, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie,
} from 'recharts';
import {
  fetchNgxCompany,
  fetchNgxHistory,
  fetchNgxIndexHistory,
  fetchNgxStocks,
  fetchNgxMarket,
  fetchNgxNews,
  fetchNgxOutlook,
  searchNgx,
} from '../lib/api';
import { HelpHint } from '../components/HelpHint';
import { ConditionBoard } from '../components/ConditionBoard';
import { MarketChart } from '../components/MarketChart';
import { LiquidityFlag } from '../components/LiquidityFlag';
import { OutlookPanel } from '../components/OutlookPanel';
import { LiquidityBoard } from '../components/LiquidityBoard';
import { matchesSearch, searchRank } from '../lib/textSearch';
import { assessLiquidity, scoreLiquidityBoard, sessionAverages } from '../lib/liquidity';
import {
  conditionFromAvg,
  seriesReturn,
  sessionChange,
} from '../lib/marketMath';
import { formatDateTick } from '../lib/chartFormat';

function formatNgn(value) {
  return `₦${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatNgnOrDash(value) {
  return value != null && Number.isFinite(Number(value)) ? formatNgn(value) : '—';
}

function formatCap(value) {
  if (!value) return '—';
  if (value >= 1e12) return `₦${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₦${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₦${(value / 1e6).toFixed(1)}M`;
  return formatNgn(value);
}

const SECTOR_ACRONYMS = new Set(['ICT']);
const SECTOR_MINOR_WORDS = new Set(['and', 'of', 'the']);

// NGX Pulse ships sectors in caps ("OIL AND GAS"); soften them without eating acronyms.
function prettySector(value) {
  if (!value) return '';
  return String(value)
    .split(/(\s+|\/)/)
    .map((part) => {
      if (!part.trim() || part === '/') return part;
      if (SECTOR_ACRONYMS.has(part.toUpperCase())) return part.toUpperCase();
      const lower = part.toLowerCase();
      if (SECTOR_MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function formatShareCount(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  return value.toLocaleString();
}

function formatTradeDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPct(value, { sign = false } = {}) {
  if (!Number.isFinite(value)) return '—';
  return `${sign && value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function stockChange(s) {
  return sessionChange(s) ?? 0;
}

function listingLabel(method) {
  if (method === 'introduction') return 'Introduction';
  if (method === 'ipo') return 'IPO';
  if (method === 'scheme') return 'Share exchange';
  if (method === 'merger') return 'Merger';
  return 'Not stated';
}

function listingExplain(stock) {
  const method = stock?.listing_method;
  const lead = method === 'introduction'
    ? 'Listed by introduction. The shares were already issued, and no public offer was made on NGX at listing.'
    : method === 'ipo'
      ? 'IPO. Shares were sold to the public as part of the listing.'
      : method === 'scheme'
        ? 'Share exchange. A listed company was delisted and these shares replaced it under a scheme of arrangement. No public offer.'
        : method === 'merger'
          ? 'Merger. The shares were listed when companies combined. No separate public offer was made at that listing.'
          : 'Not stated. The first listing does not say how the shares were admitted. Later share sales do not count.';
  const dated = stock?.listing_method_as_of ? ` Listed ${formatTradeDate(stock.listing_method_as_of)}.` : '';
  const source = stock?.listing_method_source ? ` ${stock.listing_method_source}.` : '';
  return `${lead}${dated}${source}`;
}

function ListingTag({ stock }) {
  const method = stock?.listing_method;
  const known = method === 'introduction' || method === 'ipo' || method === 'scheme' || method === 'merger';
  return (
    <span
      className={known ? `tag listTag listTag--${method}` : 'tag muted listTag'}
      title={stock?.listing_method_source || undefined}
    >
      {listingLabel(method)}
    </span>
  );
}

function changeLabel(s) {
  if (s.change_percent != null) return 'daily';
  if (s.current_price && s.previous_close && s.current_price !== s.previous_close) return 'daily';
  if (s.pct_change_7d != null && s.pct_change_7d !== 0) return '7d';
  return 'daily';
}

const SECTOR_COLORS = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

const NGX_TIMEFRAMES = [
  { id: '1d', label: '24hrs', days: 1 },
  { id: '7d', label: '7 days', days: 7 },
  { id: '1mo', label: '1 month', days: 30 },
  { id: '2mo', label: '2 month', days: 60 },
  { id: '3mo', label: '3 month', days: 90 },
  { id: '1y', label: '1 yr', days: 365 },
  { id: 'custom', label: 'custom', days: 30 },
];

export function NgxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const urlSymbol = useRef(null);
  const [overview, setOverview] = useState(null);
  const [allStocks, setAllStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedNews, setSelectedNews] = useState([]);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [outlookYears, setOutlookYears] = useState(3);
  const [outlook, setOutlook] = useState(null);
  const [outlookError, setOutlookError] = useState('');
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [timeframe, setTimeframe] = useState('7d');
  const [customStart, setCustomStart] = useState('2025-01-01');
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));
  const [vizTab, setVizTab] = useState('performance');
  const [filterSector, setFilterSector] = useState('all');
  const [filterCap, setFilterCap] = useState('all');
  const [filterListing, setFilterListing] = useState('all');
  const [sortBy, setSortBy] = useState('market_cap');
  const [breadthView, setBreadthView] = useState('all');
  const [error, setError] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [loadingNgx, setLoadingNgx] = useState(true);
  const [indexLoading, setIndexLoading] = useState(true);
  const [selectedHistorySeries, setSelectedHistorySeries] = useState([]);
  const [selectedHistoryKey, setSelectedHistoryKey] = useState('');
  const [selectedHistoryMeta, setSelectedHistoryMeta] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [indexHistorySeries, setIndexHistorySeries] = useState([]);
  const [indexHistoryKey, setIndexHistoryKey] = useState('');
  const [indexHistoryMeta, setIndexHistoryMeta] = useState(null);
  const [rangeBreadth, setRangeBreadth] = useState({ key: '', rows: [] });
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const searchSeq = useRef(0);
  const selectedPanelRef = useRef(null);
  const liquidityRef = useRef(null);
  const browseRef = useRef(null);
  const breadthRef = useRef(null);
  const vizRef = useRef(null);
  const conditionRef = useRef(null);
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [fromLiquidity, setFromLiquidity] = useState(false);
  const [liquidityListKey, setLiquidityListKey] = useState(0);
  const scrollAfterClose = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingNgx(true);
        await fetchNgxStocks().then((payload) => {
          if (cancelled) return;
          const stocks = payload?.stocks || (Array.isArray(payload) ? payload : []);
          setAllStocks(stocks);
          if (stocks.length) setError('');
          if (!stocks.length && payload?.warning) setError(payload.warning);
        }).catch((requestError) => {
          if (!cancelled) setError(requestError.message);
        });
        await fetchNgxMarket().then((market) => {
          if (cancelled) return;
          setOverview(market);
          if (market?.warning) setError(market.warning);
        });
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoadingNgx(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryTick]);

  useEffect(() => {
    if (allStocks.length > 0) return undefined;
    const id = setInterval(() => setRetryTick((x) => x + 1), 20000);
    return () => clearInterval(id);
  }, [allStocks.length]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!selected || !selectedPanelRef.current) return;
    selectedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected]);

  useEffect(() => {
    const incoming = String(searchParams.get('symbol') || '').trim().toUpperCase();
    if (!incoming) {
      if (urlSymbol.current) {
        urlSymbol.current = '';
        setSelected(null);
        setSearchInput('');
        setSearchOpen(false);
        if (!scrollAfterClose.current) scrollAfterClose.current = browseRef;
      }
      return;
    }
    const match = allStocks.find((stock) => String(stock.symbol || '').toUpperCase() === incoming);
    if (!match) return;
    if (urlSymbol.current === incoming && selected?.symbol === match.symbol) return;
    urlSymbol.current = incoming;
    setSelected(match);
    setSearchInput(match.symbol || incoming);
    setSearchOpen(false);
  }, [searchParams, allStocks, selected?.symbol]);

  useEffect(() => {
    if (!location.state?.board) return;
    setShowLiquidity(false);
    setFromLiquidity(false);
    setFilterSector('all');
    setFilterCap('all');
    setFilterListing('all');
    urlSymbol.current = '';
    setSelected(null);
    setSearchInput('');
    setSearchOpen(false);
  }, [location.state]);

  useEffect(() => {
    if (selected) return undefined;
    const target = scrollAfterClose.current;
    if (!target) return undefined;
    const timer = window.setTimeout(() => {
      scrollAfterClose.current = null;
      target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [selected, showLiquidity]);

  useEffect(() => {
    const symbol = selected?.symbol;
    if (!symbol) {
      setCompany(null);
      setCompanyLoading(false);
      return undefined;
    }
    let cancelled = false;
    setCompany(null);
    setCompanyLoading(true);
    fetchNgxCompany(symbol)
      .then((data) => {
        if (!cancelled) setCompany(data?.symbol ? data : null);
      })
      .catch(() => {
        if (!cancelled) setCompany(null);
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => { cancelled = true; };
  }, [selected?.symbol]);

  useEffect(() => {
    const query = selected?.name || selected?.symbol || 'Nigerian Stock Exchange';
    if (!query) {
      setSelectedNews([]);
      setNewsLoaded(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const d = await fetchNgxNews(query);
        if (cancelled) return;
        setSelectedNews(d?.news || []);
      } finally {
        if (!cancelled) setNewsLoaded(true);
      }
    }, selected ? 0 : 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selected]);

  const doSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const results = await searchNgx(q);
        if (seq === searchSeq.current) setSearchResults(results);
      } catch {
        if (seq === searchSeq.current) setSearchResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 80);
  }, []);

  const showDropdown = searchOpen && searchInput.trim().length > 0;
  const mergedSearchResults = useMemo(() => {
    const query = searchInput.trim();
    const seen = new Set();
    const remote = (searchResults || []).filter((row) => {
      const key = String(row.symbol || '').toUpperCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!query) return remote;
    const local = allStocks
      .filter((stock) => matchesSearch(query, stock.symbol, stock.name, stock.sector))
      .sort((a, b) => searchRank(query, a) - searchRank(query, b))
      .filter((stock) => !seen.has(String(stock.symbol || '').toUpperCase()))
      .slice(0, 15);
    return [...local, ...remote]
      .sort((a, b) => searchRank(query, a) - searchRank(query, b))
      .slice(0, 15);
  }, [searchInput, searchResults, allStocks]);
  const topHeadlineRows = useMemo(() => (selectedNews || []).slice(0, 3), [selectedNews]);
  const allMajorNewsRows = useMemo(() => selectedNews || [], [selectedNews]);
  const topHeadlineLabel = selected?.name || selected?.symbol || 'Nigerian market';

  function clearSymbolParam() {
    const params = new URLSearchParams(searchParams);
    if (!params.get('symbol')) return;
    params.delete('symbol');
    setSearchParams(params, { replace: true });
  }

  function pickStock(stock, source = '') {
    const next = String(stock?.symbol || '').trim().toUpperCase();
    if (!next) return;
    setFromLiquidity(source === 'liquidity');
    setSelectedNews([]);
    setNewsLoaded(false);
    urlSymbol.current = next;
    setSelected(stock);
    setSearchInput(stock.symbol || stock.name);
    setSearchOpen(false);
    setSearchResults([]);
    const params = new URLSearchParams(searchParams);
    if (params.get('symbol') === next) return;
    params.set('symbol', next);
    setSearchParams(params);
  }

  function closeStock() {
    scrollAfterClose.current = fromLiquidity ? liquidityRef : browseRef;
    if (fromLiquidity) setShowLiquidity(true);
    setFromLiquidity(false);
    urlSymbol.current = '';
    setSelected(null);
    setSearchInput('');
    setSearchOpen(false);
    clearSymbolParam();
  }

  function focusSection(ref) {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function chooseTimeframe(id) {
    setTimeframe(id);
    focusSection(selected ? selectedPanelRef : conditionRef);
  }

  function leaveOpenName(ref) {
    scrollAfterClose.current = ref;
    if (!selected) {
      focusSection(ref);
      return;
    }
    urlSymbol.current = '';
    setFromLiquidity(false);
    setSelected(null);
    setSearchInput('');
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
    setFilterSector('all');
    setFilterCap('all');
    setFilterListing('all');
    setShowLiquidity(true);
    setLiquidityListKey((key) => key + 1);
    setFromLiquidity(false);
    setSearchOpen(false);
    scrollAfterClose.current = liquidityRef;
    if (selected) {
      urlSymbol.current = '';
      setSelected(null);
      setSearchInput('');
      clearSymbolParam();
      return;
    }
    window.setTimeout(() => {
      liquidityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  const tfDays = useMemo(() => {
    if (timeframe === 'custom') {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const safeEnd = end > start ? end : new Date(start.getTime() + 24 * 3600 * 1000);
      return Math.max(1, Math.round((safeEnd - start) / (24 * 3600 * 1000)));
    }
    return NGX_TIMEFRAMES.find((t) => t.id === timeframe)?.days || 7;
  }, [timeframe, customStart, customEnd]);
  const historyOptions = useMemo(
    () => (timeframe === 'custom'
      ? { from: customStart, to: customEnd }
      : { days: tfDays }),
    [timeframe, customStart, customEnd, tfDays],
  );
  const historyRequestKey = JSON.stringify(historyOptions);
  const activeSelectedKey = selected ? `${selected.symbol}:${historyRequestKey}` : '';
  const selectedSeries = useMemo(
    () => (selectedHistoryKey === activeSelectedKey ? selectedHistorySeries : []),
    [selectedHistoryKey, activeSelectedKey, selectedHistorySeries],
  );
  const compositeIndex = useMemo(
    () => (indexHistoryKey === historyRequestKey ? indexHistorySeries : []),
    [indexHistoryKey, historyRequestKey, indexHistorySeries],
  );

  useEffect(() => {
    let cancelled = false;
    setIndexLoading(true);
    fetchNgxIndexHistory('ASI', historyOptions)
      .then((payload) => {
        if (cancelled) return;
        setIndexHistorySeries((payload.series || []).map((point) => ({
          date: point.date,
          marketIndex: point.value,
        })));
        setIndexHistoryMeta(payload.metadata || null);
        setIndexHistoryKey(historyRequestKey);
      })
      .catch(() => {
        if (!cancelled) {
          setIndexHistorySeries([]);
          setIndexHistoryMeta(null);
          setIndexHistoryKey(historyRequestKey);
        }
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyOptions, historyRequestKey]);

  useEffect(() => {
    if (!selected?.symbol) {
      setOutlook(null);
      setOutlookError('');
      setOutlookLoading(false);
      return undefined;
    }
    let cancelled = false;
    setOutlookLoading(true);
    setOutlookError('');
    fetchNgxOutlook(selected.symbol, outlookYears)
      .then((payload) => {
        if (cancelled) return;
        setOutlook(payload);
        setOutlookLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setOutlook(null);
        setOutlookError(err.message || 'Outlook unavailable');
        setOutlookLoading(false);
      });
    return () => { cancelled = true; };
  }, [selected?.symbol, outlookYears]);

  useEffect(() => {
    if (!selected) return undefined;
    let cancelled = false;
    fetchNgxHistory(selected.symbol, historyOptions)
      .then((payload) => {
        if (cancelled) return;
        setSelectedHistorySeries(payload.series || []);
        setSelectedHistoryMeta(payload.metadata || null);
        setSelectedHistoryKey(`${selected.symbol}:${historyRequestKey}`);
        setHistoryError(payload.warning || '');
      })
      .catch((requestError) => {
        if (!cancelled) {
          setSelectedHistorySeries([]);
          setSelectedHistoryMeta(null);
          setSelectedHistoryKey(`${selected.symbol}:${historyRequestKey}`);
          setHistoryError(requestError.message || 'Verified NGX history is unavailable.');
        }
      });
    return () => { cancelled = true; };
  }, [selected, historyOptions, historyRequestKey]);

  const tfMeta = NGX_TIMEFRAMES.find((item) => item.id === timeframe) || NGX_TIMEFRAMES[1];
  const useHistoryBreadth = timeframe !== '1d';

  useEffect(() => {
    if (!useHistoryBreadth || allStocks.length === 0) {
      setRangeBreadth({ key: historyRequestKey, rows: [] });
      return undefined;
    }
    let cancelled = false;
    const sample = [...allStocks]
      .filter((stock) => stock.symbol && (stock.market_cap || 0) > 0)
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 8);
    Promise.all(sample.map(async (stock) => {
      try {
        const payload = await fetchNgxHistory(stock.symbol, historyOptions);
        return { symbol: stock.symbol, change: seriesReturn(payload.series, 'close') };
      } catch {
        return { symbol: stock.symbol, change: null };
      }
    })).then((rows) => {
      if (!cancelled) setRangeBreadth({ key: historyRequestKey, rows });
    });
    return () => {
      cancelled = true;
    };
  }, [allStocks, historyOptions, historyRequestKey, useHistoryBreadth]);

  const listedCondition = useMemo(() => {
    const historyReady = rangeBreadth.key === historyRequestKey;
    const historyRows = historyReady
      ? rangeBreadth.rows.filter((row) => row.change != null)
      : [];
    const snapshotRows = allStocks
      .map((stock) => ({ symbol: stock.symbol, change: sessionChange(stock) }))
      .filter((row) => row.change != null);
    const rows = useHistoryBreadth ? historyRows : snapshotRows;
    const advances = rows.filter((row) => row.change > 0).length;
    const declines = rows.filter((row) => row.change < 0).length;
    const officialAsi = Number(overview?.pct_change);
    const asiFromHistory = seriesReturn(compositeIndex, 'marketIndex');
    const rangeReady = timeframe === '1d' || indexHistoryKey === historyRequestKey;
    const avgChange = timeframe === '1d'
      ? (Number.isFinite(officialAsi) ? officialAsi : null)
      : (rangeReady ? asiFromHistory : null);
    return {
      advances,
      declines,
      avgChange,
      condition: conditionFromAvg(avgChange, {
        bullThreshold: 0.3,
        bearThreshold: -0.3,
        advances,
        declines,
        requireBreadth: true,
      }),
      sampleSize: rows.length,
      useAsiHistory: timeframe !== '1d' && asiFromHistory != null,
      breadthFromHistory: useHistoryBreadth && historyRows.length > 0,
      rangeReady,
    };
  }, [allStocks, overview, compositeIndex, timeframe, rangeBreadth, historyRequestKey, useHistoryBreadth, indexHistoryKey]);

  const topMovers = useMemo(() => {
    if (listedCondition.breadthFromHistory) {
      const bySymbol = new Map(allStocks.map((s) => [s.symbol, s]));
      return rangeBreadth.rows
        .filter((row) => row.change != null)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 8)
        .map((row) => ({ ...bySymbol.get(row.symbol), symbol: row.symbol, _chg: row.change }));
    }
    return allStocks
      .map((s) => ({ ...s, _chg: sessionChange(s) }))
      .filter((s) => s._chg != null && s._chg !== 0)
      .sort((a, b) => Math.abs(b._chg) - Math.abs(a._chg))
      .slice(0, 10);
  }, [allStocks, listedCondition.breadthFromHistory, rangeBreadth.rows]);

  const topByMarketCap = useMemo(() =>
    [...allStocks]
      .filter((s) => s.market_cap > 0)
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 15)
      .map((s) => ({
        symbol: s.symbol, name: s.name,
        marketCap: s.market_cap, marketCapLabel: formatCap(s.market_cap), price: s.current_price, chg: stockChange(s),
      })),
  [allStocks]);

  const sectorBreakdown = useMemo(() => {
    const map = new Map();
    allStocks.forEach((s) => {
      const sec = s.sector || 'Other';
      if (!map.has(sec)) map.set(sec, { sector: sec, count: 0, totalCap: 0, changes: [] });
      const entry = map.get(sec);
      entry.count += 1;
      entry.totalCap += s.market_cap || 0;
      const c = stockChange(s);
      if (c !== 0) entry.changes.push(c);
    });
    return [...map.values()]
      .sort((a, b) => b.totalCap - a.totalCap)
      .map((s) => ({
        ...s,
        capLabel: formatCap(s.totalCap),
        avgChange: s.changes.length ? +(s.changes.reduce((a, v) => a + v, 0) / s.changes.length).toFixed(2) : 0,
      }));
  }, [allStocks]);

  const conditionData = useMemo(() =>
    sectorBreakdown.filter((s) => s.count >= 2).map((s) => ({
      sector: s.sector.length > 14 ? s.sector.slice(0, 12) + '…' : s.sector,
      avgChange: s.avgChange,
      stocks: s.count,
    })),
  [sectorBreakdown]);

  const breadthData = useMemo(() => {
    const moves = allStocks.map((s) => sessionChange(s));
    const adv = moves.filter((change) => change > 0).length;
    const dec = moves.filter((change) => change < 0).length;
    const unch = moves.filter((change) => change === 0).length;
    return [
      { label: 'Advancing', value: adv, fill: '#22c55e' },
      { label: 'Declining', value: dec, fill: '#ef4444' },
      { label: 'Unchanged', value: unch, fill: '#94a3b8' },
    ];
  }, [allStocks]);

  const breadthRows = useMemo(() => {
    const rows = allStocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector || '—',
      price: s.current_price ?? null,
      changePct: sessionChange(s),
      raw: s,
    }));
    if (breadthView === 'advancing') return rows.filter((r) => r.changePct > 0);
    if (breadthView === 'declining') return rows.filter((r) => r.changePct < 0);
    if (breadthView === 'unchanged') return rows.filter((r) => r.changePct === 0);
    return rows;
  }, [allStocks, breadthView]);

  const performanceData = useMemo(() =>
    topByMarketCap.map((s) => ({ symbol: s.symbol, change: +s.chg.toFixed(2) })),
  [topByMarketCap]);

  const sectorList = useMemo(() => {
    const set = new Set();
    allStocks.forEach((s) => { if (s.sector) set.add(s.sector); });
    return [...set].sort();
  }, [allStocks]);

  const filteredStocks = useMemo(() => {
    let list = allStocks;

    if (filterSector !== 'all') {
      list = list.filter((s) => s.sector === filterSector);
    }

    if (filterCap === 'large') list = list.filter((s) => (s.market_cap || 0) >= 1e12);
    else if (filterCap === 'mid') list = list.filter((s) => (s.market_cap || 0) >= 100e9 && (s.market_cap || 0) < 1e12);
    else if (filterCap === 'small') list = list.filter((s) => (s.market_cap || 0) < 100e9);

    if (filterListing === 'unknown') list = list.filter((s) => !s.listing_method);
    else if (filterListing !== 'all') list = list.filter((s) => s.listing_method === filterListing);

    const dir = sortBy.startsWith('-') ? -1 : 1;
    const key = sortBy.replace('-', '');
    list = [...list].sort((a, b) => {
      if (key === 'market_cap') return dir * ((b.market_cap || 0) - (a.market_cap || 0));
      if (key === 'price') return dir * ((b.current_price || 0) - (a.current_price || 0));
      if (key === 'change') return dir * (Math.abs(stockChange(b)) - Math.abs(stockChange(a)));
      if (key === 'symbol') return dir * (a.symbol || '').localeCompare(b.symbol || '');
      if (key === 'volume') return dir * ((b.volume || 0) - (a.volume || 0));
      return 0;
    });

    return list;
  }, [allStocks, filterSector, filterCap, filterListing, sortBy]);

  const selectedChange = useMemo(() => {
    if (!selectedSeries.length) return { pct: 0, isPositive: true };
    const first = selectedSeries[0]?.close || 0;
    const last = selectedSeries.at(-1)?.close || 0;
    const pct = first ? ((last - first) / first) * 100 : 0;
    return { pct, isPositive: pct >= 0 };
  }, [selectedSeries]);

  const marketOpen = overview?.is_open === true;
  const marketStatus = overview?.market_status || (marketOpen ? 'OPEN' : 'CLOSED');

  const selectedPeers = useMemo(() => {
    if (!selected || !selected.sector) return [];
    return allStocks
      .filter((s) => s.sector === selected.sector)
      .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
      .slice(0, 10)
      .map((s) => ({
        symbol: s.symbol,
        price: s.current_price ?? null,
        change: +stockChange(s).toFixed(2),
        capLabel: formatCap(s.market_cap),
        isCurrent: s.symbol === selected.symbol,
      }));
  }, [selected, allStocks]);

  const marketOpenKnown = overview?.is_open === true ? true : overview?.is_open === false ? false : null;

  const liquidityBoardAll = useMemo(() => scoreLiquidityBoard(
    allStocks.map((stock) => ({
      venue: 'ngx',
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      volume: stock.volume,
      sharesOutstanding: stock.shares_outstanding,
      floatShares: stock.float_shares,
      price: stock.current_price,
      marketCap: stock.market_cap,
      bid: stock.bid,
      ask: stock.ask,
      listingStatus: stock.listing_status,
      corporateAction: stock.corporate_action,
      corporateActionNote: stock.corporate_action_note,
    })),
    'ngx',
    { marketOpen: marketOpenKnown },
  ), [allStocks, marketOpenKnown]);

  const liquidityBySymbol = useMemo(() => {
    const map = new Map();
    liquidityBoardAll.forEach((row) => map.set(row.symbol, row));
    return map;
  }, [liquidityBoardAll]);

  const historyAverages = useMemo(() => {
    if (!selected || !selectedHistoryKey.startsWith(`${selected.symbol}:`)) return null;
    return sessionAverages(selectedHistorySeries);
  }, [selected, selectedHistoryKey, selectedHistorySeries]);

  const liquidityReading = useMemo(() => {
    if (!selected) return null;
    return assessLiquidity({
      venue: 'ngx',
      symbol: selected.symbol,
      volume: company?.volume ?? selected.volume,
      sharesOutstanding: company?.sharesOutstanding ?? selected.shares_outstanding,
      floatShares: selected.float_shares,
      price: company?.price ?? selected.current_price,
      marketCap: company?.marketCap ?? selected.market_cap,
      bid: selected.bid,
      ask: selected.ask,
      listingStatus: selected.listing_status,
      corporateAction: selected.corporate_action,
      corporateActionNote: selected.corporate_action_note,
      averageVolume: historyAverages?.averageVolume,
      averageValue: historyAverages?.averageValue,
      averageSessions: historyAverages?.averageSessions,
    }, {
      venue: 'ngx',
      peerTurnovers: liquidityBoardAll.map((row) => row.turnover),
      peerCaps: liquidityBoardAll.map((row) => row.marketCap),
      marketOpen: marketOpenKnown,
    });
  }, [selected, company, liquidityBoardAll, historyAverages, marketOpenKnown]);

  return (
    <main className="layout">
      {/* ── Controls ── */}
      <section className="panel controlsV2" data-guide="ngx-board">
        <div className="controlsTopRow">
          <div>
            <h2 className="workspaceTitle">
              NGX{' '}
              <HelpHint
                label="What is the NGX page?"
                text="The Nigerian Exchange. Quotes and history come from NGX Pulse. NGX orders go through a licensed dealing member — see Learn."
              />
            </h2>
            <p className="subtle">Search a listing, plot official naira history when Pulse returns it, and overlay tested indicators.</p>
          </div>
          <div className="controlsActions">
            <span className={`tag ${marketOpen ? '' : 'muted'}`}>
              {marketOpen ? '● Market Open' : marketStatus === 'NSE_PREOPEN' ? '◐ Pre-Open' : '○ Market Closed'}
            </span>
            <button
              type="button"
              className={showLiquidity && !selected ? 'liquidityBtn isActive' : 'liquidityBtn'}
              onClick={openLiquidity}
            >
              Liquidity
            </button>
          </div>
        </div>

        <div className="searchTimeRow">
          <div className="searchWrap" ref={searchRef}>
            <input
              className="searchInput"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setSearchOpen(true); doSearch(e.target.value); }}
              onFocus={() => { setSearchOpen(true); if (searchInput) doSearch(searchInput); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); }}
              placeholder="Search NGX — DANGCEM, GTCO, ZENITHBANK..."
            />
            {searchInput && (
              <button type="button" className="searchClear" onClick={() => { setSearchOpen(false); closeStock(); setSearchInput(''); }}>✕</button>
            )}
            {showDropdown && (
              <ul className="suggestionList">
                {searching && mergedSearchResults.length === 0 && <li className="sugStatus">Searching NGX...</li>}
                {!searching && mergedSearchResults.length === 0 && <li className="sugStatus">No results for &quot;{searchInput.trim()}&quot;</li>}
                {mergedSearchResults.map((s) => {
                  const chg = stockChange(s);
                  const up = chg >= 0;
                  const period = changeLabel(s);
                  return (
                    <li key={s.symbol}>
                      <button type="button" className="suggestionItem" onClick={() => pickStock(s)}>
                        <div className="sugLeft"><div>
                          <span className="sugSymbol">{s.symbol}</span>
                          <span className="sugName">{s.name}{s.sector ? ` · ${s.sector}` : ''}</span>
                        </div></div>
                        <span className="sugPrice monoNum">{s.current_price != null ? formatNgn(s.current_price) : ''}</span>
                        {chg !== 0
                          ? <span className={`sugChange ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)}%{period !== 'daily' ? ` (${period})` : ''}</span>
                          : <span className="sugBadge">NGX</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="timeframeBar">
            {NGX_TIMEFRAMES.map((item) => (
              <button key={item.id} type="button" className={item.id === timeframe ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseTimeframe(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {timeframe === 'custom' && (
          <div className="customRangeRow">
            <label>From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label>
            <label>To<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label>
          </div>
        )}

        {error && <p className="warn" style={{ marginTop: '0.5rem' }}>{error}</p>}
      </section>

      <section className="panel topNewsPanel">
        <div className="sectionHead">
          <div>
            <h3>Top Headlines</h3>
            <p className="subtle">News tied to {topHeadlineLabel}, placed up front so newer investors can see what may be shaping the market before reading charts.</p>
          </div>
          <span className="tag muted">{selected ? 'Selected stock' : 'Market context'}</span>
        </div>
        {topHeadlineRows.length > 0 ? (
          <div className="newsGrid newsGrid--top">
            {topHeadlineRows.map((n, idx) => (
              <a key={idx} href={n.link} target="_blank" rel="noopener noreferrer" className="newsCard newsCard--top">
                {n.thumbnail && <img src={n.thumbnail} alt="" className="newsThumb" />}
                <div className="newsBody">
                  <strong>{n.title}</strong>
                  <span>{n.publisher || 'Market source'}{n.date ? ` · ${new Date(n.date).toLocaleDateString()}` : ''}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="subtle">No headlines available right now.</p>
        )}
      </section>

      {(overview || allStocks.length > 0) && (
        <section className="panel conditionPanel">
          <ConditionBoard
            hint="A board for the Nigerian Exchange. The reading uses how many listed names closed higher versus lower, and the All-Share Index change when that figure is in the feed. It is a snapshot, not a forecast."
            rangeLabel={tfMeta.label}
            sampleLine={
              listedCondition.breadthFromHistory
                ? `ASI over ${tfMeta.label}. Up vs down is eight large NGX names over that same range — not every listing.`
                : useHistoryBreadth
                  ? `Loading first-to-last history for eight large NGX names over ${tfMeta.label}…`
                  : `ASI and up vs down for this session (${listedCondition.sampleSize} listed names with a figure).`
            }
            summary={{
              condition: listedCondition.condition,
              avgChange: listedCondition.avgChange,
              advances: listedCondition.advances,
              declines: listedCondition.declines,
            }}
            readingDetail={
              !listedCondition.rangeReady
                ? `Loading All-Share history for ${tfMeta.label}…`
                : listedCondition.condition === 'Bullish'
                  ? `ASI is up over ${tfMeta.label}, and more of the counted names closed higher.`
                  : listedCondition.condition === 'Bearish'
                    ? `ASI is down over ${tfMeta.label}, and more of the counted names closed lower.`
                    : `Over ${tfMeta.label}, ASI’s move is small or the counted names are split.`
            }
            avgLabel="ASI change"
            avgDetail={
              listedCondition.useAsiHistory
                ? `All-Share Index from the first bar to the last bar of ${tfMeta.label}.`
                : timeframe === '1d'
                  ? 'Official All-Share Index change for this session.'
                  : indexLoading || !listedCondition.rangeReady
                    ? `Loading ASI history for ${tfMeta.label}…`
                    : `ASI history for ${tfMeta.label} did not load.`
            }
            extras={[
              {
                label: overview?.asi != null ? 'ASI' : 'ASI unavailable',
                value: overview?.asi != null
                  ? Number(overview.asi).toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : '—',
                detail: 'All-Share Index level.',
              },
              {
                label: 'Market cap',
                value: formatCap(overview?.market_cap),
                detail: 'Combined size of listed names.',
              },
              {
                label: 'Volume',
                value: overview?.volume
                  ? Number(overview.volume).toLocaleString()
                  : (marketOpen ? '0' : 'Pre-market'),
                detail: 'Shares that changed hands this session.',
              },
            ]}
            names={topMovers.slice(0, 8).map((stock) => ({
              id: stock.symbol,
              label: stock.symbol,
              changePct: stock._chg,
            }))}
            onPick={(symbol) => {
              const stock = allStocks.find((entry) => entry.symbol === symbol);
              if (stock) pickStock(stock);
            }}
          />
        </section>
      )}

      <section className="panel" ref={conditionRef}>
          <div className="sectionHead">
            <h3>Official NGX All-Share Index History</h3>
            <span className="tag muted">
              {indexHistoryMeta?.rangeStart && indexHistoryMeta?.rangeEnd
                ? `${indexHistoryMeta.rangeStart} to ${indexHistoryMeta.rangeEnd}`
                : 'Verified history'}
              {indexHistoryMeta?.stale ? ' · cached' : ''}
            </span>
          </div>
          {compositeIndex.length > 0 ? <div className="chartWrap" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={compositeIndex}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={24} tickFormatter={formatDateTick} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="marketIndex" stroke="#2563eb" dot={false} strokeWidth={2} name="NGX Composite" />
              </LineChart>
            </ResponsiveContainer>
          </div> : (
            <p className="subtle">
              {indexLoading
                ? 'Loading All-Share Index history…'
                : 'ASI history is not available for this range. The snapshot above is still live.'}
            </p>
          )}
      </section>

      {/* ── Sector Performance + Breadth ── */}
      {conditionData.length > 0 && (
        <section className="panel" ref={breadthRef}>
          <div className="sectionHead">
            <h3>Sector Performance &amp; Breadth</h3>
            <span className="tag muted">Current-session snapshot</span>
          </div>
          <div className="splitBoard">
            <div className="chartWrap splitBoardChart" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={conditionData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="sector" width={110} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip formatter={(v) => [`${v >= 0 ? '+' : ''}${v}%`, 'Avg change']} />
                  <Bar dataKey="avgChange" name="Avg change" radius={[0, 4, 4, 0]}>
                    {conditionData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.avgChange >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="breadthSide">
              <h4 className="breadthPanelTitle">Market Breadth</h4>
              <div className="chartWrap chartWrap--pie" style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie data={breadthData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} label={false}>
                      {breadthData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} stocks`, name]} />
                    <Legend verticalAlign="bottom" height={30} iconSize={10} formatter={(value) => <span style={{ fontSize: '0.72rem', color: '#3a5a7e' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="breadthQuickGrid" style={{ marginTop: '0.3rem' }}>
                <button type="button" className={breadthView === 'advancing' ? 'breadthQuickCard breadthQuickCard--up active' : 'breadthQuickCard breadthQuickCard--up'} onClick={() => chooseBreadth('advancing')}>
                  <div className="breadthQuickLabel">Advancing</div>
                  <div className="monoNum breadthQuickValue">{breadthData[0].value}</div>
                </button>
                <button type="button" className={breadthView === 'declining' ? 'breadthQuickCard breadthQuickCard--down active' : 'breadthQuickCard breadthQuickCard--down'} onClick={() => chooseBreadth('declining')}>
                  <div className="breadthQuickLabel">Declining</div>
                  <div className="monoNum breadthQuickValue">{breadthData[1].value}</div>
                </button>
                <button type="button" className={breadthView === 'unchanged' ? 'breadthQuickCard breadthQuickCard--flat active' : 'breadthQuickCard breadthQuickCard--flat'} onClick={() => chooseBreadth('unchanged')}>
                  <div className="breadthQuickLabel">Unchanged</div>
                  <div className="monoNum breadthQuickValue">{breadthData[2].value}</div>
                </button>
              </div>
              <button type="button" className="breadthShowAll" onClick={() => chooseBreadth('all')}>Show All</button>
            </div>
          </div>
          <div className="ngxTable" style={{ marginTop: '0.8rem', maxHeight: 260, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Symbol</th><th>Name</th><th>Sector</th><th>Price</th><th>Change</th></tr></thead>
              <tbody>
                {breadthRows.map((r) => {
                  const up = r.changePct > 0;
                  const down = r.changePct < 0;
                  return (
                    <tr
                      key={r.symbol}
                      className="ngxRow"
                      tabIndex={0}
                      onClick={() => pickStock(r.raw)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') pickStock(r.raw);
                      }}
                    >
                      <td className="monoNum" style={{ fontWeight: 700 }}>{r.symbol}</td>
                      <td>{r.name}</td>
                      <td>{r.sector}</td>
                      <td className="monoNum">{formatNgnOrDash(r.price)}</td>
                      <td>
                        {Number.isFinite(r.changePct) ? (
                          <span className={`pctBadge ${up ? 'up' : down ? 'down' : ''}`}>
                            {up ? '▲' : down ? '▼' : '•'} {up ? '+' : ''}{r.changePct.toFixed(2)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Top Movers ── */}
      {topMovers.length > 0 && (
        <section className="panel">
          <div className="sectionHead">
            <h3>Top Movers</h3>
            <span className="tag muted">Daily snapshot change</span>
          </div>
          <div className="moverGrid">
            {topMovers.map((s) => {
              const chg = s._chg;
              const up = chg >= 0;
              return (
                <button key={s.symbol} className={`moverCard ${up ? 'cardUp' : 'cardDown'}`} type="button" onClick={() => pickStock(s)}>
                  <span>{s.symbol}</span>
                  <span className="moverPrice">{formatNgnOrDash(s.current_price)}</span>
                  <strong className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)}%</strong>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Stock Visualizer with MarketChart (same as Stocks/Crypto) ── */}
      {selected && (
        <section className="panel" ref={selectedPanelRef}>
          <div className="sectionHead">
            <h3>{selected.symbol}</h3>
            <div className="vizPriceRow">
              <span className={`priceTag ${selectedChange.isPositive ? 'up' : 'down'}`}>{formatNgnOrDash(selected.current_price)}</span>
              {selectedSeries.length >= 2 ? (
                <span className={`pctBadge ${selectedChange.isPositive ? 'up' : 'down'}`}>
                  {selectedChange.isPositive ? '▲' : '▼'} {selectedChange.isPositive ? '+' : ''}{selectedChange.pct.toFixed(2)}%
                </span>
              ) : <span className="tag muted">Snapshot quote</span>}
              {liquidityReading?.tone && liquidityReading.tone !== 'unknown' && (
                <span className={`tag liquidityTag liquidityTag--${liquidityReading.tone}`}>{liquidityReading.label}</span>
              )}
              <ListingTag stock={selected} />
              <button type="button" className="liquidityBtn" onClick={openLiquidity}>Liquidity</button>
              <button type="button" className={fromLiquidity ? 'liquidityBack' : 'expandBtn'} onClick={closeStock}>
                {fromLiquidity ? '← Back to liquidity' : '← Back'}
              </button>
            </div>
          </div>
          <p className="subtle" style={{ marginTop: '0.45rem' }}>{listingExplain(selected)}</p>
          <div className="sectionHead" style={{ marginTop: '0.5rem' }}>
            <div>
              <h4>Analysis Horizon</h4>
              <p className="subtle">Switch the NGX timeframe from inside the selected stock view.</p>
            </div>
          </div>
          <div className="timeframeBar">
            {NGX_TIMEFRAMES.map((item) => (
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

          {historyError && selectedSeries.length > 0 && (
            <p className="subtle" style={{ marginBottom: '0.65rem' }}>{historyError}</p>
          )}
          {selectedSeries.length > 0 ? (
            <MarketChart
              title={`Official NGX history: ${selected.symbol}`}
              data={selectedSeries}
              isPositive={selectedChange.isPositive}
              currencySymbol="₦"
              changePct={selectedChange.pct}
              provenance={{
                source: selectedHistoryMeta?.provider || 'ngx-pulse',
                rangeStart: selectedHistoryMeta?.rangeStart,
                rangeEnd: selectedHistoryMeta?.rangeEnd,
                stale: Boolean(selectedHistoryMeta?.stale),
                fallbackUsed: Boolean(selectedHistoryMeta?.fallbackUsed),
              }}
            />
          ) : (
            <div className="researchEmptyState">
              <strong>Verified history unavailable</strong>
              <p>{historyError || 'No official historical observations were returned for this range.'} The current quote and previous close below are real snapshot values; no chart has been estimated.</p>
            </div>
          )}

          <div className="metricRow">
            <article className="metricCard"><span>Previous Close</span><strong className="monoNum">{selected.previous_close != null ? formatNgn(selected.previous_close) : '—'}</strong></article>
            {selected.pct_change_7d != null && (
              <article className="metricCard"><span>7-Day Change</span>
                <strong className={`pctBadge ${selected.pct_change_7d >= 0 ? 'up' : 'down'}`}>{selected.pct_change_7d >= 0 ? '▲' : '▼'} {selected.pct_change_7d >= 0 ? '+' : ''}{selected.pct_change_7d.toFixed(2)}%</strong>
              </article>
            )}
            <article className="metricCard"><span>Volume</span><strong className="monoNum">{selected.volume ? Number(selected.volume).toLocaleString() : 'Pre-market'}</strong></article>
            {selected.market_cap != null && <article className="metricCard"><span>Market Cap</span><strong className="monoNum">{formatCap(selected.market_cap)}</strong></article>}
            {selected.pe_ratio != null && <article className="metricCard"><span>P/E Ratio</span><strong className="monoNum">{selected.pe_ratio}</strong></article>}
            {selected.shares_outstanding != null && <article className="metricCard"><span>Shares Outstanding</span><strong className="monoNum">{formatShareCount(selected.shares_outstanding)}</strong></article>}
          </div>

          <div className="tickerOutlook">
            <LiquidityFlag reading={liquidityReading} name={selected.symbol} />
            <OutlookPanel
              title={`${selected.symbol} over the next ${outlookYears} year${outlookYears === 1 ? '' : 's'}`}
              hint="Weaker, typical, and stronger are three pictures from this listing’s own daily prices. The year buttons are how long you might hold it. They do not change the chart."
              years={outlookYears}
              onYears={setOutlookYears}
              data={outlook}
              error={outlookError}
              loading={outlookLoading}
              formatPrice={(n) => formatNgn(n)}
            />
            <p className="subtle outlookPageLink">
              <Link to={`/forecast?market=ngx&symbol=${encodeURIComponent(selected.symbol)}&years=${outlookYears}`}>Open this range on Forecast</Link>
              {' '}to pick another NGX name.
            </p>
          </div>

          <div className="stockProfile">
            <div className="sectionHead">
              <div>
                <h4>Company snapshot</h4>
                <p className="subtle">NGX Pulse figures for this listing. Missing values stay blank on purpose. This is not a buy or sell recommendation.</p>
              </div>
            </div>
            {companyLoading && <p className="subtle">Loading company details…</p>}
            {!companyLoading && !company && (
              <p className="subtle">Company details did not load from NGX Pulse. The quote and chart above are still from the named source.</p>
            )}
            {company && (
              <>
                <p className="stockProfileMeta">
                  {[company.name, prettySector(company.sector), company.board].filter(Boolean).join(' · ')}
                  {company.tradeDate ? ` · Priced ${formatTradeDate(company.tradeDate)}` : ''}
                </p>
                <div className="stockFactGrid">
                  {[
                    { label: 'Price', value: Number.isFinite(company.price) ? formatNgn(company.price) : '—' },
                    { label: 'Previous close', value: Number.isFinite(company.previousClose) ? formatNgn(company.previousClose) : '—' },
                    { label: `Day change${company.changePctDerived ? ' (derived)' : ''}`, value: formatPct(company.changePct, { sign: true }) },
                    { label: '7-day change', value: formatPct(company.pctChange7d, { sign: true }) },
                    { label: 'Volume', value: Number.isFinite(company.volume) ? company.volume.toLocaleString() : '—' },
                    { label: 'Market cap', value: company.marketCap ? formatCap(company.marketCap) : '—' },
                    { label: 'Shares outstanding', value: formatShareCount(company.sharesOutstanding) },
                    { label: 'P/E ratio', value: Number.isFinite(company.peRatio) ? company.peRatio.toFixed(2) : '—' },
                    { label: Number.isFinite(company.eps) ? 'EPS' : 'EPS (implied by P/E)', value: Number.isFinite(company.eps) ? formatNgn(company.eps) : (Number.isFinite(company.epsImplied) ? formatNgn(company.epsImplied) : '—') },
                    { label: 'Dividend per share (latest)', value: Number.isFinite(company.earnings?.latestPerShare) ? formatNgn(company.earnings.latestPerShare) : '—' },
                    { label: 'Dividend yield (12 months)', value: formatPct(company.earnings?.dividendYieldPct) },
                    { label: 'Listing board', value: company.board || '—' },
                    { label: 'How it listed', value: listingLabel(selected.listing_method) },
                  ].map((fact) => (
                    <article key={fact.label} className="metricCard">
                      <span>{fact.label}</span>
                      <strong className="monoNum">{fact.value}</strong>
                    </article>
                  ))}
                </div>
                {company.earnings?.fundamentalsPlanLimited && !Number.isFinite(company.peRatio) && (
                  <p className="subtle" style={{ marginTop: '0.6rem' }}>
                    P/E and EPS are blank because this NGX Pulse key does not include company earnings. Nothing has been estimated to fill them.
                  </p>
                )}
              </>
            )}
          </div>

          {company && (
            <>
              <div className="sectionHead" style={{ marginTop: '1rem' }}>
                <div>
                  <h4>
                    Earnings &amp; dividends
                    <HelpHint text="NGX Pulse gives cash dividends per share for Nigerian listings. The 12-month total and the yield are added up here from these rows and the latest price. P/E and EPS are the figures Pulse returns for this company." />
                  </h4>
                  <p className="subtle">
                    Cash dividends NGX Pulse holds for {company.symbol}
                    {company.earnings?.source ? ` (via ${company.earnings.source})` : ''}.
                    {company.earnings?.dividends?.length ? ' Totals below are computed in this app from those rows.' : ''}
                  </p>
                </div>
              </div>
              {company.earnings?.fundamentalsNote && (
                <p className="subtle" style={{ marginTop: 0 }}>{company.earnings.fundamentalsNote}</p>
              )}
              {company.earnings?.dividends?.length ? (
                <>
                  <div className="metricRow">
                    <article className="metricCard">
                      <span>Dividend (12 months)</span>
                      <strong className="monoNum">{Number.isFinite(company.earnings.trailingDividend) ? formatNgn(company.earnings.trailingDividend) : '—'}</strong>
                    </article>
                    <article className="metricCard">
                      <span>Yield on latest price</span>
                      <strong className="monoNum">{formatPct(company.earnings.dividendYieldPct)}</strong>
                    </article>
                    <article className="metricCard">
                      <span>Latest ex-dividend</span>
                      <strong className="monoNum">{formatTradeDate(company.earnings.latestExDate)}</strong>
                    </article>
                    <article className="metricCard">
                      <span>Payments on record</span>
                      <strong className="monoNum">{company.earnings.dividendCount}</strong>
                    </article>
                  </div>
                  <div className="ngxTable">
                    <table>
                      <thead>
                        <tr><th>Ex-dividend</th><th>Record date</th><th>Pay date</th><th>Per share</th></tr>
                      </thead>
                      <tbody>
                        {company.earnings.dividends.map((row) => (
                          <tr key={`${row.exDate}-${row.perShare}`}>
                            <td className="monoNum">{formatTradeDate(row.exDate)}</td>
                            <td className="monoNum">{row.recordDate ? formatTradeDate(row.recordDate) : '—'}</td>
                            <td className="monoNum">{row.payDate ? formatTradeDate(row.payDate) : '—'}</td>
                            <td className="monoNum">{formatNgn(row.perShare)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {company.earnings.sourceUrl && (
                    <p className="subtle" style={{ marginTop: '0.5rem' }}>
                      Dividend records:{' '}
                      <a href={company.earnings.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {company.earnings.source || 'provider page'}
                      </a>
                    </p>
                  )}
                </>
              ) : (
                <div className="researchEmptyState">
                  <strong>No dividend records</strong>
                  <p>NGX Pulse returned no dividend history for {company.symbol}. Nothing has been estimated to fill the gap.</p>
                </div>
              )}
            </>
          )}

          {selectedPeers.length > 1 && (
            <>
              <div className="sectionHead" style={{ marginTop: '1rem' }}>
                <h4>Sector Comparison: {prettySector(selected.sector) || selected.sector}</h4>
              </div>
              <div className="vizTwoCol">
                <div className="chartWrap" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={selectedPeers} layout="vertical" margin={{ left: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `₦${v.toLocaleString()}`} />
                      <YAxis type="category" dataKey="symbol" width={65} tick={{ fontSize: 12, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => formatNgn(v)} />
                      <Bar dataKey="price" name="Price (₦)" radius={[0, 4, 4, 0]}>
                        {selectedPeers.map((entry, idx) => (
                          <Cell key={idx} fill={entry.isCurrent ? '#2563eb' : '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chartWrap" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={selectedPeers} layout="vertical" margin={{ left: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="symbol" width={65} tick={{ fontSize: 12, fontWeight: 700 }} />
                      <Tooltip formatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                      <Bar dataKey="change" name="Change %" radius={[0, 4, 4, 0]}>
                        {selectedPeers.map((entry, idx) => (
                          <Cell key={idx} fill={entry.isCurrent ? '#2563eb' : (entry.change >= 0 ? '#22c55e' : '#ef4444')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="moverGrid" style={{ marginTop: '0.7rem' }}>
                {selectedPeers.filter((p) => !p.isCurrent).slice(0, 6).map((p) => {
                  const up = p.change >= 0;
                  return (
                    <button key={p.symbol} className={`moverCard ${up ? 'cardUp' : 'cardDown'}`} type="button" onClick={() => {
                      const full = allStocks.find((s) => s.symbol === p.symbol);
                      if (full) pickStock(full);
                    }}>
                      <span>{p.symbol}</span>
                      <span className="moverPrice">{formatNgnOrDash(p.price)}</span>
                      <strong className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{p.change.toFixed(2)}%</strong>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}


      <section className="panel">
        <div className="sectionHead">
          <div>
            <h3>All Major News</h3>
            <p className="subtle">Expanded NGX-related coverage after the top headlines section above.</p>
          </div>
          <span className="tag muted">{selected ? 'Selected stock feed' : 'Market feed'}</span>
        </div>
        {newsLoaded && allMajorNewsRows.length > 0 ? (
          <div className="newsGrid">
            {allMajorNewsRows.map((n, idx) => (
              <a key={idx} href={n.link} target="_blank" rel="noopener noreferrer" className="newsCard">
                {n.thumbnail && <img src={n.thumbnail} alt="" className="newsThumb" />}
                <div className="newsBody">
                  <strong>{n.title}</strong>
                  <span>{n.publisher}{n.date ? ` · ${new Date(n.date).toLocaleDateString()}` : ''}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="subtle">{newsLoaded ? 'News not available right now.' : 'Loading broader NGX headlines...'}</p>
        )}
      </section>

      {/* ── Market Visualizer tabs ── */}
      {allStocks.length > 0 && (
        <section className="panel" ref={vizRef}>
          <div className="sectionHead">
            <div>
              <h3>NGX Snapshot Visualizer</h3>
              <p className="subtle">Performance bars use the provider&apos;s current daily change; they do not follow the historical chart timeframe.</p>
            </div>
            <div className="timeframeBar">
              <button type="button" className={vizTab === 'performance' ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseViz('performance')}>Performance</button>
              <button type="button" className={vizTab === 'marketcap' ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseViz('marketcap')}>Market Cap</button>
              <button type="button" className={vizTab === 'sectors' ? 'tfBtn active' : 'tfBtn'} onClick={() => chooseViz('sectors')}>Sectors</button>
            </div>
          </div>

          {vizTab === 'performance' && (
            <div className="chartWrap" style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={performanceData} layout="vertical" margin={{ left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="symbol" width={65} tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                  <Bar dataKey="change" name="Change %">
                    {performanceData.map((entry, idx) => <Cell key={idx} fill={entry.change >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {vizTab === 'marketcap' && (
            <div className="chartWrap" style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={topByMarketCap} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => v >= 1e12 ? `₦${(v/1e12).toFixed(1)}T` : `₦${(v/1e9).toFixed(0)}B`} />
                  <YAxis type="category" dataKey="symbol" width={75} tick={{ fontSize: 12, fontWeight: 700 }} />
                  <Tooltip formatter={(v) => formatCap(v)} />
                  <Bar dataKey="marketCap" name="Market Cap" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {vizTab === 'sectors' && (
            <div className="vizTwoCol">
              <div className="chartWrap chartWrap--pie" style={{ height: 340 }}>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
                    <Pie data={sectorBreakdown} dataKey="totalCap" nameKey="sector" cx="50%" cy="50%" outerRadius={86}
                      label={({ sector, percent }) => `${sector.slice(0, 12)} ${(percent * 100).toFixed(0)}%`} labelLine fontSize={10}>
                      {sectorBreakdown.map((_, idx) => <Cell key={idx} fill={SECTOR_COLORS[idx % SECTOR_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCap(v)} />
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
                        <td className="monoNum">{s.capLabel}</td>
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

      {/* ── All Equities table with filters ── */}
      {allStocks.length > 0 && !selected && showLiquidity && (
        <section className="panel" ref={liquidityRef}>
          <div className="sectionHead">
            <div>
              <h3>Liquidity</h3>
              <p className="subtle">Red means a normal ₦500,000 sale would be a big part of everything that traded — the “you can buy it, then struggle to sell” problem. NGX does not publish owners, so we never claim a named group holds 80%.</p>
            </div>
            <button type="button" className="expandBtn" onClick={() => setShowLiquidity(false)}>Close</button>
          </div>
          <LiquidityBoard
            listKey={liquidityListKey}
            rows={liquidityBoardAll}
            onPick={(row) => {
              const full = allStocks.find((stock) => stock.symbol === row.symbol);
              if (full) pickStock(full, 'liquidity');
            }}
          />
        </section>
      )}

      {allStocks.length > 0 && !selected && (
        <section className="panel" ref={browseRef}>
          <div className="sectionHead">
            <h3>All Listed Equities</h3>
            <span className="tag muted">{filteredStocks.length} of {allStocks.length} stocks</span>
          </div>

          <div className="ngxFilters">
            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">
                How listed
                <HelpHint text="Introduction: shares were already issued. IPO: shares were sold to the public at listing. Share exchange: a listed company was replaced under a scheme. Merger: companies combined and the result was listed. Not stated: the first listing does not say which. Later share sales do not count." />
              </label>
              <div className="timeframeBar" style={{ flexWrap: 'wrap' }}>
                <button type="button" className={filterListing === 'all' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterListing('all'); focusSection(browseRef); }}>All</button>
                <button type="button" className={filterListing === 'introduction' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterListing('introduction'); focusSection(browseRef); }}>Introduction</button>
                <button type="button" className={filterListing === 'ipo' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterListing('ipo'); focusSection(browseRef); }}>IPO</button>
                <button type="button" className={filterListing === 'scheme' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterListing('scheme'); focusSection(browseRef); }}>Share exchange</button>
                <button type="button" className={filterListing === 'merger' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterListing('merger'); focusSection(browseRef); }}>Merger</button>
                <button type="button" className={filterListing === 'unknown' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterListing('unknown'); focusSection(browseRef); }}>Not stated</button>
              </div>
            </div>

            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Sector</label>
              <div className="timeframeBar" style={{ flexWrap: 'wrap' }}>
                <button type="button" className={filterSector === 'all' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterSector('all'); focusSection(browseRef); }}>All</button>
                {sectorList.map((sec) => (
                  <button key={sec} type="button" className={filterSector === sec ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterSector(sec); focusSection(browseRef); }}>
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Market Cap</label>
              <div className="timeframeBar">
                <button type="button" className={filterCap === 'all' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterCap('all'); focusSection(browseRef); }}>All</button>
                <button type="button" className={filterCap === 'large' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterCap('large'); focusSection(browseRef); }}>Large (₦1T+)</button>
                <button type="button" className={filterCap === 'mid' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterCap('mid'); focusSection(browseRef); }}>Mid (₦100B–1T)</button>
                <button type="button" className={filterCap === 'small' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setFilterCap('small'); focusSection(browseRef); }}>Small (&lt;₦100B)</button>
              </div>
            </div>

            <div className="ngxFilterGroup">
              <label className="ngxFilterLabel">Sort by</label>
              <div className="timeframeBar">
                <button type="button" className={sortBy === 'market_cap' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setSortBy('market_cap'); focusSection(browseRef); }}>Market Cap</button>
                <button type="button" className={sortBy === 'price' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setSortBy('price'); focusSection(browseRef); }}>Price</button>
                <button type="button" className={sortBy === 'change' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setSortBy('change'); focusSection(browseRef); }}>Change</button>
                <button type="button" className={sortBy === 'volume' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setSortBy('volume'); focusSection(browseRef); }}>Volume</button>
                <button type="button" className={sortBy === 'symbol' ? 'tfBtn active' : 'tfBtn'} onClick={() => { setSortBy('symbol'); focusSection(browseRef); }}>A–Z</button>
              </div>
            </div>
          </div>

          <div className="ngxTable">
            <table>
              <thead>
                <tr><th>Symbol</th><th>Name</th><th>How listed</th><th>Selling</th><th>Price (₦)</th><th>Prev Close</th><th>Change</th><th>7d</th><th>Volume</th><th>Market Cap</th><th>Sector</th></tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => {
                  const chg = stockChange(s);
                  const up = chg >= 0;
                  const chg7d = s.pct_change_7d;
                  const up7d = (chg7d || 0) >= 0;
                  const reading = liquidityBySymbol.get(s.symbol);
                  return (
                    <tr
                      key={s.symbol}
                      className="ngxRow"
                      tabIndex={0}
                      onClick={() => pickStock(s)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') pickStock(s);
                      }}
                    >
                      <td className="monoNum" style={{ fontWeight: 700 }}>{s.symbol}</td>
                      <td>{s.name}</td>
                      <td><ListingTag stock={s} /></td>
                      <td>
                        {reading?.tone && reading.tone !== 'unknown' ? (
                          <span className={`tag liquidityTag liquidityTag--${reading.tone}`}>{reading.label}</span>
                        ) : '—'}
                      </td>
                      <td className="monoNum">{formatNgnOrDash(s.current_price)}</td>
                      <td className="monoNum">{s.previous_close != null ? formatNgn(s.previous_close) : '—'}</td>
                      <td>{chg !== 0 ? <span className={`pctBadge ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {up ? '+' : ''}{chg.toFixed(2)}%</span> : <span className="monoNum" style={{ color: '#8a9bb5' }}>0.00%</span>}</td>
                      <td>{chg7d != null && chg7d !== 0 ? <span className={`pctBadge ${up7d ? 'up' : 'down'}`}>{up7d ? '▲' : '▼'} {up7d ? '+' : ''}{chg7d.toFixed(2)}%</span> : <span className="monoNum" style={{ color: '#8a9bb5' }}>—</span>}</td>
                      <td className="monoNum">{s.volume ? Number(s.volume).toLocaleString() : '—'}</td>
                      <td className="monoNum">{s.market_cap ? formatCap(s.market_cap) : '—'}</td>
                      <td>{s.sector || '—'}</td>
                    </tr>
                  );
                })}
                {filteredStocks.length === 0 && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: '#8a9bb5', padding: '1.5rem' }}>No stocks match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!allStocks.length && (
        <section className="panel emptyState">
          <h3>{loadingNgx ? 'Loading NGX listings…' : 'NGX data temporarily unavailable'}</h3>
          <p>
            {loadingNgx
              ? 'Fetching the Nigerian Exchange list from NGX Pulse. This is usually a few seconds.'
              : 'The NGX provider may be rate-limited. The app retries automatically every 20 seconds.'}
          </p>
          <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="actionPrimary"
              onClick={() => setRetryTick((x) => x + 1)}
              disabled={loadingNgx}
            >
              {loadingNgx ? 'Retrying...' : 'Retry now'}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
