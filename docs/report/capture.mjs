// Captures Appendix B screens from the running dev app (npm run dev).
// Usage: node docs/report/capture.mjs [baseUrl]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer');

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'figures');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function prep(page, { theme = 'light', guideSeen = true } = {}) {
  await page.evaluateOnNewDocument((t, g) => {
    localStorage.setItem('nexora-theme', t);
    if (g) localStorage.setItem('nexora-guide-seen', '1');
    sessionStorage.setItem('nexora-intro-seen', '1');
  }, theme, guideSeen);
}

async function open(page, route, wait = 7000) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(wait);
}

async function clickText(page, text, selector = 'button') {
  const ok = await page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((n) => n.textContent.trim().includes(t));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, text, selector);
  if (!ok) console.warn(`  could not find "${text}"`);
  await sleep(2500);
  return ok;
}

async function scrollToHeading(page, text, offset = 90) {
  await page.evaluate((t, off) => {
    const el = [...document.querySelectorAll('h1,h2,h3')].find((n) => n.textContent.trim().startsWith(t));
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
  }, text, offset);
  await sleep(1500);
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
  console.log('saved', name);
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1366, height: 860, deviceScaleFactor: 1.5 },
});

const jobs = [
  ['b01_home', async (p) => { await open(p, '/'); }],
  ['b02_tour', async (p) => { await open(p, '/'); await clickText(p, 'Take a tour'); }, { guideSeen: true }],
  ['b03a_stocks_top', async (p) => { await open(p, '/stocks', 10000); await p.evaluate(() => window.scrollTo(0, 0)); await sleep(800); }],
  ['b03_stock_aapl', async (p) => { await open(p, '/stocks?symbol=AAPL', 10000); await scrollToHeading(p, 'Stock: AAPL'); }],
  ['b03b_stock_aapl_summary', async (p) => { await open(p, '/stocks?symbol=AAPL', 10000); await scrollToHeading(p, 'AAPL', 20); }],
  ['b04_crypto_btc', async (p) => { await open(p, '/crypto?id=bitcoin', 10000); await scrollToHeading(p, 'Crypto: bitcoin'); }],
  ['b04b_crypto_condition', async (p) => { await open(p, '/crypto', 10000); await scrollToHeading(p, 'Market condition'); }],
  ['b05_ngx_board', async (p) => { await open(p, '/ngx', 10000); }],
  ['b06_ngx_dangcem', async (p) => { await open(p, '/ngx?symbol=DANGCEM', 12000); await scrollToHeading(p, 'Top Movers'); }],
  ['b07_ngx_liquidity', async (p) => { await open(p, '/ngx', 10000); await clickText(p, 'Liquidity'); await sleep(5000); }],
  ['b08_forecast_1y', async (p) => { await open(p, '/forecast?market=stocks&symbol=AAPL&years=1', 12000); }],
  ['b09_forecast_3y', async (p) => { await open(p, '/forecast?market=stocks&symbol=AAPL&years=3', 12000); }],
  ['b10_learn', async (p) => { await open(p, '/learn'); }],
  ['b10b_learn_lesson', async (p) => {
    await open(p, '/learn');
    await clickText(p, 'earnings report');
  }],
  ['b11_login', async (p) => { await open(p, '/'); await clickText(p, 'Log in'); }],
  ['b13_dark', async (p) => { await open(p, '/forecast?market=stocks&symbol=AAPL&years=1', 12000); }, { theme: 'dark' }],
];

const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [name, run, cfg = {}] of jobs) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage();
  await prep(page, cfg);
  try {
    await run(page);
    await shot(page, name);
  } catch (err) {
    console.warn('failed', name, err.message);
  }
  await page.close();
}

if (!only || only.includes('b14_mobile')) {
  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await prep(mobile);
  await open(mobile, '/learn', 8000);
  await shot(mobile, 'b14_mobile');
}

await browser.close();
