import { detectAnomalies } from './anomaly.js';

export function normalizeStockSeries(raw, symbol) {
  const result = raw?.chart?.result?.[0];
  if (!result) return { asset: symbol, currency: 'USD', series: [] };
  const currency = result?.meta?.currency || 'USD';

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const close = quote.close || [];
  const open = quote.open || [];
  const high = quote.high || [];
  const low = quote.low || [];
  const volume = quote.volume || [];
  const intraday = timestamps.some((ts, index) => (
    index > 0 && ts - timestamps[index - 1] < 20 * 60 * 60
  ));

  const series = timestamps
    .map((ts, idx) => ({
      timestamp: ts * 1000,
      date: intraday
        ? new Date(ts * 1000).toISOString()
        : new Date(ts * 1000).toISOString().slice(0, 10),
      open: open[idx] ?? null,
      high: high[idx] ?? null,
      low: low[idx] ?? null,
      close: close[idx] ?? null,
      volume: volume[idx] ?? 0,
    }))
    .filter((row) => row.close !== null);

  return { asset: symbol, currency, series };
}

export function normalizeCryptoSeries(raw, id) {
  const prices = raw?.prices || [];
  const volumes = raw?.total_volumes || [];
  const intraday = prices.some((point, index) => (
    index > 0 && point[0] - prices[index - 1][0] < 20 * 60 * 60 * 1000
  ));
  const series = prices.map((point, idx) => ({
    timestamp: point[0],
    date: intraday
      ? new Date(point[0]).toISOString()
      : new Date(point[0]).toISOString().slice(0, 10),
    close: point[1],
    volume: volumes[idx]?.[1] ?? 0,
  }));

  return { asset: id, currency: 'USD', series };
}

function windowMean(values, endIndex, window) {
  if (endIndex + 1 < window) return null;
  let sum = 0;
  for (let i = endIndex - window + 1; i <= endIndex; i += 1) {
    const value = values[i];
    if (!Number.isFinite(value)) return null;
    sum += value;
  }
  return sum / window;
}

function windowStd(values, endIndex, window) {
  const avg = windowMean(values, endIndex, window);
  if (avg == null) return null;
  let sumSq = 0;
  for (let i = endIndex - window + 1; i <= endIndex; i += 1) {
    sumSq += (values[i] - avg) ** 2;
  }
  return Math.sqrt(sumSq / (window - 1));
}

export function smaSeries(closes, window) {
  return closes.map((_, index) => windowMean(closes, index, window));
}

export function emaSeries(closes, window) {
  const k = 2 / (window + 1);
  const out = [];
  let prev = null;
  for (let i = 0; i < closes.length; i += 1) {
    const close = closes[i];
    if (!Number.isFinite(close)) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      if (i + 1 < window) {
        out.push(null);
        continue;
      }
      const seed = windowMean(closes, i, window);
      prev = seed;
      out.push(seed);
    } else {
      prev = close * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

/** Wilder RSI. Null until `window` closes exist. */
export function rsiSeries(closes, window = 14) {
  const out = closes.map(() => null);
  if (closes.length <= window) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= window; i += 1) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  gain /= window;
  loss /= window;
  out[window] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  for (let i = window + 1; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    const stepGain = delta > 0 ? delta : 0;
    const stepLoss = delta < 0 ? -delta : 0;
    gain = (gain * (window - 1) + stepGain) / window;
    loss = (loss * (window - 1) + stepLoss) / window;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macdSeries(closes, fast = 12, slow = 26, signal = 9) {
  const fastEma = emaSeries(closes, fast);
  const slowEma = emaSeries(closes, slow);
  const macdLine = closes.map((_, i) => (
    Number.isFinite(fastEma[i]) && Number.isFinite(slowEma[i]) ? fastEma[i] - slowEma[i] : null
  ));
  const signalLine = emaSeries(macdLine.map((value) => (Number.isFinite(value) ? value : NaN)), signal);
  const hist = macdLine.map((value, i) => (
    Number.isFinite(value) && Number.isFinite(signalLine[i]) ? value - signalLine[i] : null
  ));
  return { macd: macdLine, signal: signalLine, hist };
}

export function bollingerSeries(closes, window = 20, numStd = 2) {
  const middle = smaSeries(closes, window);
  const upper = [];
  const lower = [];
  for (let i = 0; i < closes.length; i += 1) {
    const std = windowStd(closes, i, window);
    if (middle[i] == null || std == null) {
      upper.push(null);
      lower.push(null);
    } else {
      upper.push(middle[i] + numStd * std);
      lower.push(middle[i] - numStd * std);
    }
  }
  return { middle, upper, lower };
}

export function enrichIndicators(series) {
  const closes = (series || []).map((row) => row.close);
  const sma7 = smaSeries(closes, 7);
  const sma20 = smaSeries(closes, 20);
  const ema20 = emaSeries(closes, 20);
  const rsi14 = rsiSeries(closes, 14);
  const macd = macdSeries(closes);
  const bands = bollingerSeries(closes, 20, 2);
  const anomalies = detectAnomalies(series || []);

  return (series || []).map((row, i) => ({
    ...row,
    ma7: sma7[i],
    sma20: sma20[i],
    ema20: ema20[i],
    rsi14: rsi14[i],
    macd: macd.macd[i],
    macd_signal: macd.signal[i],
    macd_hist: macd.hist[i],
    bb_middle: bands.middle[i],
    bb_upper: bands.upper[i],
    bb_lower: bands.lower[i],
    ...anomalies[i],
  }));
}

/** Yahoo Finance search news — time may be a Date, Unix seconds, Unix ms, or an ISO string */
export function yahooNewsPublishTimeIso(providerPublishTime) {
  if (providerPublishTime == null || providerPublishTime === '') return null;
  if (providerPublishTime instanceof Date) {
    const t = providerPublishTime.getTime();
    return Number.isNaN(t) ? null : providerPublishTime.toISOString();
  }
  if (typeof providerPublishTime === 'number' && Number.isFinite(providerPublishTime)) {
    const ms = providerPublishTime >= 1e12 ? providerPublishTime : providerPublishTime * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(providerPublishTime);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
