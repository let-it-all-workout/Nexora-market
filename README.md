# Nexora Markets

Price research workspace: plot stock, crypto, and NGX history, overlay tested indicators, compare two tickers, flag unusual days (Isolation Forest vs a 3-sigma rule), and show a USD→NGN rate. Licensed brokers are listed on Learn. Nexora does not execute trades.

## Tech stack

- Frontend: React + Vite + Recharts
- Backend: Node.js + Express
- Accounts and watchlist storage: Supabase (managed Postgres + Auth)
- Data: Yahoo Finance, CoinGecko, NGX Pulse (API key), FX APIs

## Run locally

From this folder:

```bash
npm install
npm run dev
```

UI: Vite (often `http://localhost:5173` or `5174`) · API: `http://localhost:4000` (Vite proxies `/api`).

## What the demo shows

- Search a ticker and load history (empty chart if the provider has none)
- SMA 20, EMA 20, RSI 14, MACD, Bollinger bands — `backend/src/utils/normalize.js` with tests
- Compare two stocks from a common start (0%)
- Stocks watchlist for signed-in accounts only (Supabase). Guests can still read every chart.
- Unusual-day markers: gold 3-sigma vs wine Isolation Forest (`backend/src/utils/anomaly.js`)
- USD→NGN bar (`GET /api/fx/usd-ngn`)

Pages: Home, Stocks, Crypto, NGX. DeFi, commodities, simulation, and the old chart explainer were removed.

## Tests

```bash
cd backend && npm test
```

## Layout

- `frontend/` — React app
- `backend/` — Express API, indicators, anomaly detector, tests
- `docs/VIVA_SCRIPT.md` — short defense script

## Useful API routes

- `GET /api/health`
- `GET /api/stocks/:symbol?range=1y&interval=1d`
- `GET /api/crypto/:id?days=90`
- `GET /api/ngx/history/:symbol?days=90`
- `GET /api/ngx/company/:symbol` — NGX Pulse listing snapshot plus dividend records
- `GET /api/fx/usd-ngn`

Signup, login, password reset, and watchlist storage do not go through this API —
the browser talks to Supabase directly, and Postgres row-level security scopes
every read and write to the signed-in user.

## Accounts (Supabase)

Accounts are optional: with no Supabase keys set, the app runs guest-only and
hides the sign-in controls.

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates the `watchlists` table and its row-level security policies.
3. Copy **Project URL** and the **publishable** (anon) key from
   *Project Settings → API keys* into `frontend/.env`:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Under *Authentication → URL Configuration*, set the **Site URL** to your
   deployed origin and add it to **Redirect URLs**, plus `http://localhost:5173`
   for local work. Password-reset links will not open otherwise.
5. Optional: *Authentication → Providers → Email* controls whether a new signup
   must confirm by email before it can log in. Leaving it on is the safer
   default; turning it off makes signup log the user straight in, which is
   simpler to demonstrate live.

The built-in email sender is rate-limited and meant for testing. For real reset
emails, add your own SMTP under *Authentication → Emails*.

## Deploying

The API serves the built frontend in production, so one service can host both
and there are no cross-origin concerns.

```bash
npm run build   # installs both workspaces, then builds the frontend
npm start       # NODE_ENV=production, serves the API and the SPA
```

On Railway, [`railway.json`](railway.json) already sets the build and start
commands and points the health check at `/api/health`. Set these variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NGX_PULSE_API_KEY` | your NGX Pulse key |
| `SUPABASE_URL` | your project URL, so the CSP allows it |
| `ALLOWED_ORIGINS` | leave empty for a single service |
| `WARM_CACHE` | `0` to stop the background pre-fetch loop |

To host the frontend separately (e.g. Vercel), set `VITE_API_BASE` to the API's
`/api` URL at build time and list the frontend origin in `ALLOWED_ORIGINS` on the
API.
