import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SELL_FACTORS_PATH = path.join(HERE, '../../data/ngx-sell-factors.json');
const DISCLOSURE_URL = 'https://ngxpulse.ng/api/ngxdata/disclosures';
const QUOTE_URL = 'https://marketdataapiv3.ngxgroup.com/v3/api/quote/stockquotes.json';
const WINDOW_MS = 540 * 24 * 60 * 60 * 1000;
const ADMISSION_METHODS = new Set(['introduction', 'ipo', 'scheme', 'merger']);

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function textOf(row = {}) {
  return [
    row.title, row.headline, row.subject, row.summary, row.description, row.body, row.content,
  ].filter(Boolean).join(' ');
}

function dateOf(row = {}) {
  const raw = row.published_at || row.publishedAt || row.date || row.created || row.modified || row.created_at || row.createdAt || '';
  const match = String(raw).match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const time = Date.parse(match[0]);
  return Number.isFinite(time) ? time : null;
}

function symbolOf(row = {}) {
  const raw = row.symbol || row.ticker || row.stock_symbol || '';
  const symbol = String(raw).trim().toUpperCase();
  return /^[A-Z0-9.-]{2,15}$/.test(symbol) ? symbol : '';
}

export function classifyNotice(text) {
  const body = String(text || '');
  const lower = body.toLowerCase();
  if (!lower.trim()) return null;
  if (/suspension (has been |was )?lifted|lifting of (the )?suspension|resumption of trading/.test(lower)) {
    return 'lift';
  }
  if (/delist/.test(lower)) return 'delisted';
  if (/suspension of trading|suspended from trading|full suspension|trading (has been|was|is) suspended|was suspended|shares have been suspended/.test(lower)) {
    return 'suspended';
  }
  if (/rights issue|bonus issue|scrip issue|share reconstruction|capital reconstruction|scheme of arrangement|share consolidation|subdivision of shares|stock split/.test(lower)) {
    return 'action';
  }
  return null;
}

function nameKey(name) {
  return String(name || '')
    .toUpperCase()
    .replace(/\b(PLC|LIMITED|COMPANY|HOLDINGS|INC|CORP)\b/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function symbolsForNotice(notice, stocks) {
  const found = new Set();
  if (notice.symbol) found.add(notice.symbol);
  const upper = ` ${String(notice.text || '').toUpperCase()} `;
  for (const stock of stocks) {
    const symbol = String(stock.symbol || '').toUpperCase();
    if (symbol.length >= 4 && new RegExp(`\\b${symbol}\\b`).test(upper)) found.add(symbol);
    const key = nameKey(stock.name);
    if (key.length >= 12 && upper.includes(key)) found.add(symbol);
  }
  return [...found];
}

export function noticesFromDisclosures(rows) {
  const cutoff = Date.now() - WINDOW_MS;
  return (rows || []).map((row) => {
    const text = textOf(row);
    const kind = classifyNotice(text);
    const at = dateOf(row);
    if (!kind || at == null || at < cutoff) return null;
    return { kind, at, symbol: symbolOf(row), text, title: String(row.title || row.headline || text).slice(0, 180) };
  }).filter(Boolean).sort((a, b) => a.at - b.at);
}

export function readLocalSellFactors(filePath = SELL_FACTORS_PATH) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      loaded: true,
      floats: parsed.floats || {},
      listing: parsed.listing || {},
      actions: parsed.actions || {},
      admission: parsed.admission || {},
    };
  } catch {
    return { loaded: false, floats: {}, listing: {}, actions: {}, admission: {} };
  }
}

function quoteRows(payload) {
  const body = payload?.data ?? payload?.quotes ?? payload?.result ?? payload;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.quotes)) return body.quotes;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export function quotesBySymbol(payload) {
  const map = new Map();
  for (const row of quoteRows(payload)) {
    const symbol = symbolOf(row);
    const bid = num(row.bid ?? row.Bid ?? row.bidPrice ?? row.bestBid ?? row.best_bid);
    const ask = num(row.ask ?? row.Ask ?? row.askPrice ?? row.offer ?? row.bestAsk ?? row.best_ask);
    if (!symbol || !(bid > 0) || !(ask > 0)) continue;
    map.set(symbol, { bid, ask });
  }
  return map;
}

