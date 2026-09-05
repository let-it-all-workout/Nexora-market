# Project framework — structure, stack, and how the system is built

For design reviews, demos, and authorship discussions. Matches the **live** app (Home, Stocks, Crypto, NGX).

---

## 1. High-level architecture

| Layer | Role |
|--------|------|
| **Frontend** | React SPA: Home, Stocks, Crypto, NGX, shared chart, USD→NGN bar. Talks to `/api`. |
| **Backend** | Node.js + Express: market data, indicator math, Isolation Forest / 3-sigma flags, FX. Serves the built SPA in production. |
| **Identity and user data** | Supabase: managed Auth for signup, login, and password reset; one Postgres table for watchlists, guarded by row-level security. |
| **External data** | Yahoo Finance, CoinGecko, NGX Pulse, FX APIs. Market data is fetched live and cached in memory, never stored. |

Root `package.json` uses **concurrently** so `npm run dev` starts API + Vite together.

---

## 2. Technology choices

### 2.1 Frontend

| Technology | Purpose |
|------------|---------|
| **React 19** | UI, state, effects. |
| **React Router** | `/`, `/stocks`, `/crypto`, `/ngx`. |
| **Vite** | Dev server, bundling, `/api` proxy. |
| **Recharts** | Price/indicator charts. |
| **Plain CSS** (`App.css`) | Layout and themes. |

### 2.2 Backend

| Technology | Purpose |
|------------|---------|
| **Node.js (ESM)** | Runtime. |
| **Express** | HTTP API. |
| **yahoo-finance2**, **axios** | Market fetches. |
| **Vitest** + **supertest** | Indicators, integrity, API smoke tests. |

---

## 3. Repository layout

```
m&s/
├── package.json
├── docs/
├── backend/src/
│   ├── server.js
│   ├── app.js                 # /api/stocks, /crypto, /fx, /ngx
│   ├── routes/
│   ├── services/marketData.js
│   ├── services/news.js
│   └── utils/                 # normalize.js (indicators), anomaly.js (IF + 3-sigma)
└── frontend/src/
    ├── App.jsx                # Nav + ForexBar + routes
    ├── pages/                 # StockPage, CryptoPage, NgxPage
    ├── components/            # MarketChart, ForexBar, …
    └── lib/api.js
```

Removed (do not cite as live): DeFi page, commodities, Analytics/simulation, research assistant, dashboard leftovers.

---

## 4. Product surfaces

1. **Home** — what the app is, Isolation Forest vs 3-sigma copy.
2. **Stocks** — search, chart, indicators, compare, watchlist, unusual-day flags.
3. **Crypto** — same chart; CoinGecko with Yahoo fallback.
4. **NGX** — naira quotes; history when Pulse returns it.
5. **USD→NGN bar** — `GET /api/fx/usd-ngn`, refreshed about every 5 minutes.
6. **Guest or account** — Full charts without signing in. Optional email/password through Supabase Auth, including password reset. Saving a stocks watchlist requires an account.

---

## 5. API sketch

| Area | Example | Responsibility |
|------|---------|----------------|
| Health | `GET /api/health` | Liveness. |
| Stocks | `GET /api/stocks/:symbol` | History + indicators + anomaly flags. |
| Crypto | `GET /api/crypto/:id` | Same, crypto providers. |
| FX | `GET /api/fx/usd-ngn` | USD/NGN rate. |
| NGX | `/api/ngx/...` | Search, quotes, history, news. |

---

## 6. Quality

- Tests: `backend/src/__tests__/` (indicators, normalize, market integrity, health/FX).
- Frontend: ESLint + Vite production build.
- Honesty rule: no fabricated candles.

---

## 7. Run

From repo root: `npm install` then `npm run dev`. API default **4000**; UI Vite (often **5173** or **5174**). Browser uses `/api`.

---

## 8. What to say in a defense

- Split between React client and Express API.
- Indicators and Isolation Forest run **server-side** on the series that was actually returned.
- 3-sigma is the examiner-friendly baseline next to Isolation Forest.
- Extensibility: new market pages can reuse `MarketChart`.

For viva wording see **`VIVA_SCRIPT.md`**. For the removed simulator see **`SIMULATION_AND_MODELING.md`**.
