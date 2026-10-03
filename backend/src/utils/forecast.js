/** Inverse of the standard normal CDF at 10% / 90%. */
export const Z_10_90 = 1.2815515655446004;

export const OUTLOOK_HORIZONS = [1, 2, 3, 5];

export function parseOutlookYears(value) {
  const years = Number(value);
  return OUTLOOK_HORIZONS.includes(years) ? years : null;
}

export function logReturns(closes) {
  const returns = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    const next = closes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(next) || prev <= 0 || next <= 0) continue;
    returns.push(Math.log(next / prev));
  }
  return returns;
}

export function sampleStats(values) {
  const finite = (values || []).filter(Number.isFinite);
  if (!finite.length) return { mean: null, std: null, n: 0 };
  const n = finite.length;
  const mean = finite.reduce((sum, value) => sum + value, 0) / n;
  if (n < 2) return { mean, std: 0, n };
  const variance = finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, std: Math.sqrt(variance), n };
}

function pctFrom(last, future) {
  if (!Number.isFinite(last) || last === 0 || !Number.isFinite(future)) return null;
  return ((future - last) / last) * 100;
}

function seriesDate(row) {
  const raw = String(row?.date || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/**
 * Lognormal range from this series' own daily log returns.
 * Typical = median path. Weaker / stronger ≈ 10th / 90th percentile.
 */
export function projectOutlook(series, {
  horizonYears,
  periodsPerYear = 252,
  minBars = 252,
} = {}) {
  const years = Number(horizonYears);
  if (!OUTLOOK_HORIZONS.includes(years)) {
    return { ok: false, code: 'INVALID_HORIZON', reason: 'horizonYears must be 1, 2, 3, or 5.' };
  }

  const points = (series || [])
    .map((row) => ({ close: Number(row?.close), date: seriesDate(row) }))
    .filter((row) => Number.isFinite(row.close) && row.close > 0);

  if (points.length < minBars) {
    return {
      ok: false,
      code: 'INSUFFICIENT_HISTORY',
      reason: `Need at least ${minBars} daily closes; this series has ${points.length}.`,
      barCount: points.length,
      lookbackStart: points[0]?.date || null,
      lookbackEnd: points.at(-1)?.date || null,
    };
  }

  const closes = points.map((row) => row.close);
  const last = closes.at(-1);
  const first = closes[0];
  const returns = logReturns(closes);
  const { mean: mu, std: sigma, n: returnCount } = sampleStats(returns);
  if (!Number.isFinite(mu) || returnCount < minBars - 1) {
    return {
      ok: false,
      code: 'INSUFFICIENT_HISTORY',
      reason: 'Not enough valid daily returns to estimate a range.',
      barCount: points.length,
    };
  }

  const vol = Number.isFinite(sigma) ? sigma : 0;
  const T = years * periodsPerYear;
  const median = last * Math.exp(mu * T);
  const band = vol * Math.sqrt(T) * Z_10_90;
  const weaker = last * Math.exp(mu * T - band);
  const stronger = last * Math.exp(mu * T + band);

  const startMs = Date.parse(points[0].date);
  const endMs = Date.parse(points.at(-1).date);
  const lookbackYears = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
    ? (endMs - startMs) / (365.25 * 86400000)
    : points.length / periodsPerYear;
  const realizedCagr = lookbackYears > 0 && first > 0
    ? (last / first) ** (1 / lookbackYears) - 1
    : null;

  return {
    ok: true,
    horizonYears: years,
    lastClose: last,
    weaker,
    typical: median,
    stronger,
    weakerPct: pctFrom(last, weaker),
    typicalPct: pctFrom(last, median),
    strongerPct: pctFrom(last, stronger),
    barCount: points.length,
    returnCount,
    lookbackStart: points[0].date,
    lookbackEnd: points.at(-1).date,
    lookbackYears,
    realizedCagr,
    impliedCagr: Math.exp(mu * periodsPerYear) - 1,
    dailyMean: mu,
    dailyVol: vol,
    periodsPerYear,
  };
}
