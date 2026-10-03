import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LogoMark } from './components/LogoMark';
import { ThemeToggle } from './components/ThemeToggle';
import { ForexBar } from './components/ForexBar';
import { AuthModal } from './components/AuthModal';
import { WelcomeSplash } from './components/WelcomeSplash';
import { applyTheme, readStoredTheme } from './theme';
import { useAuth } from './lib/auth';
import { useGuide } from './lib/guide';
import { GuidedTour } from './components/GuidedTour';
import './App.css';

const loadStockPage = () => import('./pages/StockPage');
const loadCryptoPage = () => import('./pages/CryptoPage');
const loadNgxPage = () => import('./pages/NgxPage');
const loadForecastPage = () => import('./pages/ForecastPage');
const loadLearnPage = () => import('./pages/LearnPage');
const pageLoaders = [
  loadStockPage,
  loadCryptoPage,
  loadNgxPage,
  loadForecastPage,
  loadLearnPage,
];

const StockPage = lazy(() => loadStockPage().then((module) => ({ default: module.StockPage })));
const CryptoPage = lazy(() => loadCryptoPage().then((module) => ({ default: module.CryptoPage })));
const NgxPage = lazy(() => loadNgxPage().then((module) => ({ default: module.NgxPage })));
const ForecastPage = lazy(() => loadForecastPage().then((module) => ({ default: module.ForecastPage })));
const LearnPage = lazy(() => loadLearnPage().then((module) => ({ default: module.LearnPage })));

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/stocks', label: 'Stocks' },
  { to: '/crypto', label: 'Crypto' },
  { to: '/ngx', label: 'NGX' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/learn', label: 'Learn' },
];

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="layout">
          <section className="panel">
            <h2>This workspace could not be displayed</h2>
            <p className="warn">The page hit an unexpected error. Reload it to start with a clean workspace.</p>
            <button type="button" className="actionPrimary" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function HomePage({ onOpenTrust }) {
  const { isSignedIn, user, accountsEnabled, openAuth } = useAuth();
  const { startTour } = useGuide();
  return (
    <main className="welcomePage">
      <section className="welcomeShell">
        <div className="welcomeHero">
          <div className="welcomeHeroMain fadeUp" data-guide="home-hero">
            <p className="welcomeLabel">Price research workspace</p>
            <h1 className="welcomeHeadline">
              Stock prices, history, and context — organised in one place.
            </h1>
            <p className="welcomeSubtitle">
              Look up a listing, read the close, company facts, tested indicators, and two unusual-day methods (3-sigma and Isolation Forest) from a named source. When you are ready to place an order, Learn lists licensed brokers. If a provider has no history, the chart stays empty.
            </p>

            <div className="welcomeActions">
              <Link to="/stocks" className="ctaPrimary">Open stocks <span aria-hidden="true">→</span></Link>
              <Link to="/learn" className="ctaSecondary">Learn &amp; brokers</Link>
              <button type="button" className="ctaSecondary" onClick={() => startTour(0)}>Take a tour</button>
            </div>
            {isSignedIn ? (
              <p className="welcomeAccountNote">Signed in as {user?.email} — your stocks watchlist saves to this account.</p>
            ) : !accountsEnabled ? (
              <p className="welcomeAccountNote">
                No sign-in needed. Every chart works straight away.
              </p>
            ) : (
              <p className="welcomeAccountNote">
                No sign-in needed to read charts.{' '}
                <button type="button" className="textLinkButton" onClick={() => openAuth('signup')}>
                  Create an account
                </button>{' '}
                if you want to save a stocks watchlist.
              </p>
            )}

            <div className="welcomeProof" aria-label="Product principles">
              <span><i aria-hidden="true" /> Named providers only</span>
              <span><i aria-hidden="true" /> No made-up history</span>
              <span><i aria-hidden="true" /> Licensed brokers listed</span>
            </div>
          </div>

          <aside className="welcomeHeroRail fadeUp d2" aria-label="Platform workflow">
            <div className="welcomeTerminalCard">
              <div className="welcomeTerminalHead">
                <span className="welcomeTerminalStatus" aria-hidden="true" />
                <strong>Price chart</strong>
                <span className="welcomeTerminalMeta">HISTORY + INDICATORS</span>
              </div>
              <div className="welcomeChartPreview">
                <div className="welcomeChartTopline">
                  <div>
                    <span>Selected asset</span>
                    <strong>Research context</strong>
                  </div>
                    <span className="welcomeVerifiedPill"><i /> Provider history</span>
                </div>
                <svg className="welcomeChartSvg" viewBox="0 0 520 190" role="img" aria-label="Decorative verified market history illustration">
                  <defs>
                    <linearGradient id="previewArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g className="welcomeChartGrid">
                    <path d="M0 35H520M0 82H520M0 129H520M0 176H520" />
                    <path d="M70 0V190M175 0V190M280 0V190M385 0V190M490 0V190" />
                  </g>
                  <path className="welcomeChartArea" d="M0 155 C35 148 48 124 83 132 S142 116 170 126 S218 92 253 102 S310 66 342 79 S400 42 432 57 S482 30 520 21 L520 190 L0 190 Z" />
                  <path className="welcomeChartLineGlow" d="M0 155 C35 148 48 124 83 132 S142 116 170 126 S218 92 253 102 S310 66 342 79 S400 42 432 57 S482 30 520 21" />
                  <path className="welcomeChartLine" pathLength="1" d="M0 155 C35 148 48 124 83 132 S142 116 170 126 S218 92 253 102 S310 66 342 79 S400 42 432 57 S482 30 520 21" />
                  <g className="welcomeChartCursor">
                    <line x1="432" y1="10" x2="432" y2="180" />
                    <circle cx="432" cy="57" r="5" />
                    <circle cx="432" cy="57" r="11" className="welcomeChartCursorPulse" />
                  </g>
                </svg>
                <div className="welcomeChartFooter">
                  <span><i className="welcomeLegendLine" /> Provider observations</span>
                  <span>SMA / EMA / RSI on request</span>
                </div>
              </div>
            </div>

            <div className="welcomeHeroMiniGrid">
              <div className="welcomeDataCard">
                <span>01 / Research</span>
                <strong>Read the chart</strong>
                <p>History, volume, and indicators computed in this app.</p>
              </div>
              <div className="welcomeDataCard">
                <span>02 / Understand</span>
                <strong>Flag unusual days</strong>
                <p>Gold rings use a 3-sigma rule. Wine dots are Isolation Forest on return, volume, and range. Detection only — not a forecast.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="welcomeStats fadeUp d3">
          <div className="welcomeStat">
            <span>Stocks</span>
            <strong>Yahoo Finance history</strong>
          </div>
          <div className="welcomeStat">
            <span>NGX</span>
            <strong>NGX Pulse when a key is set</strong>
          </div>
          <div className="welcomeStat">
            <span>Indicators</span>
            <strong>SMA, EMA, RSI, MACD, bands</strong>
          </div>
          <div className="welcomeStat">
            <span>ML</span>
            <strong>Isolation Forest vs 3-sigma</strong>
          </div>
        </div>

        <section className="welcomeProcess fadeUp d4">
          <div className="welcomeSectionHead">
            <div>
              <p className="welcomeLabel">What this workspace does</p>
              <h2>Organised price detail, from lookup to context.</h2>
            </div>
            <p>One chart stack is shared across stocks, crypto, and NGX. History, indicators, and unusual-day marks sit together. Orders go through a licensed broker listed on Learn.</p>
          </div>
          <div className="welcomeProcessGrid">
            <article className="welcomeProcessCard">
              <span className="welcomeProcessNumber">01</span>
              <h3>Load history</h3>
              <p>Search a ticker. If the provider returns bars, we store and plot them. If not, you see an error — not a guessed line.</p>
              <small>Yahoo · CoinGecko · NGX Pulse</small>
            </article>
            <article className="welcomeProcessCard">
              <span className="welcomeProcessNumber">02</span>
              <h3>Compute indicators</h3>
              <p>Averages and RSI are calculated in our backend and covered by unit tests.</p>
              <small>SMA · EMA · RSI · MACD · Bollinger</small>
            </article>
            <article className="welcomeProcessCard">
              <span className="welcomeProcessNumber">03</span>
              <h3>Compare</h3>
              <p>Overlay two symbols from a common start (0%). A watchlist is available after you create an account.</p>
              <small>Normalised returns · Watchlist</small>
            </article>
            <article className="welcomeProcessCard">
              <span className="welcomeProcessNumber">04</span>
              <h3>Mark unusual days</h3>
              <p>Gold rings = 3-sigma on this chart’s returns or volume. Wine dots = Isolation Forest. Click a mark to read the day. Neither is a buy or sell signal.</p>
              <small>Gold 3-sigma · Wine Isolation Forest</small>
            </article>
          </div>
        </section>

        <div className="welcomeWorkspaceGroups fadeUp d6">
          <section className="welcomeWorkspaceGroup welcomeWorkspaceGroup--markets" data-guide="home-markets">
            <header>
              <span>Open a market</span>
              <strong>Markets and reference</strong>
              <small>Chart or forecast</small>
            </header>
            <div className="welcomeGrid welcomeGrid--markets">
              <Link to="/stocks" className="welcomeOption welcomeOption--featured">
                <span className="welcomeIcon">EQ</span>
                <strong>Stocks</strong>
                <span>Search, chart, indicators, compare, watchlist, unusual-day flags.</span>
                <span className="welcomeArrow">Open stocks <b aria-hidden="true">↗</b></span>
              </Link>
              <Link to="/crypto" className="welcomeOption">
                <span className="welcomeIcon">CR</span>
                <strong>Crypto</strong>
                <span>Same chart on CoinGecko history. Empty if the API is rate-limited.</span>
                <span className="welcomeArrow">Open crypto <b aria-hidden="true">↗</b></span>
              </Link>
              <Link to="/ngx" className="welcomeOption">
                <span className="welcomeIcon">NG</span>
                <strong>Nigerian Exchange</strong>
                <span>NGX quotes in naira. History only when NGX Pulse returns it.</span>
                <span className="welcomeArrow">Open NGX <b aria-hidden="true">↗</b></span>
              </Link>
              <Link to="/forecast" className="welcomeOption">
                <span className="welcomeIcon">FC</span>
                <strong>Forecast</strong>
                <span>Possible performance for a US stock, NGX listing, or coin over 1, 2, 3, or 5 years — a range, not a promised price.</span>
                <span className="welcomeArrow">Open Forecast <b aria-hidden="true">↗</b></span>
              </Link>
              <Link to="/learn" className="welcomeOption">
                <span className="welcomeIcon">RF</span>
                <strong>Learn &amp; brokers</strong>
                <span>Chart terms, methods, and licensed firms that can place an order.</span>
                <span className="welcomeArrow">Open Learn <b aria-hidden="true">↗</b></span>
              </Link>
            </div>
          </section>
        </div>

        <section className="welcomeIntegrity fadeUp d6">
          <div className="welcomeIntegrityMark" aria-hidden="true">i</div>
          <div>
            <p className="welcomeLabel">Data limits</p>
            <h2>Free market APIs can be delayed, incomplete, or down.</h2>
            <p>Nexora organises research. Execution sits with a licensed broker — see Learn for regulated firms. Unusual-day flags describe this chart; they are not an order.</p>
          </div>
          <button type="button" className="ctaSecondary" onClick={onOpenTrust}>
            Data sources
          </button>
        </section>
      </section>
    </main>
  );
}

