# Nexora Markets

Nexora is a price-research workspace for US stocks, crypto, and Nigerian Exchange (NGX) listings. You look up a name, read its history and company facts, turn on tested indicators, see which days stood out, check whether a normal sale could get out, and open a 1- to 5-year range built from that name’s own daily closes.

Nexora does not take orders, hold money, or recommend a trade. When you want to buy or sell, Learn lists licensed brokers. If a provider sends no bars, the chart stays empty. A missing number stays blank. It is never filled in with zero or a guess.

## Tech stack

- Frontend: React + Vite + Recharts
- Backend: Node.js (22 or 23) + Express
- Accounts and the stocks watchlist: Supabase (managed Postgres + Auth)
- Data: Yahoo Finance, CoinGecko, NGX Pulse, a USD→NGN quote, and merged news

Indicators, unusual-day marks, and the forecast are computed in this repo from the closes the provider sent. They are not copied from a third-party signal feed.

## Pages

| Page | What it is for |
| --- | --- |
| Home | What the workspace is, a short tour, and the source rules |
| Stocks | US listings from Yahoo Finance |
| Crypto | Coins from CoinGecko, with Yahoo Finance as the fallback |
| NGX | Nigerian listings in naira from NGX Pulse |
| Forecast | The same weaker / typical / stronger range, on its own page |
| Learn | Short lessons, a glossary, and licensed brokers |

Stocks, Crypto, and NGX share one chart. Each opened listing can show history, volume, indicators, unusual-day marks, a sellability badge, company or coin facts, news, and the forecast range for that name. Light and dark themes, a guided tour, and help hints sit across the app.

A signed-in stocks watchlist is the only thing an account stores. Guests can read every chart. With no Supabase keys, the app runs guest-only and hides sign-in.

## Run locally

From this folder:

```bash
npm install
npm run dev
```

The UI is Vite, often `http://localhost:5173` or `5174`. The API is `http://localhost:4000`. Vite proxies `/api` to that API.

