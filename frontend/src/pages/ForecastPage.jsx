import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchCryptoOutlook,
  fetchFx,
  fetchNgxOutlook,
  fetchStockOutlook,
  searchCrypto,
  searchNgx,
  searchStocks,
} from '../lib/api';
import { HelpHint } from '../components/HelpHint';
import { OutlookPanel } from '../components/OutlookPanel';
import { matchesSearch, searchRank } from '../lib/textSearch';

const STOCK_PICKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'NVDA', name: 'NVIDIA' },
];

const NGX_PICKS = [
  { symbol: 'DANGCEM', name: 'Dangote Cement' },
  { symbol: 'MTNN', name: 'MTN Nigeria' },
  { symbol: 'GTCO', name: 'GTCO' },
  { symbol: 'ZENITHBANK', name: 'Zenith Bank' },
];

const CRYPTO_PICKS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
];

const HORIZONS = [1, 2, 3, 5];

function parseMarket(value) {
  if (value === 'crypto') return 'crypto';
  if (value === 'ngx') return 'ngx';
  return 'stocks';
}

function picksFor(market) {
  if (market === 'crypto') return CRYPTO_PICKS;
  if (market === 'ngx') return NGX_PICKS;
  return STOCK_PICKS;
}

function parseYears(value) {
  const years = Number(value);
  return HORIZONS.includes(years) ? years : 3;
}

