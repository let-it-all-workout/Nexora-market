import { fetchStockSeriesWithFallback, fetchCryptoSeriesWithFallback, fetchUsdNgnWithFallback, fetchNgxMarketStatus } from './services/marketData.js';

const STOCKS = ['AAPL', 'MSFT', 'GOOG', 'NVDA'];
const STOCK_RANGES = [
  { range: '1d', interval: '5m' },
  { range: '7d', interval: '30m' },
  { range: '1mo', interval: '1h' },
];

const CRYPTOS = ['bitcoin', 'ethereum', 'solana', 'ripple'];
const CRYPTO_DAYS = [1, 7, 30];

async function warmStocks() {
  const jobs = [];
  for (const sym of STOCKS) {
    for (const r of STOCK_RANGES) {
      jobs.push(fetchStockSeriesWithFallback(sym, r.range, r.interval).catch(() => {}));
    }
  }
  await Promise.allSettled(jobs);
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function warmCrypto() {
  for (const coin of CRYPTOS) {
    for (const d of CRYPTO_DAYS) {
      try { await fetchCryptoSeriesWithFallback(coin, d); } catch {}
      await delay(250);
    }
  }
}

async function warmNgx() {
  // One low-frequency request avoids consuming the provider's burst allowance
  // before a user asks for verified quote or history data.
  await fetchNgxMarketStatus().catch(() => {});
}

export async function warmAll() {
  console.log('[warmup] pre-fetching...');
  const start = Date.now();
  await Promise.all([warmStocks(), warmCrypto(), fetchUsdNgnWithFallback().catch(() => {})]);
  console.log(`[warmup] done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

export function startAutoWarm(intervalMs = 180_000) {
  warmAll();
  warmNgx();
  setInterval(() => warmAll(), intervalMs);
  setInterval(() => warmNgx(), 15 * 60_000);
}