NGX history needs `NGX_PULSE_API_KEY` in `backend/.env`. Stocks, crypto, the forecast for those two markets, and the USD→NGN bar work without it. See [Environment](#environment).

## What you can do on a listing

Search by ticker or name, or pick a row. Chart ranges:

- Stocks: 24 hours, 7 days, 1 month, 2 months, 3 months, 1 year, max, or a custom window. Short ranges use intraday bars. Longer ranges use daily closes.
- Crypto: 24 hours through max, plus custom.
- NGX: 24 hours through 1 year, plus custom.

On Stocks you can compare two tickers. Both lines start at 0% on the first shared date, so the chart shows which one moved more. It does not show which share costs more.

On Stocks, a dollar listing can be drawn in naira with the USD→NGN rate. That rescales the picture. The stored series is still the dollar close. NGX prices stay in naira. The rate is a mid-market reference (`GET /api/fx/usd-ngn`), first from open.er-api.com and then from exchangerate.host. It is not a bank or bureau quote.

Each history response carries a `provenance` object: provider, whether the series is historical, and whether a fallback or a stale cache was used. The Trust Center on the home page names the same sources.

## Statistical modeling

All of the numbers below are calculated in this app from the bars on the chart. The code is in `backend/src/utils/`. The same market-condition and sellability rules are also in `frontend/src/lib/` so the screens can score a list without a second round trip. Backend tests cover the formulas.

### Indicators

`enrichIndicators` in `backend/src/utils/normalize.js` attaches these fields to every bar. The chart toggles draw SMA 20, EMA 20, Bollinger bands, RSI, and MACD. SMA 7 is on the series as `ma7` and is used when a dollar series is rescaled into naira. It is not a separate toggle.

| Overlay | Rule |
| --- | --- |
| SMA 7 and SMA 20 | Mean of the last 7 or 20 closes. Blank until the window is full. |
| EMA 20 | Smoothing constant `2 / 21`. The first value is the SMA of the first 20 closes. After that, `ema = close × k + previous × (1 − k)`. |
| Bollinger bands | SMA 20, plus and minus 2 sample standard deviations of those 20 closes. Sample standard deviation divides by `window − 1`. |
| RSI 14 | Wilder’s RSI. The first 14 up-moves and down-moves are averaged, then each new bar updates the averages with `(previous × 13 + this bar) / 14`. Score is `100 − 100 / (1 + average gain / average loss)`. A zero average loss scores 100. |
| MACD | EMA 12 minus EMA 26. The signal line is a 9-period EMA of that difference. The histogram is MACD minus signal. |

A close outside the Bollinger band means that close is far from the last 20 closes on this chart. RSI and MACD describe how recent rises and falls have been behaving. None of these lines is an order.

### How jumpy the recent bars are

On an opened stock, the summary reports a one-standard-deviation size of recent percentage moves. It uses the last 21 closes (20 returns), sample standard deviation, and needs at least 8 closes.

- Daily bars: **Calm** at or under ±1.2%, **Elevated** above that, **High** above ±2.2%.
- Intraday bars: the cuts are ±0.35% and ±0.7%.

The label compares the chart with ordinary stock-move sizes. It is a description of the window you loaded.

### Market condition

Market condition is a reading of a named sample, not of the whole market. `conditionFromAvg` labels the sample **Bullish**, **Bearish**, or **Neutral** from the average percentage move. The board also counts how many names closed higher and how many closed lower.

| Market | Sample | Bullish / bearish cut |
| --- | --- | --- |
| Stocks | AAPL, MSFT, GOOGL, NVDA | Average move above +1% or below −1% |
| Crypto | BTC, ETH, SOL, XRP, DOGE, SHIB, PEPE, BONK | Average move above +2% or below −2% |
| NGX | The All-Share Index for the average, and the listed names for breadth | Average move above +0.3% or below −0.3%, and the breadth has to agree |

On NGX, the 24-hour average is the official All-Share Index percentage when Pulse sends it. Longer ranges use the index history for that window. Bullish also requires at least as many advances as declines. Bearish requires at least as many declines as advances. A strong index move with the opposite breadth stays **Neutral**.

For ranges longer than a session, the stock and crypto samples rebuild each name’s move from the loaded history, and a small chart rebases every series to 100 at the first close so you can see the path. The one-day view can fall back to the latest quote change when history is still loading. Sector and category bars show the average move inside each group. The hint on each board names the sample.

### Can a normal person sell?

Each name gets a badge: **Easy to sell**, **Slow to sell**, **Hard to sell**, or **Not enough to tell**. The question is whether a normal sale is a small piece of the money that actually traded.

A normal sale is **₦500,000** on NGX, **$2,000** on a US stock, and **$1,000** in crypto.

- **Hard to sell** when that sale is at least one tenth of the value traded, when nothing traded, when the bid–ask gap is at least 5% of the mid price, or when insiders or other long-term holders are reported to control at least 80% of the shares.
- **Slow to sell** at one fortieth of the value traded, a gap of at least 2%, or closely held shares of at least 50%.
- A name that trades far less than its peers on the same list can be marked slow even when one session looked fine. The badge then uses the average value across the loaded sessions (at least three bars).
- A zero morning print on a US or crypto name falls back to the published average volume. An NGX zero is treated as a real session zero, because Pulse does not send a separate average to fall back on.
- If the whole board is quiet (about 60% of the list printed no volume), one zero print is **Not enough to tell**. A closed market is not a verdict on that one name.
- Suspension, delisting, and a corporate action are tagged only when the feed says so.
- Settlement is stated as a fact of the venue: two trading days on NGX, the next trading day for US stocks, immediate for crypto. It is the same for every name on that venue, so it does not decide the badge.
- A missing free float, bid, or ask is **Not published**. It is not treated as zero. A float that is under 0.5% or over 105% of shares outstanding is ignored as implausible. A bid–ask gap wider than 80% is ignored as a broken quote.

The opened listing shows the factor that decided the badge: free float, demand, bid–ask, listing status, corporate action, settlement, or market hours. A separate board ranks the names on the current list. NGX sellability also reads `backend/data/ngx-sell-factors.json`, Pulse disclosures, and, when `NGX_QUOTE_TOKEN` is set, the NGX quote feed for bid and ask.

## Unusual days

Every history series with at least 10 bars is scored in `backend/src/utils/anomaly.js` before it reaches the chart. Two methods run on the same bars. They describe the window you loaded. They do not forecast the next session.

On the chart, a **gold ring** is the 3-sigma rule. A **wine dot** is Isolation Forest. You can hide either layer. Click a mark for the note: which rule fired, the return that day, and how the volume compared with its recent median.

### What each bar is measured on

For each bar the detector builds:

- **Return:** `close / previous close − 1`. The first bar has no return and is never flagged.
- **Absolute return.**
- **Volume ratio:** that bar’s volume divided by the median volume of the last 20 bars, including itself. The median ignores a single huge print, so one spike does not redefine “normal” volume.
- **Range:** `(high − low) / close`, when high, low, and close are present. Crypto bars that arrive as close and volume only contribute 0 here.

### 3-sigma rule (gold ring)

Returns and volume ratios are each compared with their own sample mean and sample standard deviation across the loaded window (divide by `n − 1`). A bar is gold when the return **or** the volume ratio sits more than 3 standard deviations from its mean. A flat series, where the standard deviation is 0, flags nothing.

The callout says which side fired:

- **Sudden price spike** or **sudden price drop** when the return broke the rule.
- **Sudden volume spike** when volume was high versus the window, or a thin-volume note when the volume z-score is negative.
- Both, when price and volume each broke the rule.

### Isolation Forest (wine dot)

Isolation Forest asks a different question: how few random cuts does it take to separate this bar from the others? A bar that is easy to isolate is unusual in the joint pattern of return, absolute return, volume ratio, and range. A bar can be wine without breaking the 3-sigma rule on price or volume alone, and the callout says so.

The implementation is a seeded forest so the same series scores the same way in tests and in the app:

- 80 trees.
- Each tree draws 256 bars (or every bar, when the window is shorter), with replacement, from a seeded linear congruential generator. The seed is 42.
- Each split picks a feature at random and a cut uniformly between that sample’s min and max on that feature. Tree height stops at `ceil(log2(sample size))`.
- The anomaly score is `2^(−average path length / c(n))`, where `c(n)` is the usual average path length of an unsuccessful search in a binary search tree. Scores sit between 0 and 1. Higher means easier to isolate.
- A bar is wine when its score is at least the 95th percentile of scores in this window **and** at least 0.55. The percentile keeps the mark on the unusual tail. The floor keeps an ordinary series from flagging a bar just because it ranked last.

If the forest flags a bar and the 3-sigma rule did not, the reason falls back to spike, drop, or volume when that feature’s z-score is at least 2, and to **mixed** when no single feature stands that far out.

Agreeing marks mean the day stood out on two tests. One mark is a weaker observation. Neither mark means the next bar will reverse or continue.

## Forecast

Forecast is a range for one name, built only from that name’s daily closes. It is on the Forecast page, and the same panel sits under the chart of an opened stock, coin, or NGX listing. The chart’s 24-hour / 7-day / 1-year buttons do not feed it. You pick **1, 2, 3, or 5 years**.

The model is in `backend/src/utils/forecast.js`. It treats daily log returns as if that mix of drift and volatility carried on, and it draws three points on the resulting lognormal distribution.

### The calculation

1. Keep closes that are finite and positive. Read their dates.
2. Daily log return: `ln(close / previous close)`.
3. `μ` is the mean of those log returns. `σ` is their sample standard deviation (`n − 1`).
4. Let `T` be the number of periods in the horizon: `years × periods per year`.
5. **Typical** is the median path: `last close × exp(μ × T)`.
6. The band width is `σ × √T × 1.28155`. The constant is the standard-normal quantile for 10% and 90%.
7. **Weaker** is `last close × exp(μ × T − band)`. **Stronger** is `last close × exp(μ × T + band)`.

If daily log returns stayed independent and normal with this mean and variance, weaker and stronger are about the 10th and 90th percentiles of the price at that horizon. About one path in ten would land at weaker or below, and about one in ten at stronger or above. Typical is the middle path, not a target and not a recommendation.

The panel also shows:

- The percent change from the latest close to each of the three prices.
- How many daily closes went in, the first and last date, and the length of that lookback.
- The realized compound growth over that lookback: `(last / first) ^ (1 / years) − 1`, using the calendar span between the first and last date.
- The growth implied by the daily mean: `exp(μ × periods per year) − 1`.

### How much history each market uses

| Market | History requested | Periods in a model year | Minimum bars |
| --- | --- | --- | --- |
| US stocks | About 10 years of Yahoo daily closes | 252 trading days | 252 |
| NGX | Up to 10 years of Pulse daily closes | 252 trading days | 252, and the series must be real history |
| Crypto | Yahoo daily history when it is available | 365 days | 365 |

Crypto trades every day, so the model year is 365. Stocks and NGX use 252 trading days. An NGX name whose history fell back to a short Pulse window is refused, even if a handful of bars came back. The screen then says the name does not have a year of daily prices yet.

When Yahoo’s long crypto history is unavailable, the route can fit the range on about a year of CoinGecko closes and lowers the minimum to 300 bars. The response sets `sampleLimited`, and the footnote says the long series was unavailable. A series that still fails the minimum returns HTTP 422 with `INSUFFICIENT_HISTORY`. Any horizon other than 1, 2, 3, or 5 returns HTTP 400.

On the Forecast page, a dollar result can be shown in naira by multiplying the three prices by the USD→NGN rate. The fit itself stays in the listing’s own currency. NGX ranges are already in naira.

### What the range leaves out

The picture replays the past mix of daily moves. It does not know investor mood, the wider economy, the business’s own market, dividends you might be paid, or whether the business gets better or worse from here. It assumes the measured daily drift and volatility keep going, independently, for the whole horizon. A business that changes, a crash, or a quiet new regime will not be in the number. Read it as a picture to think with. The panel says this next to the three prices.

## Company facts, news, and Learn

Opening a US stock loads a quote summary when Yahoo sends it: sector, a business description, market cap, volume, valuation ratios, margins, holders, the 52-week range, and headlines. Opening an NGX name loads the Pulse listing snapshot and dividend rows. P/E and EPS stay blank when that file is not in the tier we call. Opening a coin loads market figures and headlines.

News is merged from Yahoo Finance search and a Google News RSS query, then deduplicated. A headline is context. It is not a score.

Learn is a short course in the labels on the screen: what a price is, how to read a chart and a percentage, earnings language, market cap versus the share price, the indicator lines, unusual days, sellability, the forecast range, naira versus dollars, and risk. Search filters the lessons, the glossary, and the broker list. The broker list is a set of regulated firms by region. It is not a list of what to buy.

## Data rules

- A series is built only from rows the provider returned. Dates and closes are not invented to fill a gap. `backend/src/__tests__/marketIntegrity.test.js` locks that contract.
- Provider calls are cached for a few minutes and deduplicated when the same request is already in flight. A failed refresh can serve the last good payload and mark it stale.
- On startup, and about every three minutes, the API prefetches a few common stock, crypto, and NGX series so the first click is warm. Set `WARM_CACHE=0` to stop that loop.
- The API is read-only. Identity lives in Supabase. The browser does not send this API a session cookie.

## Tests

```bash
npm test
```

That runs the backend Vitest suite:

| File | What it checks |
| --- | --- |
| `forecast.test.js` | Log-return stats, the 1/2/3/5-year horizons, and the weaker / typical / stronger band |
| `indicators.test.js` | SMA, EMA, RSI, MACD, Bollinger, and unusual-day flags on a known spike |
| `liquidity.test.js` | Normal-sale badges, spreads, float, and quiet boards |
| `marketMath.test.js` | Breadth, bullish / bearish cuts, and rebased sample paths |
| `marketIntegrity.test.js` | Provenance, and NGX rows that stay limited to what the provider sent |
| `ngxSellFactors.test.js` | How a disclosure becomes a sellability tag |
| `normalize.test.js` | Turning raw provider payloads into chart bars |
| `api.test.js` | Health, FX, and rejection of a bad forecast horizon before any provider is called |

## Layout

- `frontend/` — React app. Pages are in `src/pages/`. The shared chart is `src/components/MarketChart.jsx`. The forecast panel is `src/components/OutlookPanel.jsx`.
- `backend/src/routes/` — HTTP routes.
- `backend/src/utils/normalize.js` — indicator math.
- `backend/src/utils/anomaly.js` — 3-sigma and Isolation Forest.
- `backend/src/utils/forecast.js` — the lognormal range.
- `backend/src/utils/liquidity.js` — sellability rules, with tests. The screen uses `frontend/src/lib/liquidity.js`.
- `backend/src/utils/marketMath.js` — breadth and market-condition cuts. The screen uses `frontend/src/lib/marketMath.js`.
- `backend/src/services/marketData.js` — provider calls, fallbacks, and provenance.
- `backend/data/ngx-sell-factors.json` — local NGX notes used by the sellability pass.
- `supabase/schema.sql` — the watchlist table and its row-level security.
- `docs/` — the project report and presentation notes. This README is the description of the running app.

## API routes

| Route | What it returns |
| --- | --- |
| `GET /api/health` | Liveness probe |
| `GET /api/stocks/search/query?q=` | Ticker search |
| `GET /api/stocks/quotes?symbols=` | Latest quotes for a list |
| `GET /api/stocks/info/:symbol` | Company facts and headlines |
| `GET /api/stocks/news?symbol=` | Headlines for one ticker |
| `GET /api/stocks/:symbol?range=1y&interval=1d` | History, indicators, and unusual-day fields |
| `GET /api/stocks/:symbol/outlook?years=3` | Forecast range. `years` is 1, 2, 3, or 5 |
| `GET /api/crypto/search/query?q=` | Coin search |
| `GET /api/crypto/markets` | Market list |
| `GET /api/crypto/info/:id` | Coin facts |
| `GET /api/crypto/:id?days=90` | History, indicators, and unusual-day fields |
| `GET /api/crypto/:id/outlook?years=3` | Forecast range. Optional `symbol` helps the Yahoo fallback |
| `GET /api/ngx/stocks` | Board snapshot |
| `GET /api/ngx/market` | Market overview |
| `GET /api/ngx/search?q=` | NGX search |
| `GET /api/ngx/company/:symbol` | Listing snapshot and dividend records |
| `GET /api/ngx/history/:symbol?days=90` | History, indicators, and unusual-day fields |
| `GET /api/ngx/outlook/:symbol?years=3` | Forecast range in naira |
| `GET /api/ngx/indices/:code/history` | Index history, including the All-Share Index |
| `GET /api/ngx/news` | NGX headlines |
| `GET /api/fx/usd-ngn` | USD→NGN reference rate |

Signup, login, password reset, and the watchlist do not go through this API. The browser talks to Supabase, and row-level security scopes every watchlist read and write to the signed-in user.

Each enriched bar can include `sma20`, `ema20`, `rsi14`, `macd`, `macd_signal`, `macd_hist`, `bb_middle`, `bb_upper`, `bb_lower`, `ma7`, and the unusual-day fields: `anomalySigma`, `anomalyMl`, `anomalyScore`, `anomalyReasons`, `sigmaPrice`, `sigmaVolume`, `returnPct`, `volumeRatio`, `returnZ`, `volumeZ`.

A successful outlook body includes `lastClose`, `weaker`, `typical`, `stronger`, the three `*Pct` changes, `barCount`, `lookbackStart`, `lookbackEnd`, `lookbackYears`, `realizedCagr`, `impliedCagr`, `dailyMean`, `dailyVol`, `currency`, and `provider`.

## Accounts (Supabase)

Accounts are optional. With no Supabase keys, the app runs guest-only and hides sign-in.

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). This creates the `watchlists` table and its row-level security policies.
3. Copy **Project URL** and the **publishable** (anon) key from *Project Settings → API keys* into `frontend/.env`:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Under *Authentication → URL Configuration*, set the **Site URL** to your deployed origin and add it to **Redirect URLs**, plus `http://localhost:5173` for local work. Password-reset links will not open otherwise.
5. Optional: *Authentication → Providers → Email* controls whether a new signup must confirm by email before it can log in. Leaving it on is the safer default. Turning it off makes signup log the user straight in, which is simpler to demonstrate live.