function formatMoney(value, currency) {
  const sym = currency === 'NGN' ? '₦' : '$';
  return `${sym}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function ForecastPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const market = parseMarket(searchParams.get('market'));
  const years = parseYears(searchParams.get('years'));
  const selectedSymbol = String(searchParams.get('symbol') || '').trim().toUpperCase();
  const selectedId = String(searchParams.get('id') || '').trim().toLowerCase();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [showNgn, setShowNgn] = useState(false);
  const [fxRate, setFxRate] = useState(null);
  const [outlook, setOutlook] = useState(null);
  const [outlookError, setOutlookError] = useState('');
  const [outlookLoading, setOutlookLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const searchSeq = useRef(0);

  const selected = useMemo(() => {
    if (market === 'crypto') {
      if (!selectedId) return null;
      const known = CRYPTO_PICKS.find((item) => item.id === selectedId);
      return {
        market: 'crypto',
        id: selectedId,
        symbol: selectedSymbol || known?.symbol || '',
        name: known?.name || selectedSymbol || selectedId,
      };
    }
    if (!selectedSymbol) return null;
    const known = picksFor(market).find((item) => item.symbol === selectedSymbol);
    return {
      market,
      id: '',
      symbol: selectedSymbol,
      name: known?.name || selectedSymbol,
    };
  }, [market, selectedId, selectedSymbol]);

  const unit = market === 'ngx' ? 'NGN' : (showNgn && Number.isFinite(fxRate) ? 'NGN' : 'USD');
  const fxScale = market === 'ngx' ? 1 : (unit === 'NGN' ? fxRate : 1);
  const chartHref = selected?.market === 'crypto'
    ? `/crypto?id=${encodeURIComponent(selected.id)}`
    : selected?.market === 'ngx'
      ? `/ngx?symbol=${encodeURIComponent(selected.symbol)}`
      : selected
        ? `/stocks?symbol=${encodeURIComponent(selected.symbol)}`
        : '/stocks';

  const patchParams = useCallback((next) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value == null || value === '') params.delete(key);
      else params.set(key, String(value));
    });
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!selected) return;
    setQuery(selected.symbol || selected.name || '');
  }, [selected]);

  const setMarket = useCallback((nextMarket) => {
    setQuery('');
    setResults([]);
    setSearchOpen(false);
    setOutlook(null);
    setOutlookError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    patchParams({
      market: nextMarket,
      symbol: '',
      id: '',
      years: String(years),
    });
  }, [patchParams, years]);

  const pickStock = useCallback((symbol, name = symbol) => {
    setQuery(name || symbol);
    setSearchOpen(false);
    setResults([]);
    patchParams({ market: 'stocks', symbol: String(symbol || '').toUpperCase(), id: '' });
  }, [patchParams]);

  const pickNgx = useCallback((symbol, name = symbol) => {
    setQuery(name || symbol);
    setSearchOpen(false);
    setResults([]);
    patchParams({ market: 'ngx', symbol: String(symbol || '').toUpperCase(), id: '' });
  }, [patchParams]);

  const pickCrypto = useCallback((id, name = id, ticker = '') => {
    setQuery(name || id);
    setSearchOpen(false);
    setResults([]);
    patchParams({
      market: 'crypto',
      id: String(id || '').toLowerCase(),
      symbol: String(ticker || '').toUpperCase(),
    });
  }, [patchParams]);

  const doSearch = useCallback((value, currentMarket) => {
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const found = currentMarket === 'crypto'
          ? await searchCrypto(value)
          : currentMarket === 'ngx'
            ? await searchNgx(value)
            : await searchStocks(value);
        if (seq === searchSeq.current) setResults(found);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 80);
  }, []);

  useEffect(() => {
    fetchFx()
      .then((fx) => {
        if (Number.isFinite(Number(fx?.rate))) setFxRate(Number(fx.rate));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!selected) {
      setOutlook(null);
      setOutlookError('');
      setOutlookLoading(false);
      return undefined;
    }
    let cancelled = false;
    setOutlook(null);
    setOutlookLoading(true);
    setOutlookError('');
    const request = selected.market === 'crypto'
      ? fetchCryptoOutlook(selected.id, years, { symbol: selected.symbol })
      : selected.market === 'ngx'
        ? fetchNgxOutlook(selected.symbol, years)
        : fetchStockOutlook(selected.symbol, years);
    request
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
  }, [selected, years]);

  const suggestions = useMemo(() => {
    const needle = query.trim();
    const remote = (results || []).map((item) => (
      market === 'crypto'
        ? {
          key: item.id || item.symbol,
          id: item.id,
          symbol: String(item.symbol || '').toUpperCase(),
          name: item.name,
        }
        : {
          key: item.symbol,
          symbol: String(item.symbol || '').toUpperCase(),
          name: item.name,
          exchange: item.exchange,
        }
    ));
    if (!needle) return remote.slice(0, 12);

    const local = picksFor(market)
      .filter((item) => matchesSearch(needle, item.symbol, item.name, item.id))
      .sort((a, b) => searchRank(needle, a) - searchRank(needle, b))
      .map((item) => ({ ...item, key: item.id || item.symbol, local: true }));

    const seen = new Set(local.map((item) => item.key));
    return [...local, ...remote.filter((item) => !seen.has(item.key))].slice(0, 12);
  }, [market, query, results]);

  const showDropdown = searchOpen && query.trim().length > 0;
  const titleLabel = selected
    ? `${selected.symbol || selected.name} over the next ${years} year${years === 1 ? '' : 's'}`
    : market === 'ngx'
      ? 'Pick an NGX listing'
      : 'Pick a US stock or a coin';

  return (
    <main className="layout">
      <section className="panel controlsV2" data-guide="forecast-hero">
        <div className="controlsTopRow">
          <div>
            <h2 className="workspaceTitle">
              Forecast{' '}
              <HelpHint
                label="What is Forecast?"
                text="Pick a name and how long you might hold it: 1, 2, 3, or 5 years. Weaker, typical, and stronger come from that name’s own daily prices. It is a picture to think with, not a promised price. The chart’s 24hrs / 7 days / 1 yr buttons are separate."
              />
            </h2>
            <p className="subtle">A picture of where a US stock, an NGX listing, or a coin could sit. Pick the years you might hold it.</p>
          </div>
          <div className="controlsActions">
            {market !== 'ngx' && (
            <label className="togglePill">
              <input
                type="checkbox"
                checked={showNgn}
                disabled={!Number.isFinite(fxRate)}
                onChange={(event) => setShowNgn(event.target.checked)}
              />
              <span className="toggleTrack"><span className="toggleThumb" /></span>
              <span className="toggleLabel">{showNgn ? '₦ NGN' : '$ USD'}</span>
            </label>
            )}
          </div>
        </div>

        <div className="searchTimeRow">
          <div className="timeframeBar" role="group" aria-label="Market">
            <button type="button" className={market === 'stocks' ? 'tfBtn active' : 'tfBtn'} onClick={() => setMarket('stocks')}>
              Stocks
            </button>
            <button type="button" className={market === 'crypto' ? 'tfBtn active' : 'tfBtn'} onClick={() => setMarket('crypto')}>
              Crypto
            </button>
            <button type="button" className={market === 'ngx' ? 'tfBtn active' : 'tfBtn'} onClick={() => setMarket('ngx')}>
              NGX
            </button>
          </div>

          <div className="searchWrap" ref={searchRef}>
            <input
              className="searchInput"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
                doSearch(event.target.value, market);
              }}
              onFocus={() => { setSearchOpen(true); if (query) doSearch(query, market); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && query.trim()) {
                  if (market === 'crypto') pickCrypto(query.trim().toLowerCase(), query.trim());
                  else if (market === 'ngx') pickNgx(query.trim().toUpperCase());
                  else pickStock(query.trim().toUpperCase());
                }
                if (event.key === 'Escape') setSearchOpen(false);
              }}
              placeholder={market === 'crypto' ? 'Search a coin — bitcoin, ETH…' : market === 'ngx' ? 'Search an NGX ticker — DANGCEM, GTCO…' : 'Search a US ticker — AAPL, Microsoft…'}
              aria-label={market === 'crypto' ? 'Search crypto for forecast' : market === 'ngx' ? 'Search NGX for forecast' : 'Search stocks for forecast'}
            />
            {(query || selected) && (
              <button
                type="button"
                className="searchClear"
                onClick={() => {
                  setQuery('');
                  setSearchOpen(false);
                  setResults([]);
                  patchParams({ symbol: '', id: '' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                ✕
              </button>
            )}
            {showDropdown && (
              <ul className="suggestionList">
                {searching && suggestions.length === 0 && <li className="sugStatus">Searching…</li>}
                {!searching && suggestions.length === 0 && (
                  <li className="sugStatus">No results for “{query.trim()}”</li>
                )}
                {suggestions.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className="suggestionItem"
                      onClick={() => (
                        market === 'crypto'
                          ? pickCrypto(item.id, item.name, item.symbol)
                          : market === 'ngx'
                            ? pickNgx(item.symbol, item.name)
                            : pickStock(item.symbol, item.name)
                      )}
                    >
                      <div className="sugLeft">
                        <span className="sugSymbol">{item.symbol || item.id}</span>
                        <span className="sugName">{item.name}{item.exchange ? ` · ${item.exchange}` : ''}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="forecastPicks" key={market}>
          {picksFor(market).map((item) => {
            const active = market === 'crypto' ? selected?.id === item.id : selected?.symbol === item.symbol;
            return (
              <button
                key={item.symbol}
                type="button"
                className={active ? 'forecastPick isActive' : 'forecastPick'}
                onClick={() => (
                  market === 'crypto'
                    ? pickCrypto(item.id, item.name, item.symbol)
                    : market === 'ngx'
                      ? pickNgx(item.symbol, item.name)
                      : pickStock(item.symbol, item.name)
                )}
              >
                <span className="forecastPickSymbol">{item.symbol}</span>
                <span className="forecastPickName">{item.name}</span>
              </button>
            );
          })}
        </div>
        {market === 'ngx' && (
          <p className="subtle forecastNgxNote">NGX prices stay in naira. The picture uses that listing’s own daily prices.</p>
        )}
      </section>

      {selected ? (
        <section className="panel">
          <div className="sectionHead">
            <div>
              <h3>{selected.symbol || selected.name}</h3>
              <p className="subtle">{selected.name} · the years you pick are how long you might hold it</p>
            </div>
            <Link className="actionGhost" to={chartHref}>Open chart</Link>
          </div>
          <OutlookPanel
            title={titleLabel}
            hint="Weaker, typical, and stronger are three pictures from this name’s own daily prices. Typical is the usual path. Weaker and stronger are the low and high edges, about 1 in 10. The year buttons are how long you might hold it."
            years={years}
            onYears={(next) => patchParams({ years: String(next) })}
            data={outlook ? { ...outlook, fxScale } : null}
            error={outlookError}
            loading={outlookLoading}
            formatPrice={(value) => formatMoney(value, unit)}
          />
        </section>
      ) : (
        <section className="panel emptyState">
          <h3>Pick a name to see a picture</h3>
          <p>Choose Stocks, Crypto, or NGX, then a name you know — or one of the shortcuts. The year buttons are how long you might hold it. They do not change the price chart.</p>
        </section>
      )}
    </main>
  );
}
