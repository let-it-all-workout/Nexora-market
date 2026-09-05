export function pickNum(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function sessionChange(stock) {
  const provided = pickNum(stock?.change_percent, stock?.changePercent, stock?.changePct);
  if (provided != null) return provided;
  const price = pickNum(stock?.current_price, stock?.price, stock?.close);
  const prev = pickNum(stock?.previous_close, stock?.prevClose, stock?.previousClose);
  if (price != null && prev != null && prev !== 0) return ((price - prev) / prev) * 100;
  return null;
}

export function weekChange(stock) {
  return pickNum(
    stock?.pct_change_7d,
    stock?.change_percent_7d,
    stock?.pctChange7d,
    stock?.week_change,
    stock?.weekChange,
  );
}

/** Horizon-specific listed move. Never substitutes session % for a 7-day figure. */
export function listedMove(stock, horizon = '1d') {
  if (horizon === '7d') return weekChange(stock);
  return sessionChange(stock);
}

export function seriesReturn(series, valueKey = 'close') {
  const points = (series || [])
    .map((row) => pickNum(row?.[valueKey], row?.close, row?.value, row?.marketIndex))
    .filter((n) => n != null);
  if (points.length < 2 || points[0] === 0) return null;
  return ((points.at(-1) - points[0]) / points[0]) * 100;
}

export function firstLastPct(series) {
  return seriesReturn(series, 'close');
}

export function breadthFromChanges(changes) {
  const finite = (changes || []).filter(Number.isFinite);
  return {
    advances: finite.filter((change) => change > 0).length,
    declines: finite.filter((change) => change < 0).length,
    unchanged: finite.filter((change) => change === 0).length,
    sampleSize: finite.length,
    avg: finite.length ? finite.reduce((sum, change) => sum + change, 0) / finite.length : null,
  };
}

export function conditionFromAvg(avg, options = {}) {
  const {
    bullThreshold = 1,
    bearThreshold = -1,
    advances,
    declines,
    requireBreadth = false,
  } = options;
  if (!Number.isFinite(avg)) return 'Neutral';
  const bullish = avg > bullThreshold && (!requireBreadth || advances >= declines);
  const bearish = avg < bearThreshold && (!requireBreadth || declines >= advances);
  if (bullish) return 'Bullish';
  if (bearish) return 'Bearish';
  return 'Neutral';
}

export function rebaseAverageSeries(items) {
  const map = new Map();
  (items || []).forEach((item) => {
    const base = item.series?.[0]?.close;
    if (!Number.isFinite(base) || base === 0) return;
    item.series.forEach((point) => {
      if (!Number.isFinite(point?.close) || !point.date) return;
      if (!map.has(point.date)) map.set(point.date, { date: point.date, values: [] });
      map.get(point.date).values.push((point.close / base) * 100);
    });
  });
  return [...map.values()]
    .filter((row) => row.values.length)
    .map((row) => ({
      date: row.date,
      marketIndex: row.values.reduce((sum, value) => sum + value, 0) / row.values.length,
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