The built-in email sender is rate-limited and meant for testing. For real reset emails, add your own SMTP under *Authentication → Emails*.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `NGX_PULSE_API_KEY` | `backend/.env` | NGX listings, history, company snapshots, dividends |
| `NGX_QUOTE_TOKEN` | `backend/.env` | Optional bid–ask quotes for NGX sellability |
| `WARM_CACHE` | backend | Set to `0` to skip the prefetch loop |
| `ALLOWED_ORIGINS` | backend | Comma-separated browser origins. Empty when one service hosts the UI and the API |
| `SUPABASE_URL` | backend | Lets the production content-security policy allow the Supabase host |
| `PORT` | backend | API port. Defaults to 4000 |
| `VITE_SUPABASE_URL` | `frontend/.env` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env` | Supabase publishable key |
| `VITE_API_BASE` | frontend build | API prefix when the UI is hosted apart from the API. Defaults to `/api` |

## Deploying

The API serves the built frontend in production, so one service can host both.

```bash
npm run build   # installs both workspaces, then builds the frontend
npm start       # NODE_ENV=production, serves the API and the SPA
```

On Railway, [`railway.json`](railway.json) sets the build and start commands and points the health check at `/api/health`. Set `NODE_ENV=production`, `NGX_PULSE_API_KEY`, and `SUPABASE_URL`. Leave `ALLOWED_ORIGINS` empty for a single service. Set `WARM_CACHE=0` if you do not want the prefetch loop.

To host the frontend separately, set `VITE_API_BASE` to the API’s `/api` URL at build time and list the frontend origin in `ALLOWED_ORIGINS` on the API.

Production enables Helmet, a content-security policy for the built page, compression, a small JSON body limit, and rate limits. NGX routes have a tighter limit than the rest of the API, because Pulse is the scarce provider. The host’s forwarded client IP is trusted so the limiter buckets visitors rather than the proxy.
