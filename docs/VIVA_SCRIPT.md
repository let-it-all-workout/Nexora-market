# Viva script (about 4–6 minutes, then questions)

Memorise the first two minutes. Use the rest as answers.

## Opening (about 90 seconds)

This project is an educational **market visualizer**, not a broker and not financial advice.

A user searches a ticker on **Stocks**, **Crypto**, or **NGX**. The backend asks a **named provider** for history. If bars arrive, we plot them. If they do not, the chart stays **empty** — we do not invent candles or a fake confidence percentage.

On that history we compute **SMA 20, EMA 20, RSI 14, MACD, and Bollinger bands** in our Node backend, with unit tests. On Stocks you can **compare two symbols from a common start (0%)** and keep a short **watchlist in the browser**.

Unusual days are marked two ways on the same chart:

- **Gold ring — 3-sigma:** the daily return **or** the volume ratio is more than three standard deviations from this chart’s own mean.
- **Wine fill — Isolation Forest:** four features (return, absolute return, volume versus a 20-day median, high–low over close). We flag the top 5% of anomaly scores, with a score floor of 0.55.

That is **detection**, not a forecast and not a buy or sell signal. Isolation Forest is the machine-learning piece; 3-sigma is the statistical baseline so I can explain both.

A small **USD → NGN** bar under the nav shows a live FX rate for local context.

## What to demo (in order)

1. Home: three markets, Trust Center / data sources.
2. Stocks: search a liquid ticker (e.g. AAPL or MSFT), turn on SMA and RSI, click a gold or wine mark.
3. Compare two stocks from 0%.
4. NGX: click a symbol from a sector; naira chart, company snapshot, and dividend records. Say history and dividends both depend on NGX Pulse.
5. Point at the USD→NGN bar.
6. Optional: a ticker with no history so they see the empty chart.

## Data sources (one sentence each)

- **Stocks:** Yahoo Finance (can be delayed).
- **Crypto:** CoinGecko, Yahoo fallback using the ticker (e.g. ADA-USD), not the CoinGecko id.
- **NGX:** NGX Pulse when an API key is set. A selected NGX stock also shows its listing snapshot and dividend records from the same API (Pulse sources dividends from StockAnalysis). The 12-month dividend total and the yield are added up in our route and labelled as computed; income statements are a paid Pulse tier, so they are left out instead of guessed.
- **FX:** Open ER with a backup feed (`GET /api/fx/usd-ngn`).

## Isolation Forest in one paragraph

Isolation Forest builds random trees that split on a random feature and a random threshold. Outliers tend to be isolated in **few splits**, so their **path is short** and the anomaly score is **high**. We implemented it in `backend/src/utils/anomaly.js` (seeded RNG so tests are repeatable). It does not use labels and it does not output a next-day price.

## 3-sigma in one paragraph

For returns and for volume ratios we compute mean and sample standard deviation on **this series**. A flag means `|x − mean| > 3σ`. It is simple, examinable, and can disagree with Isolation Forest — that disagreement is useful in a viva.

## What this project is not

- Not live trading or order placement.
- Not “the market will go up tomorrow.”
- Not an AI that explains the chart in a chat box (that was removed).
- Not DeFi yields or a commodities board (removed).
- Not a Monte Carlo wealth simulator (removed). If the approved title still says “simulation-based evaluation,” say: evaluation in the submitted software is the **detector comparison** plus the working artifact.

## Likely questions

**Why Nigeria?** NGX workspace in naira plus USD→NGN. Beginners here still need US/crypto charts, so those pages exist too.

**Why empty charts?** Honesty. CoinGecko rate limits and missing NGX history are real. Inventing a line would be academic misconduct in a visualisation project.

**How do you know SMA is correct?** Computed in `normalize.js` and covered by `indicators.test.js`.

**Is Isolation Forest overfitting?** There is no training label and no prediction target. Trees are built on the window you are looking at. Limitation: small windows and parameter choices (trees, sample size, 5% cutoff, 0.55 floor).

**Did you survey Nigerian investors?** No. Any “effect” is **designed / potential**, not measured.

**Watchlist?** Signed-in only, stored in a Supabase Postgres table keyed to the account, max 12, Stocks page. A guest who clicks “Add to watchlist” is asked to sign up. Charts still work without an account.

**How do you teach a first-time user?** A two-minute tour (header **Tour**, or the first-visit card) walks each page in plain language. **Learn** has short lessons and a glossary for the words on the charts. Both say what a thing is *and* what it is not.

**Where do accounts live? Did you write the password handling?** Accounts are managed by **Supabase Auth**, so password hashing, email confirmation, and reset links are handled by a service built for it rather than by us. Our table stores only a user id and a list of ticker symbols. Access is enforced in the database by a **row-level security** policy (`auth.uid() = user_id`), so even a tampered browser client cannot read another user's row. Accounts are optional — every chart works without one.

**Why not roll your own auth?** An earlier version did (scrypt hashes, server-side sessions in a JSON file). It worked, but it had no password reset and no email verification, and a file-backed store loses all accounts whenever the host redeploys the container. Delegating identity removed a class of security and data-durability problems that are not what this project is examining.

**Stack?** React + Vite + Recharts frontend; Express API on port 4000; Vite proxies `/api`. Supabase for identity and the watchlist table. In production the Express service also serves the built frontend, so there is one origin.

**Is it hardened?** The API sets a strict Content-Security-Policy via `helmet` (the one inline script is allowed by SHA-256 hash, not `unsafe-inline`), rate-limits requests per IP with a tighter ceiling on the metered NGX routes, trusts the platform proxy so limits key off the real client IP, and shuts down gracefully on `SIGTERM`.

## Closing line

The contribution is a small, examinable visualizer: named data, tested indicators, and an unusual-day detector you can compare with a 3-sigma rule — without pretending to be a trading system.