export function admissionFields(row) {
  const method = String(row?.method || '').toLowerCase();
  if (!ADMISSION_METHODS.has(method)) {
    return { listing_method: null, listing_method_as_of: null, listing_method_source: null };
  }
  return {
    listing_method: method,
    listing_method_as_of: row.asOf || null,
    listing_method_source: row.source || null,
  };
}

export function applySellFactors(stocks, { local, notices, quotes } = {}) {
  const floats = local?.floats || {};
  const listing = local?.listing || {};
  const actions = local?.actions || {};
  const admission = local?.admission || {};
  const quoteMap = quotes instanceof Map ? quotes : quotesBySymbol(quotes);
  const folded = new Map();

  for (const notice of notices || []) {
    for (const symbol of symbolsForNotice(notice, stocks)) {
      const current = folded.get(symbol) || {};
      if (notice.kind === 'lift') {
        current.listing_status = null;
        current.listing_source = null;
      } else if (notice.kind === 'suspended' || notice.kind === 'delisted') {
        current.listing_status = notice.kind === 'delisted' ? 'delisted' : 'suspended';
        current.listing_source = notice.title;
      } else if (notice.kind === 'action') {
        current.corporate_action = true;
        current.corporate_action_note = notice.title;
        current.corporate_action_source = 'ngx-pulse-disclosures';
      }
      folded.set(symbol, current);
    }
  }

  return (stocks || []).map((stock) => {
    const symbol = String(stock.symbol || '').toUpperCase();
    const extra = { ...(folded.get(symbol) || {}) };
    const listed = listing[symbol];
    if (listed?.status) {
      const status = String(listed.status).toLowerCase();
      if (status === 'active' || status === 'lifted') {
        extra.listing_status = null;
      } else if (status === 'suspended' || status === 'halted' || status === 'delisted') {
        extra.listing_status = status === 'halted' ? 'suspended' : status;
        extra.listing_source = listed.source || 'local file';
      }
    }
    const action = actions[symbol];
    if (action?.summary) {
      extra.corporate_action = true;
      extra.corporate_action_note = String(action.summary);
      extra.corporate_action_source = action.source || 'local file';
    }
    const floatRow = floats[symbol];
    const floatShares = num(floatRow?.floatShares ?? floatRow?.float_shares);
    const quote = quoteMap.get(symbol);
    return {
      ...stock,
      ...extra,
      ...admissionFields(admission[symbol]),
      float_shares: floatShares,
      float_source: floatShares != null ? (floatRow.source || 'local file') : null,
      float_as_of: floatRow?.asOf || null,
      bid: quote?.bid ?? num(stock.bid),
      ask: quote?.ask ?? num(stock.ask),
    };
  });
}

async function fetchDisclosures() {
  const key = process.env.NGX_PULSE_API_KEY || '';
  if (!key) return { rows: [], status: 'not_configured' };
  try {
    const { data } = await axios.get(DISCLOSURE_URL, {
      timeout: 20000,
      headers: { 'X-API-Key': key },
    });
    const body = data?.data ?? data?.disclosures ?? data;
    const rows = Array.isArray(body) ? body : Array.isArray(body?.disclosures) ? body.disclosures : [];
    return { rows, status: 'ok' };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 402 || status === 403) return { rows: [], status: 'plan_limited' };
    return { rows: [], status: 'unavailable' };
  }
}

async function fetchQuotes() {
  const token = process.env.NGX_QUOTE_TOKEN || '';
  if (!token) return { payload: null, status: 'not_configured' };
  try {
    const { data } = await axios.get(QUOTE_URL, {
      timeout: 20000,
      params: { _t: token },
    });
    return { payload: data, status: 'ok' };
  } catch {
    return { payload: null, status: 'unavailable' };
  }
}

export async function attachSellFactors(stocks) {
  const local = readLocalSellFactors();
  const [disclosures, quotes] = await Promise.all([
    fetchDisclosures(),
    fetchQuotes(),
  ]);
  return {
    stocks: applySellFactors(stocks, {
      local,
      notices: noticesFromDisclosures(disclosures.rows),
      quotes: quotes.payload,
    }),
    sellFactors: {
      disclosures: disclosures.status,
      quotes: quotes.status,
      localFile: local.loaded,
    },
  };
}