function TrustCenterModal({ open, onClose }) {
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="trustModalBackdrop" onClick={onClose}>
      <section
        className="trustModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-center-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="trustModalHead">
          <div>
            <span className="welcomeLabel">Trust Center</span>
            <h3 id="trust-center-title">Where prices come from</h3>
          </div>
          <button ref={closeRef} type="button" className="researchClose" onClick={onClose}>Close</button>
        </div>
        <div className="trustModalGrid">
          <article className="trustModalCard">
            <strong>Live market data</strong>
            <p>Stocks use Yahoo Finance (can be delayed). Crypto uses CoinGecko, with Yahoo as a fallback. NGX uses NGX Pulse if an API key is set. The USD/NGN bar uses Open ER (and a backup FX feed).</p>
          </article>
          <article className="trustModalCard">
            <strong>NGX company details</strong>
            <p>A selected NGX stock shows the NGX Pulse listing snapshot plus its dividend records (Pulse sources those from StockAnalysis). The 12-month dividend total and the yield are added up in this app and labelled as such. Income statements sit behind a paid Pulse tier, so they are left out.</p>
          </article>
          <article className="trustModalCard">
            <strong>Missing history</strong>
            <p>If a provider does not return bars, the chart is empty. We do not invent candles or a confidence percentage.</p>
          </article>
          <article className="trustModalCard">
            <strong>Indicators</strong>
            <p>SMA, EMA, RSI, MACD, and Bollinger bands are computed here from the closes we received. They are not a trading system.</p>
          </article>
          <article className="trustModalCard">
            <strong>Unusual days</strong>
            <p>Isolation Forest (wine) is the machine-learning flag. The gold ring is a 3-sigma statistical baseline on return or volume. Both mean “unusual versus this chart’s recent history,” not “buy” or “sell.”</p>
          </article>
          <article className="trustModalCard">
            <strong>Guest and accounts</strong>
            <p>Guest mode uses the same charts. A watchlist needs an account. Orders are placed at a licensed broker listed under Learn.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn, user, status, accountsEnabled, openAuth, logout } = useAuth();
  const { startTour } = useGuide();
  const [trustOpen, setTrustOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const boardNonce = useRef(0);
  const [theme, setTheme] = useState(() => (
    typeof document !== 'undefined' ? (document.documentElement.dataset.theme || readStoredTheme()) : 'light'
  ));
  const closeTrust = useCallback(() => setTrustOpen(false), []);
  const toggleTheme = useCallback(() => {
    setTheme((current) => applyTheme(current === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onPop = () => window.scrollTo(0, 0);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function openSection(event, item) {
    setNavOpen(false);
    if (location.pathname === item.to) {
      event.preventDefault();
      boardNonce.current += 1;
      navigate({ pathname: item.to, search: '' }, { replace: true, state: { board: boardNonce.current } });
    }
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    const connection = navigator.connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType || '')) return undefined;
    const preload = () => pageLoaders.forEach((loadPage) => loadPage().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(preload, 1000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <WelcomeSplash />
      <a className="skipLink" href="#main-content">Skip to content</a>
      <TrustCenterModal open={trustOpen} onClose={closeTrust} />
      <AuthModal />
      <GuidedTour />
      <header className="topNav">
          <div className="topNavInner">
            <div className="brandBlock">
              <Link to="/" className="brandLink" aria-label="Nexora Markets home" onClick={() => { setNavOpen(false); window.scrollTo(0, 0); }}>
              <LogoMark compact />
            </Link>
            </div>
            <button
              type="button"
              className="navMenuButton"
              aria-expanded={navOpen}
              aria-controls="primary-navigation"
              onClick={() => setNavOpen((value) => !value)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <b>{navOpen ? 'Close' : 'Menu'}</b>
            </button>
            <nav id="primary-navigation" className={navOpen ? 'isOpen' : ''} aria-label="Primary navigation">
              <div className="navLinks">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={(event) => openSection(event, item)}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <span className="navDivider" aria-hidden="true" />
              <button type="button" className="topNavUtility" onClick={() => setTrustOpen(true)}>
                Data sources
              </button>
              <button type="button" className="topNavUtility" onClick={() => { setNavOpen(false); startTour(0); }}>
                Tour
              </button>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              {accountsEnabled && status !== 'loading' && (
                <>
                  <span className="navDivider" aria-hidden="true" />
                  <div className="authNav">
                    {isSignedIn ? (
                      <>
                        <span className="authChip" title={user?.email}>{user?.email}</span>
                        <button
                          type="button"
                          className="topNavUtility"
                          onClick={() => { setNavOpen(false); logout(); }}
                        >
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="topNavUtility"
                          onClick={() => { setNavOpen(false); openAuth('login'); }}
                        >
                          Log in
                        </button>
                        <button
                          type="button"
                          className="navSignup"
                          onClick={() => { setNavOpen(false); openAuth('signup'); }}
                        >
                          Sign up
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </nav>
          </div>
      </header>
      <ForexBar />
      <div id="main-content" className="pageEnter" key={location.pathname}>
        <PageErrorBoundary key={location.pathname}>
        <Suspense fallback={(
          <main className="layout routeLoading">
            <section className="panel">
              <LogoMark compact />
              <div className="loadingLine" />
              <div className="loadingLine loadingLine--short" />
              <p className="subtle">Preparing workspace…</p>
            </section>
          </main>
        )}>
        <Routes>
          <Route path="/" element={<HomePage onOpenTrust={() => setTrustOpen(true)} />} />
          <Route path="/stocks" element={<StockPage />} />
          <Route path="/crypto" element={<CryptoPage />} />
          <Route path="/ngx" element={<NgxPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </PageErrorBoundary>
      </div>
      <footer className="appFooter">
          <div>
            <strong>Nexora Markets</strong>
            <span>Price research · licensed brokers listed on Learn</span>
          </div>
          <p>Research workspace · Orders via licensed brokers · Market data may be delayed</p>
          <button type="button" onClick={() => setTrustOpen(true)}>Data sources</button>
      </footer>
    </>
  );
}

export default App;
